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
    email = Column(String, nullable=True)
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
    Step 0 (Registration page) & Patient Profile record.
    """
    __tablename__ = "registrations"

    id = _uuid_column()
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    password = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    dob = Column(Date, nullable=True)
    age = Column(Integer, nullable=True)
    demographics = Column(JSON, nullable=False, default=dict)
    region_preference = Column(String, nullable=True)
    diet_type = Column(String, nullable=True)
    extracted_report = Column(JSON, nullable=True)


class Feedback(Base):
    """Feedback form: general feedback about the tool itself."""
    __tablename__ = "feedback"

    id = _uuid_column()
    created_at = Column(DateTime, default=datetime.utcnow)
    rating = Column(Integer, nullable=True)
    comments = Column(String, nullable=False)
    context = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)


class DailyLog(Base):
    """
    Daily cycle & wellness tracking log.
    Tracks cycle phase, flow intensity, sleep hours, mood, basal body temperature (bbt),
    symptoms, and user journal notes.
    """
    __tablename__ = "daily_logs"

    id = _uuid_column()
    created_at = Column(DateTime, default=datetime.utcnow)
    email = Column(String, nullable=False, index=True)
    date = Column(String, nullable=False, index=True)  # YYYY-MM-DD
    cycle_phase = Column(String, nullable=True)
    flow = Column(String, nullable=True)
    mood = Column(Integer, nullable=True)
    sleep_hours = Column(Float, nullable=True)
    bbt = Column(Float, nullable=True)
    symptoms = Column(JSON, nullable=False, default=list)
    notes = Column(String, nullable=True)


class LifestylePlan(Base):
    """
    Personalized lifestyle, nutrition, and supplement protocol for patient.
    """
    __tablename__ = "lifestyle_plans"

    id = _uuid_column()
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    email = Column(String, nullable=False, index=True)
    region_preference = Column(String, nullable=True)
    diet_type = Column(String, nullable=True)
    primary_phenotype = Column(String, nullable=True)
    dietary_strategy = Column(JSON, nullable=True)
    exercise_routine = Column(JSON, nullable=True)
    supplement_roadmap = Column(JSON, nullable=True)
    sample_day = Column(JSON, nullable=True)


class AssessmentCategory(Base):
    """
    Partial or completed responses for each assessment category
    (first_line, metabolic, hormonal, adrenal, inflammatory, mitochondrial, exclusions).
    """
    __tablename__ = "assessment_categories"

    id = _uuid_column()
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    email = Column(String, nullable=False, index=True)
    category_key = Column(String, nullable=False, index=True)
    answers = Column(JSON, nullable=False, default=dict)


class MedicalRecord(Base):
    """
    Medical details, biomarkers, and Rotterdam diagnostic criteria inputs.
    """
    __tablename__ = "medical_records"

    id = _uuid_column()
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    email = Column(String, nullable=False, index=True)
    rotterdam_irregular_cycles = Column(String, nullable=True)
    rotterdam_hyperandrogenism = Column(String, nullable=True)
    rotterdam_polycystic_ovaries = Column(String, nullable=True)
    exclusion_other_disorders = Column(String, nullable=True)
    lab_total_testosterone = Column(Float, nullable=True)
    lab_dheas = Column(Float, nullable=True)
    lab_fasting_insulin = Column(Float, nullable=True)
    lab_fasting_glucose = Column(Float, nullable=True)
    lab_hscrp = Column(Float, nullable=True)
    lab_lh = Column(Float, nullable=True)
    lab_fsh = Column(Float, nullable=True)
    extracted_report = Column(JSON, nullable=True)
    raw_answers = Column(JSON, nullable=True)


# Auto-create all tables
Base.metadata.create_all(bind=engine)


def _ensure_sqlite_columns():
    """Ensure older SQLite databases have columns added if not present."""
    if engine.dialect.name != "sqlite":
        return
    with engine.connect() as conn:
        # Check submissions columns
        cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(submissions)").fetchall()]
        if "email" not in cols:
            conn.exec_driver_sql("ALTER TABLE submissions ADD COLUMN email VARCHAR")

        # Check registrations columns
        reg_cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(registrations)").fetchall()]
        if "password" not in reg_cols:
            conn.exec_driver_sql("ALTER TABLE registrations ADD COLUMN password VARCHAR")
        if "phone" not in reg_cols:
            conn.exec_driver_sql("ALTER TABLE registrations ADD COLUMN phone VARCHAR")
        if "updated_at" not in reg_cols:
            conn.exec_driver_sql("ALTER TABLE registrations ADD COLUMN updated_at TIMESTAMP")


_ensure_sqlite_columns()
