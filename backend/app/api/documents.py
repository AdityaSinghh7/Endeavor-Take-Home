from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import Document, PurchaseOrder, LineItem
from fastapi import status
from typing import List
from datetime import datetime
import os
from ..deps import get_db
import requests

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = "dummy_data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/upload", status_code=status.HTTP_201_CREATED)
def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    print("[UPLOAD] Called upload_document endpoint")
    print(f"[UPLOAD] Received file: {file.filename}")
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_location, "wb+") as f:
        f.write(file.file.read())
    document = Document(filename=file.filename, upload_time=datetime.utcnow())
    db.add(document)
    db.commit()
    db.refresh(document)

    # Send file to extraction API
    extraction_url = "https://plankton-app-qajlk.ondigitalocean.app/extraction_api"
    try:
        with open(file_location, "rb") as f:
            files = {"file": (file.filename, f, file.content_type)}
            response = requests.post(extraction_url, files=files)
            print(f"[UPLOAD] Extraction API status: {response.status_code}")
            print(f"[UPLOAD] Extraction API response: {response.text[:500]}")
            response.raise_for_status()
            extraction_result = response.json()
    except Exception as e:
        print(f"[UPLOAD] Exception: {e}")
        raise HTTPException(status_code=502, detail=f"Extraction API error: {str(e)}")

    print(f"[UPLOAD] Returning extracted line items for document_id={document.id}")
    return {
        "message": "File uploaded successfully",
        "document_id": document.id,
        "extracted_line_items": extraction_result
    }

@router.get("/", response_model=List[dict])
def list_documents(db: Session = Depends(get_db)):
    documents = db.query(Document).all()
    return [{"id": d.id, "filename": d.filename, "upload_time": d.upload_time} for d in documents]

@router.get("/{document_id}/line_items", response_model=List[dict])
def get_line_items_for_document(document_id: int, db: Session = Depends(get_db)):
    items = db.query(LineItem).filter(LineItem.document_id == document_id).all()
    return [
        {
            "id": item.id,
            "description": item.description,
            "quantity": item.quantity,
            "uom": getattr(item, "uom", None),
            "price": getattr(item, "price", None),
            # Add other fields as needed
        }
        for item in items
    ]

@router.post("/{document_id}/line_items", response_model=List[dict])
def save_line_items_for_document(document_id: int, items: list = Body(...), db: Session = Depends(get_db)):
    # Delete existing line items for this document
    db.query(LineItem).filter(LineItem.document_id == document_id).delete()
    # Add new line items
    saved = []
    for item in items:
        li = LineItem(
            document_id=document_id,
            description=item.get("description", ""),
            quantity=item.get("quantity"),
            uom=item.get("uom"),
            price=item.get("price"),
        )
        db.add(li)
        db.flush()  # get id
        saved.append({
            "id": li.id,
            "description": li.description,
            "quantity": li.quantity,
            "uom": li.uom,
            "price": li.price,
        })
    db.commit()
    return saved

# Extraction API error response example:
# {
#   "detail": [
#     {
#       "loc": ["string", 0],
#       "msg": "string",
#       "type": "string"
#     }
#   ]
# }

# Extraction API successful response example:
# [
#   {
#     // ... fields for each extracted line item ...
#   },
#   // ... more line item objects ...
# ]

# BatchMatchRequest schema example:
# {
#   "queries": ["string", ...]  # array of strings (required)
# }
#
# BatchMatchResponse schema example:
# {
#   "results": {
#     "<query_string>": [
#       {"match": "string", "score": number},
#       ...
#     ],
#     ...
#   }
# }

# --- PurchaseOrder Endpoints ---
from fastapi import APIRouter as FastAPIRouter
po_router = FastAPIRouter(prefix="/purchase_orders", tags=["purchase_orders"])

@po_router.get("/", response_model=List[dict])
def list_purchase_orders(db: Session = Depends(get_db)):
    orders = db.query(PurchaseOrder).all()
    return [
        {
            "id": o.id,
            "progress": o.progress,
            "date": o.date,
            "document_id": o.document_id,
            "document_filename": o.document.filename if o.document else None
        }
        for o in orders
    ]

@po_router.get("/{order_id}", response_model=dict)
def get_purchase_order(order_id: int, db: Session = Depends(get_db)):
    o = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return {
        "id": o.id,
        "progress": o.progress,
        "date": o.date,
        "document_id": o.document_id,
        "document_filename": o.document.filename if o.document else None
    }

@po_router.post("/", status_code=201)
def create_purchase_order(
    data: dict = Body(...),
    db: Session = Depends(get_db)
):
    # Convert date string to Python date object
    date_val = data.get("date")
    if isinstance(date_val, str):
        date_val = datetime.strptime(date_val, "%Y-%m-%d").date()
    po = PurchaseOrder(
        progress=data.get("progress", "processing"),
        date=date_val,
        document_id=data.get("document_id"),
    )
    db.add(po)
    db.commit()
    db.refresh(po)
    return {
        "id": po.id,
        "progress": po.progress,
        "date": po.date,
        "document_id": po.document_id,
    }

@po_router.get("/next_id", response_model=int)
def get_next_purchase_order_id(db: Session = Depends(get_db)):
    max_id = db.query(PurchaseOrder.id).order_by(PurchaseOrder.id.desc()).first()
    return (max_id[0] + 1) if max_id else 1

@po_router.delete("/{order_id}", status_code=204)
def delete_purchase_order(order_id: int, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    # Delete line items
    if po.document_id:
        db.query(LineItem).filter(LineItem.document_id == po.document_id).delete()
        # Delete document
        db.query(Document).filter(Document.id == po.document_id).delete()
    db.delete(po)
    db.commit()
    return 