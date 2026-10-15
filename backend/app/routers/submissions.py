from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..recommendations import build_recommendation
from ..rule_engine import QUESTIONNAIRE, run_pipeline

router = APIRouter(prefix="/api", tags=["submissions"])


@router.get("/questionnaire")
def get_questionnaire():
    """The full digitised questionnaire (Step 1) -- the frontend renders its
    form directly from this, so the form and the scoring rules can never drift
    apart."""
    return QUESTIONNAIRE


@router.post("/submit", response_model=schemas.SubmissionResult)
def submit(payload: schemas.SubmissionCreate, db: Session = Depends(get_db)):
    result = run_pipeline(payload.answers)
    recommendation = build_recommendation(
        result["classification"], result["scores"], payload.region_preference, payload.diet_type,
        payload.answers.get("body_type"),
    )

    record = models.Submission(
        demographics=payload.demographics,
        answers=payload.answers,
        primary_goals=payload.primary_goals,
        region_preference=payload.region_preference,
        diet_type=payload.diet_type,
        scores=result["scores"],
        classification=result["classification"],
        recommendation=recommendation,
        questionnaire_version=QUESTIONNAIRE["meta"]["version"],
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return schemas.SubmissionResult(
        id=str(record.id),
        created_at=record.created_at.isoformat(),
        scores=record.scores,
        classification=record.classification,
        recommendation=record.recommendation,
        questionnaire_version=record.questionnaire_version,
    )


@router.get("/result/{submission_id}", response_model=schemas.SubmissionResult)
def get_result(submission_id: str, db: Session = Depends(get_db)):
    record = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Submission not found")
    return schemas.SubmissionResult(
        id=str(record.id),
        created_at=record.created_at.isoformat(),
        scores=record.scores,
        classification=record.classification,
        recommendation=record.recommendation,
        questionnaire_version=record.questionnaire_version,
    )
