from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import Text
from sqlalchemy import Uuid
from sqlalchemy.sql import func

from app.database import Base


class SensitiveProfile(Base):

    __tablename__ = "sensitive_profiles"
    __table_args__ = {"schema": "ai_care"}

    id = Column(
        Uuid,
        primary_key=True,
    )

    cloud_user_id = Column(
        Uuid,
        nullable=False,
        unique=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class SensitiveChild(Base):

    __tablename__ = "sensitive_children"
    __table_args__ = {"schema": "ai_care"}

    id = Column(
        Uuid,
        primary_key=True,
    )

    profile_id = Column(
        "profiles_id",
        Uuid,
        ForeignKey("ai_care.sensitive_profiles.id"),
        nullable=False,
    )

    name_enc = Column(
        Text,
        nullable=False,
    )

    birth_date_enc = Column(
        Text,
    )

    gender_enc = Column(
        Text,
    )

    detail_json_enc = Column(
        Text,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class SensitiveConsultation(Base):

    __tablename__ = "sensitive_consultation"
    __table_args__ = {"schema": "ai_care"}

    id = Column(
        Uuid,
        primary_key=True,
    )

    consultation_id = Column(
        Uuid,
        nullable=False,
        unique=True,
    )

    cloud_user_id = Column(
        Uuid,
        nullable=False,
    )

    raw_enc = Column(
        Text,
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
