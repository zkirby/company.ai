import asyncpg
import asyncio
from app.config import DATABASE_URL, engine

async def test_connection():
    conn = await asyncpg.connect(DATABASE_URL)
    print("Connected successfully!")
    await conn.close()

asyncio.run(test_connection())
