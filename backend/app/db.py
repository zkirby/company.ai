from sqlalchemy.ext.asyncio import AsyncSession 
from sqlalchemy.orm import sessionmaker
from app.config import DATABASE_URL
from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with SessionLocal() as session:
        yield session