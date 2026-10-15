# HelixDx (PCOS Plan A) — Local Setup & Deployment Guide

This documents exactly how the project was taken from a zip file on Windows to a live, shareable web app. Follow it again any time you need to redeploy, hand the project to someone else, or explain the process in a report.

## 1. What this project is

A full-stack PCOS phenotype classification tool:
- **backend/** — FastAPI + PostgreSQL (SQLite fallback locally). A deterministic rule engine scores four phenotypes (Adrenal, Hormonal, Inflammatory, Metabolic) from a 44-question digitized questionnaire, applies four biomarker overrides, and classifies the result as Primary, Mixed, or Inconclusive.
- **frontend/** — React + Vite + Tailwind, glassmorphic "high-tech medical" UI with a particle background, a multi-step questionnaire wizard, and an animated results page.
- The frontend also carries a JavaScript port of the exact same rule engine (`src/lib/ruleEngine.js`), so **it works fully standalone with no backend running** — if it can't reach an API, it silently scores locally using identical logic. This is why the deployed version below needed no backend at all.

## 2. Local setup (Windows)

1. Extract the project zip. Because Windows Explorer nests the folder inside itself, the real path ends up double-nested — confirm it by searching for `requirements.txt` (Explorer search bar) rather than guessing:
   ```
   C:\Users\<you>\Downloads\pcos-plan-a\pcos-plan-a\
   ```
2. Install Node.js LTS from [nodejs.org](https://nodejs.org) if `node -v` / `npm -v` aren't recognized in Command Prompt. Close **all** Command Prompt windows and open a fresh one afterward — old windows won't pick up the updated PATH.
3. In a fresh Command Prompt:
   ```
   cd "C:\Users\<you>\Downloads\pcos-plan-a\pcos-plan-a\frontend"
   npm install
   npm run dev
   ```
4. Open the printed link (`http://localhost:5173`) in your browser. Click through the assessment end-to-end to confirm it scores and shows a result page.

(The backend can also be run locally with `pip install -r requirements.txt` then `uvicorn app.main:app --reload` from `backend/`, but it's optional — see the standalone note above.)

## 3. Deploying the frontend (Vercel)

Vercel was chosen because it's free, has a scriptable CLI, and the repo already includes a `vercel.json` (SPA rewrite rule for React Router).

```
cd "C:\Users\<you>\Downloads\pcos-plan-a\pcos-plan-a\frontend"
npm install -g vercel
vercel login
```
`vercel login` opens a browser tab — log in or sign up (free), then return to Command Prompt.

```
vercel --prod
```
Press Enter through the setup questions to accept defaults (link to existing project = No, project name = default folder name, etc). After ~15-30 seconds it prints a live production URL.

**Live URL:** `https://frontend-virid-eight-79.vercel.app`

### Renaming the link
Vercel's auto-generated name (`frontend-virid-eight-79`) can be swapped for something nicer without redeploying:
```
vercel alias set frontend-virid-eight-79.vercel.app <your-chosen-name>
```
This adds a second, nicer-looking alias (e.g. `https://helixdx-pcos.vercel.app`) pointing at the same deployment. The original link keeps working too.

## 4. Deploying the backend (Fly.io) — optional, not currently live

The backend is fully deployment-ready (`backend/Dockerfile`, `backend/fly.toml`) but was **not** deployed in this pass — Fly.io now requires a payment method on file before it will launch any app, even free-tier ones. To finish this later:

1. Add a card at `fly.io/dashboard` → Billing (a project this small should stay within Fly's free monthly allowance).
2. Install flyctl: `powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"`, then open a **fresh** Command Prompt.
3. From `backend/`, run these one at a time (waiting for each to finish before the next — running them as one pasted block can get consumed by an interactive login prompt):
   ```
   fly auth signup
   fly launch --copy-config --yes --now
   fly postgres create --name pcos-plan-a-db --region bom
   fly postgres attach pcos-plan-a-db -a pcos-plan-a-api
   ```
4. Once live, set `VITE_API_URL` in the Vercel project (Settings → Environment Variables) to the `https://pcos-plan-a-api.fly.dev` URL, tighten `allow_origins` in `backend/app/main.py` from `["*"]` to the Vercel URL, and redeploy both.

Until this is done, the deployed app quietly uses its local JS fallback for every submission — functionally identical results, just not persisted to a database.

## 5. QA performed

Before deploying, the full assessment flow was run end-to-end in a live browser session (all 8 steps, submit, results page) with the browser's console checked for errors. No functional bugs were found; the app renders and scores correctly with zero backend involvement.

## 6. Quick reference

| Task | Command |
|---|---|
| Run frontend locally | `npm run dev` (from `frontend/`) |
| Redeploy frontend | `vercel --prod` (from `frontend/`) |
| Add a nicer link | `vercel alias set <auto-name>.vercel.app <new-name>` |
| Run backend locally | `uvicorn app.main:app --reload` (from `backend/`, after `pip install -r requirements.txt`) |
| Run rule-engine tests | `python -m pytest tests/ -v` (from `backend/`) |
