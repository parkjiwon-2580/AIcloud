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