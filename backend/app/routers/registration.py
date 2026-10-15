from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api", tags=["registration"])


@router.post("/registration", response_model=schemas.RegistrationResult)
def create_registration(payload: schemas.RegistrationCreate, db: Session = Depends(get_db)):
    """
    Step 0 record. Persists to this project's own database only -- never to
    any AI provider or third-party service. The frontend still keeps its
    own sessionStorage copy for the rest of the assessment flow, so a
    failure here never blocks someone from continuing (see api.js).
    """
    record = models.Registration(
        full_name=payload.full_name,
        email=payload.email,
        dob=payload.dob,
        age=payload.age,
        demographics=payload.demographics,
        region_preference=payload.region_preference,
        diet_type=payload.diet_type,
        extracted_report=payload.extracted_report,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return schemas.RegistrationResult(
        id=str(record.id),
        created_at=record.created_at.isoformat(),
        full_name=record.full_name,
        email=record.email,
    )


@router.get("/registration/{registration_id}", response_model=schemas.RegistrationResult)
def get_registration(registration_id: str, db: Session = Depends(get_db)):
    record = db.query(models.Registration).filter(models.Registration.id == registration_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Registration not found")
    return schemas.RegistrationResult(
        id=str(record.id),
        created_at=record.created_at.isoformat(),
        full_name=record.full_name,
        email=record.email,
    )
