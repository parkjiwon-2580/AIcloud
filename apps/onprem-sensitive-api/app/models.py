from sqlalchemy import Column
<<<<<<< HEAD
from sqlalchemy import String
from sqlalchemy import DateTime
=======
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import String
>>>>>>> f0087804447545af148c4103bb4b34db1b426fdf
from sqlalchemy import Text
from sqlalchemy.sql import func

from app.database import Base

<<<<<<< HEAD
class Consultation(Base):

    __tablename__ = "consultations"

    consultation_id = Column(
=======

class SensitiveProfile(Base):

    __tablename__ = "sensitive_profiles"

    id = Column(
>>>>>>> f0087804447545af148c4103bb4b34db1b426fdf
        String,
        primary_key=True,
    )

    cloud_user_id = Column(
        String,
<<<<<<< HEAD
    )

    raw_payload = Column(
        Text,
=======
        nullable=False,
        index=True,
>>>>>>> f0087804447545af148c4103bb4b34db1b426fdf
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
<<<<<<< HEAD
    )
=======
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class SensitiveChild(Base):

    __tablename__ = "sensitive_children"

    id = Column(
        String,
        primary_key=True,
    )

    sensitive_profiles_id = Column(
        String,
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
        String,
        primary_key=True,
    )

    consultation_id = Column(
        String,
        nullable=False,
        index=True,
    )

    cloud_user_id = Column(
        String,
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
>>>>>>> f0087804447545af148c4103bb4b34db1b426fdf
