# PCOS Phenotype Classification (Rule-Based)

A complete, working build of a deterministic rule engine
(no AI/ML anywhere) that classifies a patient into Adrenal / Hormonal / Inflammatory /
Metabolic PCOS phenotype(s), applies the four hard biomarker overrides, and maps the
result to a South/North Indian, Veg/Non-Veg/Vegan diet & exercise protocol.

## Project structure

```text
pcos/
├── backend/
│   ├── app/
│   │   ├── data/
│   │   ├── routers/
│   │   ├── __init__.py
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── recommendations.py
│   │   ├── rule_engine.py
│   │   └── schemas.py
│   ├── tests/
│   │   └── test_rule_engine.py
│   ├── Dockerfile
│   ├── fly.toml
│   └── requirements.txt
├── frontend/
│   ├── public/
│   │   └── media/
│   ├── src/
│   │   ├── components/
│   │   ├── data/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vercel.json
│   └── vite.config.js
├── Claude outputs/
│   └── DEPLOYMENT_GUIDE.md
├── .gitignore
├── README.md
└── LICENSE (optional, if added later)
```

## Why this is trustworthy (Step 7 of the plan)

Every number in `backend/app/data/questionnaire.json` and `diet_protocols.json` is a
line-for-line transcription of *PCOS_Phenotype_Grouped_Questionnaire_v3.1.docx* — each
question, override, and diet block carries a `source`/`reference` field pointing at the
exact table/row/bullet it came from. The rule engine (`backend/app/rule_engine.py`) is
~250 lines of plain `if`/`gte`/`outside` logic interpreting that JSON — there is nothing
to "trust" beyond reading the code. Six hand-tallied test cases live in
`backend/tests/test_rule_engine.py` and all pass (`pytest`).

**Two copies of the questionnaire exist on purpose**: one at
`backend/app/data/questionnaire.json` (the API's source of truth) and one at
`frontend/src/data/questionnaire.json` (so the form renders instantly and the app can
score locally — see "Offline fallback" below). **If you change a threshold, question, or
diet block, edit both files identically** (or run
`cp backend/app/data/questionnaire.json frontend/src/data/questionnaire.json` and the
same for `diet_protocols.json`). If you'd rather have one source of truth at the cost of
an extra network round trip on page load, wire `Questionnaire.jsx` to call
`fetchQuestionnaire()` from `src/lib/api.js` (already written, just unused) instead of
importing the local JSON.

## Running the backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Uses a local SQLite file if DATABASE_URL isn't set — fine for development.
# For real use, point it at Postgres:
cp .env.example .env   # then edit DATABASE_URL

uvicorn app.main:app --reload --port 8000
```

Run the tests any time you touch the rule engine or the questionnaire JSON:

```bash
cd backend && pytest -v
```

API docs are auto-generated at `http://localhost:8000/docs`.

## Running the frontend

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL, defaults to http://localhost:8000
npm run dev            # http://localhost:5173
```

### Offline fallback

`src/lib/ruleEngine.js` is a line-for-line JS port of the Python engine. If the backend
is unreachable, `src/lib/api.js` silently falls back to scoring in the browser with the
same JSON and the same logic — the demo never breaks because a server isn't running.
`backend/tests/test_rule_engine.py`'s six cases are worth re-running against the JS port
by hand if you ever change one side without the other; there's no automated parity test
yet (a good thing to add if this grows past a student project).

### Adding your own background videos

The design has three video-background slots that gracefully do nothing if the file
isn't there. Drop files into `frontend/public/media/` — see
`frontend/public/media/README.md` for the exact filenames and guidance on keeping a
video from fighting the glass UI on top of it (dark/desaturated, calm loops, reasonable
file size). No code changes needed once the file exists.

## Deployment

**Frontend → Vercel.** `frontend/vercel.json` is already set up for SPA routing (the app
uses hash-based routing internally too, so this is mostly a safety net). Set the
`VITE_API_URL` environment variable in the Vercel project to your deployed backend's URL.

**Backend → Azure App Service / Render / Railway / anywhere that runs a Dockerfile.**
`backend/Dockerfile` builds and runs the API. Set `DATABASE_URL` to a managed Postgres
instance (Azure Database for PostgreSQL, Supabase, Neon, etc.) as an environment
variable — the app creates its tables automatically on startup
(`Base.metadata.create_all` in `app/models.py`; swap in Alembic migrations before this
handles anything beyond a student project's data volume).

Remember to tighten `allow_origins=["*"]` in `backend/app/main.py` to your actual Vercel
domain once it's live.

## What's deliberately NOT here (that's Plan B)

No AI/ML model touches the classification path anywhere in this codebase — per the work
plan, and per your professor's instruction. `src/lib/ruleEngine.js` and
`app/rule_engine.py` are the only two places a phenotype gets decided, and both are pure
threshold logic over the JSON. When you're ready to layer in Plan B (free-text intake,
borderline-case detection, the local LLM explanation assistant), none of it should ever
be able to change what those two files return — it should only sit around them.
