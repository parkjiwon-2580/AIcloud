from sqlalchemy import Column
from sqlalchemy import Date
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import String
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
        Uuid,
        ForeignKey("ai_care.sensitive_profiles.id"),
        nullable=False,
    )

    child_name = Column(
        String(50),
    )

    child_birth_date = Column(
        Date,
    )

    child_gender = Column(
        String(20),
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
    )

    cloud_user_id = Column(
        Uuid,
        nullable=False,
    )

    sensitive_content = Column(
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
