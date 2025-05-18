from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import Matching, LineItem, Product
from typing import List
import csv
import io
from ..deps import get_db
import requests

router = APIRouter(prefix="/matchings", tags=["matchings"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", status_code=201)
def store_matching(matching: dict, db: Session = Depends(get_db)):
    # Assume matching dict contains line_item_id, product_id, user_confirmed, user_adjusted_fields
    m = Matching(**matching)
    db.add(m)
    db.commit()
    db.refresh(m)
    return {"message": "Matching stored", "matching_id": m.id}

@router.get("/", response_model=List[dict])
def get_matchings(db: Session = Depends(get_db)):
    matchings = db.query(Matching).all()
    return [{"id": m.id, "line_item_id": m.line_item_id, "product_id": m.product_id, "user_confirmed": m.user_confirmed, "matched_at": m.matched_at, "user_adjusted_fields": m.user_adjusted_fields} for m in matchings]

@router.get("/download_csv")
def download_matchings_csv(db: Session = Depends(get_db)):
    matchings = db.query(Matching).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "line_item_id", "product_id", "user_confirmed", "matched_at", "user_adjusted_fields"])
    for m in matchings:
        writer.writerow([m.id, m.line_item_id, m.product_id, m.user_confirmed, m.matched_at, m.user_adjusted_fields])
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=matchings.csv"
    return response

@router.post("/external-batch-match")
def external_batch_match(queries: list):
    """
    Accepts a list of query strings, sends them to the external batch matching API, and returns the results.
    """
    url = "https://endeavor-interview-api-gzwki.ondigitalocean.app/match/batch"
    payload = {"queries": queries}
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Matching API error: {str(e)}") 