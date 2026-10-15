from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api", tags=["feedback"])


@router.post("/feedback", response_model=schemas.FeedbackResult)
def create_feedback(payload: schemas.FeedbackCreate, db: Session = Depends(get_db)):
    """General app feedback -- not clinical data -- kept in this project's
    own database so the team can read it. Never shared externally."""
    record = models.Feedback(
        rating=payload.rating,
        comments=payload.comments,
        context=payload.context,
        contact_email=payload.contact_email,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return schemas.FeedbackResult(id=str(record.id), created_at=record.created_at.isoformat())
