from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import Document
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