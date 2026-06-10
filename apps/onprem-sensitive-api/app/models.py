from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import Uuid
from sqlalchemy.sql import func

from app.database import Base


class SensitiveProfile(Base):

    __tablename__ = "sensitive_profiles"

    id = Column(
        Uuid,
        primary_key=True,
    )

    cloud_user_id = Column(
        Uuid,
        nullable=False,
        unique=True,
        index=True,
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

    id = Column(
        Uuid,
        primary_key=True,
    )

    profiles_id = Column(
        Uuid,
        ForeignKey("sensitive_profiles.id"),
        nullable=False,
        index=True,
    )

    name_enc = Column(
        Text,
        nullable=False,
    )

    birth_date_enc = Column(
        Text,
        nullable=False,
    )

    gender_enc = Column(
        Text,
        nullable=False,
    )

    detail_json_enc = Column(
        Text,
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


class SensitiveConsultation(Base):

    __tablename__ = "sensitive_consultation"

    id = Column(
        Uuid,
        primary_key=True,
    )

    consultation_id = Column(
        Uuid,
        nullable=False,
        unique=True,
        index=True,
    )

    cloud_user_id = Column(
        Uuid,
        nullable=False,
        index=True,
    )

    raw_enc = Column(
        Text,
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
