from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from .deps import get_db, get_password_hash, verify_password, get_current_user
from sqlalchemy.orm import Session
from .database import init_db
from .models import User
import secrets
from .api import documents_router, products_router, matchings_router

app = FastAPI()

@app.on_event("startup")
def on_startup():
    init_db()

@app.post("/register")
def register(username: str, email: str, password: str, db: Session = Depends(get_db)):
    if db.query(User).filter((User.username == username) | (User.email == email)).first():
        raise HTTPException(status_code=400, detail="Username or email already registered")
    user = User(username=username, email=email, password_hash=get_password_hash(password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User registered successfully"}

@app.post("/login")
def login(credentials: HTTPBasicCredentials = Depends(get_db), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == credentials.username).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return {"message": "Login successful", "username": user.username, "email": user.email}

@app.get("/")
def read_root():
    return {"message": "Endeavor FDE Takehome API is running."}

app.include_router(documents_router, dependencies=[Depends(get_current_user)])
app.include_router(products_router, dependencies=[Depends(get_current_user)])
app.include_router(matchings_router, dependencies=[Depends(get_current_user)]) 