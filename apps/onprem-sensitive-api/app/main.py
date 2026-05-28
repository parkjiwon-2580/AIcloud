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
from app.security import decrypt_text, encrypt_json, encrypt_text


Base.metadata.create_all(bind=engine)

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
        .filter(SensitiveProfile.cloud_user_id == str(cloud_user_id))
        .first()
    )
    if existing:
        return existing

    profile = SensitiveProfile(id=str(uuid4()), cloud_user_id=str(cloud_user_id))
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


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
        id=str(uuid4()),
        sensitive_profiles_id=profile.id,
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
        .filter(SensitiveProfile.cloud_user_id == str(cloud_user_id))
        .first()
    )
    if not profile:
        return []

    children = (
        db.query(SensitiveChild)
        .filter(SensitiveChild.sensitive_profiles_id == profile.id)
        .order_by(SensitiveChild.created_at.desc())
        .all()
    )
    return [
        {
            "id": child.id,
            "name": decrypt_text(child.name_enc),
            "birth_date": decrypt_text(child.birth_date_enc),
            "gender": decrypt_text(child.gender_enc),
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
    child = db.query(SensitiveChild).filter(SensitiveChild.id == str(child_id)).first()
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
    consultation = SensitiveConsultation(
        id=str(uuid4()),
        consultation_id=str(request.consultation_id),
        cloud_user_id=str(request.cloud_user_id),
        raw_enc=encrypt_json(request.raw_payload),
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)
    return {"id": consultation.id, "consultation_id": consultation.consultation_id}

app.include_router(
    analyze_router
)