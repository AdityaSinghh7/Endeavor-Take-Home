from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, JSON, Date, Float
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime, date

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    documents = relationship('Document', back_populates='user')
    matchings = relationship('Matching', back_populates='user')

class Document(Base):
    __tablename__ = 'documents'
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    upload_time = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey('users.id'))
    user = relationship('User', back_populates='documents')
    line_items = relationship('LineItem', back_populates='document')
    purchase_order = relationship('PurchaseOrder', back_populates='document', uselist=False)

class LineItem(Base):
    __tablename__ = 'line_items'
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey('documents.id'))
    description = Column(Text, nullable=False)
    quantity = Column(Integer)
    uom = Column(String)
    price = Column(Float)
    document = relationship('Document', back_populates='line_items')
    matchings = relationship('Matching', back_populates='line_item')

class Product(Base):
    __tablename__ = 'products'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    sku = Column(String)
    description = Column(Text)
    # Add other relevant fields as needed
    matchings = relationship('Matching', back_populates='product')

class Matching(Base):
    __tablename__ = 'matchings'
    id = Column(Integer, primary_key=True, index=True)
    line_item_id = Column(Integer, ForeignKey('line_items.id'))
    product_id = Column(Integer, ForeignKey('products.id'))
    user_id = Column(Integer, ForeignKey('users.id'))
    user_confirmed = Column(Boolean, default=False)
    matched_at = Column(DateTime, default=datetime.utcnow)
    user_adjusted_fields = Column(JSON, nullable=True)
    line_item = relationship('LineItem', back_populates='matchings')
    product = relationship('Product', back_populates='matchings')
    user = relationship('User', back_populates='matchings')

class PurchaseOrder(Base):
    __tablename__ = 'purchase_orders'
    id = Column(Integer, primary_key=True, index=True)  # Request ID
    progress = Column(String, nullable=False, default='processing')  # processing, review, finalized, failed
    date = Column(Date, default=date.today)
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False)
    document = relationship('Document', back_populates='purchase_order') 