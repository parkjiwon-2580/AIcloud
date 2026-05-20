from fastapi import FastAPI
from pydantic import BaseModel
from uuid import UUID
import json

from app.database import engine
from app.database import SessionLocal

from app.models import Base
from app.models import Consultation

Base.metadata.create_all(bind=engine)

app = FastAPI()

class ConsultationRequest(BaseModel):

    consultation_id: UUID

    cloud_user_id: UUID

    raw_payload: dict

@app.post("/internal/sensitive/consultation")
async def create_consultation(
    request: ConsultationRequest,
):

    db = SessionLocal()

    try:

        consultation = Consultation(

            consultation_id=
                str(request.consultation_id),

            cloud_user_id=
                str(request.cloud_user_id),

            raw_payload=
                json.dumps(request.raw_payload),
        )

        db.add(consultation)

        db.commit()

        return {

            "id":
                consultation.consultation_id,
        }

    except Exception as e:

        print(e)

        raise e

    finally:

        db.close()