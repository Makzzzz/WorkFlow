import os
import re
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.ext.asyncio import AsyncAttrs, create_async_engine, async_sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = re.sub(r'^postgresql:', 'postgresql+psycopg:', os.getenv('DATABASE_URL'))

engine = create_async_engine(DATABASE_URL, echo=False)  # echo=True только для отладки SQL-запросов

async_session_maker = async_sessionmaker(engine, expire_on_commit=False)

async def get_db_session():
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

class Base(AsyncAttrs, DeclarativeBase):
    __abstract__ = True

    id : Mapped[int] = mapped_column(primary_key=True, autoincrement=True)