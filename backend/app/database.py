import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+psycopg2://pcos:pcos@localhost:5432/pcos_plan_a"
)

# Fly/Heroku-style Postgres URLs come back as "postgres://" or plain
# "postgresql://", neither of which names the psycopg2 driver SQLAlchemy
# needs here -- normalize so `fly postgres attach` works with no manual edit.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# SQLite fallback so the API runs out of the box for local demoing without a
# Postgres instance -- set DATABASE_URL to override for real deployment.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
