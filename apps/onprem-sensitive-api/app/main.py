from datetime import date
from typing import Any
from uuid import UUID, uuid4

from app.routers.analyze_router import (
    router as analyze_router
)

from fastapi import Depends, FastAPI, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app.models import SensitiveChild, SensitiveConsultation, SensitiveProfile
from app.security import encrypt_json


with engine.begin() as connection:
    if engine.dialect.name == "postgresql":
        connection.execute(text("CREATE SCHEMA IF NOT EXISTS ai_care"))
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS ai_care.ai_results (
                    consultation_id UUID PRIMARY KEY,
                    result_json JSONB NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                )
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS ai_care.consultation_assets (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    consultation_id UUID NOT NULL,
                    asset_type VARCHAR(50) NOT NULL,
                    s3_bucket VARCHAR(255) NOT NULL,
                    s3_key TEXT NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                )
                """
            )
        )
    elif engine.dialect.name == "sqlite":
        connection.exec_driver_sql("ATTACH DATABASE ':memory:' AS ai_care")

Base.metadata.create_all(bind=engine)

if engine.dialect.name == "postgresql":
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                ALTER TABLE ai_care.sensitive_children
                ADD COLUMN IF NOT EXISTS child_gender VARCHAR(20)
                """
            )
        )

app = FastAPI(title="Ai클라우드 onprem-sensitive-api")


class ProfileRequest(BaseModel):
    cloud_user_id: UUID


class ChildRequest(BaseModel):
    cloud_user_id: UUID
    name: str
    birth_date: str
    gender: str
    detail_json: dict[str, Any] | None = None


class ChildPatchRequest(BaseModel):
    name: str | None = None
    birth_date: str | None = None
    gender: str | None = None
    detail_json: dict[str, Any] | None = None


class ConsultationRequest(BaseModel):
    consultation_id: UUID
    cloud_user_id: UUID
    raw_payload: dict[str, Any]


def get_or_create_profile(db: Session, cloud_user_id: UUID) -> SensitiveProfile:
    existing = (
        db.query(SensitiveProfile)
        .filter(SensitiveProfile.cloud_user_id == cloud_user_id)
        .first()
    )
    if existing:
        return existing

    profile = SensitiveProfile(id=uuid4(), cloud_user_id=cloud_user_id)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def parse_birth_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="birth_date must be YYYY-MM-DD") from exc


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/db-health")
def db_health(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.post("/internal/sensitive/profile")
def create_profile(request: ProfileRequest, db: Session = Depends(get_db)):
    profile = get_or_create_profile(db, request.cloud_user_id)
    return {"sensitive_profile_id": profile.id}


@app.post("/internal/sensitive/children")
def create_child(request: ChildRequest, db: Session = Depends(get_db)):
    profile = get_or_create_profile(db, request.cloud_user_id)
    child = SensitiveChild(
        id=uuid4(),
        profile_id=profile.id,
        child_name=request.name,
        child_birth_date=parse_birth_date(request.birth_date),
        child_gender=request.gender,
    )
    db.add(child)
    db.commit()
    db.refresh(child)
    return {"sensitive_child_id": child.id}


@app.get("/internal/sensitive/children")
def list_children(
    cloud_user_id: UUID = Query(...),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(SensitiveProfile)
        .filter(SensitiveProfile.cloud_user_id == cloud_user_id)
        .first()
    )
    if not profile:
        return []

    children = (
        db.query(SensitiveChild)
        .filter(SensitiveChild.profile_id == profile.id)
        .order_by(SensitiveChild.created_at.desc())
        .all()
    )
    return [
        {
            "id": child.id,
            "name": child.child_name,
            "birth_date": child.child_birth_date.isoformat() if child.child_birth_date else None,
            "gender": child.child_gender,
            "created_at": child.created_at,
            "updated_at": child.updated_at,
        }
        for child in children
    ]


@app.patch("/internal/sensitive/children/{child_id}")
def update_child(
    child_id: UUID,
    request: ChildPatchRequest,
    db: Session = Depends(get_db),
):
    child = db.query(SensitiveChild).filter(SensitiveChild.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    if request.name is not None:
        child.child_name = request.name
    if request.birth_date is not None:
        child.child_birth_date = parse_birth_date(request.birth_date)
    if request.gender is not None:
        child.child_gender = request.gender

    db.commit()
    db.refresh(child)
    return {"sensitive_child_id": child.id}


@app.post("/internal/sensitive/consultation")
def create_consultation(request: ConsultationRequest, db: Session = Depends(get_db)):
    consultation = SensitiveConsultation(
        id=uuid4(),
        consultation_id=request.consultation_id,
        cloud_user_id=request.cloud_user_id,
        sensitive_content=encrypt_json(request.raw_payload),
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)
    return {"id": consultation.id, "consultation_id": consultation.consultation_id}

app.include_router(
    analyze_router
)
