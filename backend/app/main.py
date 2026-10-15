from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401  (ensures tables are created on import)
from .routers import feedback, registration, submissions

app = FastAPI(
    title="PCOS Phenotype Classification API",
    description=(
        "Deterministic rule-engine backend for phenotype classification. "
        "No AI/ML -- every result traces back to a rule in the source questionnaire."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your deployed frontend origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(submissions.router)
app.include_router(registration.router)
app.include_router(feedback.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
