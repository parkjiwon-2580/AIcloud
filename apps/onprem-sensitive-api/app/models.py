from sqlalchemy import Column
from sqlalchemy import String
from sqlalchemy import DateTime
from sqlalchemy import Text
from sqlalchemy.sql import func

from app.database import Base

class Consultation(Base):

    __tablename__ = "consultations"

    consultation_id = Column(
        String,
        primary_key=True,
    )

    cloud_user_id = Column(
        String,
    )

    raw_payload = Column(
        Text,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )