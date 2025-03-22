from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from config import DATABASE_URL
import contextlib

# Configure the engine with a larger pool size and recycling parameters
engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    pool_size=20,           # Increase from default 5
    max_overflow=20,        # Increase from default 10
    pool_timeout=60,        # Increase timeout period
    pool_recycle=3600,      # Recycle connections after 1 hour
    pool_pre_ping=True      # Verify connections before using them
)

SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

# Using a context manager to ensure connections are properly closed
@contextlib.asynccontextmanager
async def get_db_context():
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

