from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import Product
from typing import List
from ..deps import get_current_user, get_db

router = APIRouter(prefix="/products", tags=["products"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[dict])
def get_products(db: Session = Depends(get_db), user = Depends(get_current_user)):
    products = db.query(Product).all()
    return [{"id": p.id, "name": p.name, "sku": p.sku, "description": p.description} for p in products]  