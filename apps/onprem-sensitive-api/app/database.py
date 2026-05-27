<<<<<<< HEAD
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import declarative_base

DATABASE_URL = (
    "postgresql://postgres:1234@localhost:5433/postgres"
)

engine = create_engine(
    DATABASE_URL
)

SessionLocal = sessionmaker(
    bind=engine
)

Base = declarative_base()
=======
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


DATABASE_URL = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    # Local-only fallback keeps the API importable for development and compile checks.
    # Production must provide DATABASE_URL through runtime secrets/config.
    DATABASE_URL = "sqlite:///:memory:"


engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
>>>>>>> f0087804447545af148c4103bb4b34db1b426fdf
