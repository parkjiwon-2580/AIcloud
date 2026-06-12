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
from app.security import decrypt_json, decrypt_text, encrypt_json, encrypt_text


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
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'ai_care'
                        AND table_name = 'sensitive_children'
                        AND column_name = 'profile_id'
                    )
                    AND NOT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'ai_care'
                        AND table_name = 'sensitive_children'
                        AND column_name = 'profiles_id'
                    ) THEN
                        ALTER TABLE ai_care.sensitive_children
                        RENAME COLUMN profile_id TO profiles_id;
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'ai_care'
                        AND table_name = 'sensitive_children'
                        AND column_name = 'child_name'
                    )
                    AND NOT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'ai_care'
                        AND table_name = 'sensitive_children'
                        AND column_name = 'name_enc'
                    ) THEN
                        ALTER TABLE ai_care.sensitive_children
                        RENAME COLUMN child_name TO name_enc;
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'ai_care'
                        AND table_name = 'sensitive_children'
                        AND column_name = 'child_birth_date'
                    )
                    AND NOT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'ai_care'
                        AND table_name = 'sensitive_children'
                        AND column_name = 'birth_date_enc'
                    ) THEN
                        ALTER TABLE ai_care.sensitive_children
                        RENAME COLUMN child_birth_date TO birth_date_enc;
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'ai_care'
                        AND table_name = 'sensitive_children'
                        AND column_name = 'child_gender'
                    )
                    AND NOT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'ai_care'
                        AND table_name = 'sensitive_children'
                        AND column_name = 'gender_enc'
                    ) THEN
                        ALTER TABLE ai_care.sensitive_children
                        RENAME COLUMN child_gender TO gender_enc;
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'ai_care'
                        AND table_name = 'sensitive_consultation'
                        AND column_name = 'sensitive_content'
                    )
                    AND NOT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'ai_care'
                        AND table_name = 'sensitive_consultation'
                        AND column_name = 'raw_enc'
                    ) THEN
                        ALTER TABLE ai_care.sensitive_consultation
                        RENAME COLUMN sensitive_content TO raw_enc;
                    END IF;
                END
                $$;
                """
            )
        )
        connection.execute(
            text(
                """
                ALTER TABLE ai_care.sensitive_children
                ADD COLUMN IF NOT EXISTS detail_json_enc TEXT
                """
            )
        )
        connection.execute(
            text(
                """
                ALTER TABLE ai_care.sensitive_children
                ALTER COLUMN name_enc TYPE TEXT USING name_enc::TEXT,
                ALTER COLUMN birth_date_enc TYPE TEXT USING birth_date_enc::TEXT,
                ALTER COLUMN gender_enc TYPE TEXT USING gender_enc::TEXT
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


def read_sensitive_text(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return decrypt_text(value)
    except Exception:
        return value


def read_sensitive_json(value: str | None) -> dict[str, Any]:
    if not value:
        return {}
    try:
        return decrypt_json(value)
    except Exception:
        return {}


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
        name_enc=encrypt_text(request.name),
        birth_date_enc=encrypt_text(request.birth_date),
        gender_enc=encrypt_text(request.gender),
        detail_json_enc=encrypt_json(request.detail_json),
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
            "name": read_sensitive_text(child.name_enc),
            "birth_date": read_sensitive_text(child.birth_date_enc),
            "gender": read_sensitive_text(child.gender_enc),
            "detail_json": read_sensitive_json(child.detail_json_enc),
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
        child.name_enc = encrypt_text(request.name)
    if request.birth_date is not None:
        child.birth_date_enc = encrypt_text(request.birth_date)
    if request.gender is not None:
        child.gender_enc = encrypt_text(request.gender)
    if request.detail_json is not None:
        child.detail_json_enc = encrypt_json(request.detail_json)

    db.commit()
    db.refresh(child)
    return {"sensitive_child_id": child.id}


@app.post("/internal/sensitive/consultation")
def create_consultation(request: ConsultationRequest, db: Session = Depends(get_db)):
    existing = (
        db.query(SensitiveConsultation)
        .filter(SensitiveConsultation.consultation_id == request.consultation_id)
        .first()
    )
    if existing:
        existing.cloud_user_id = request.cloud_user_id
        existing.raw_enc = encrypt_json(request.raw_payload)
        db.commit()
        db.refresh(existing)
        return {"id": existing.id, "consultation_id": existing.consultation_id}

    consultation = SensitiveConsultation(
        id=uuid4(),
        consultation_id=request.consultation_id,
        cloud_user_id=request.cloud_user_id,
        raw_enc=encrypt_json(request.raw_payload),
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)
    return {"id": consultation.id, "consultation_id": consultation.consultation_id}


@app.get("/internal/sensitive/consultation/{consultation_id}")
def get_consultation(consultation_id: UUID, db: Session = Depends(get_db)):
    consultation = (
        db.query(SensitiveConsultation)
        .filter(SensitiveConsultation.consultation_id == consultation_id)
        .first()
    )
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    return {
        "id": consultation.id,
        "consultation_id": consultation.consultation_id,
        "cloud_user_id": consultation.cloud_user_id,
        "raw_payload": decrypt_json(consultation.raw_enc),
    }

app.include_router(
    analyze_router
)
