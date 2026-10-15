import uuid
from datetime import datetime

from sqlalchemy import JSON, Column, Date, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import UUID

from .database import Base, engine


def _uuid_column():
    # UUID type on Postgres, plain string on the SQLite fallback.
    if engine.dialect.name == "postgresql":
        return Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    return Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))


class Submission(Base):
    """
    One patient's raw answers + the resulting classification, exactly as the
    rule engine produced it. Storing the full result alongside the raw answers
    keeps every past result reproducible and auditable even if the JSON rules
    change later (Step 1's "single source of truth" promise).
    """
    __tablename__ = "submissions"

    id = _uuid_column()
    created_at = Column(DateTime, default=datetime.utcnow)
    demographics = Column(JSON, nullable=False, default=dict)
    answers = Column(JSON, nullable=False, default=dict)
    primary_goals = Column(JSON, nullable=False, default=list)
    region_preference = Column(String, nullable=True)
    diet_type = Column(String, nullable=True)

    scores = Column(JSON, nullable=False, default=dict)
    classification = Column(JSON, nullable=False, default=dict)
    recommendation = Column(JSON, nullable=False, default=dict)
    questionnaire_version = Column(String, nullable=False, default="1.0.0")


class Registration(Base):
    """
    Step 0 (Registration page) record. Ishi's explicit call: this is a real
    backend table now, not browser-only sessionStorage -- but it still never
    leaves this project's own database. No row here is ever sent to OpenAI,
    any other AI provider, or any third-party service; the report-upload
    fields it stores are the *already-extracted* numbers produced entirely
    client-side (see frontend/src/lib/reportExtractor.js) -- the original
    PDF/image file itself is never uploaded or stored anywhere.
    """
    __tablename__ = "registrations"

    id = _uuid_column()
    created_at = Column(DateTime, default=datetime.utcnow)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    dob = Column(Date, nullable=True)
    age = Column(Integer, nullable=True)
    demographics = Column(JSON, nullable=False, default=dict)
    region_preference = Column(String, nullable=True)
    diet_type = Column(String, nullable=True)
    extracted_report = Column(JSON, nullable=True)


class Feedback(Base):
    """Feedback form (insights-doc gap): general feedback about the tool
    itself, not clinical data -- kept in this project's own database only."""
    __tablename__ = "feedback"

    id = _uuid_column()
    created_at = Column(DateTime, default=datetime.utcnow)
    rating = Column(Integer, nullable=True)
    comments = Column(String, nullable=False)
    context = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)


Base.metadata.create_all(bind=engine)
