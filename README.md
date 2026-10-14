# DesignLoop — LLD Practice Frontend
## Project Repositories
**Fully deployed-working project:** https://lld-project-frontend.vercel.app/
## ⚠️ Known Limitation: AI Evaluation

DesignLoop's AI feedback is powered by the Google Gemini API, running on a **free-tier API key**. The free tier has limited capacity, so evaluation may occasionally fail with an `HTTP 503 (Service Unavailable)` or rate-limit error when Google's servers are busy. This is a limitation of the free Gemini service, not a bug in the application. Your submission is always saved safely, and you can click **Retry evaluation** to try again. With a paid API key, evaluation would be far more reliable.

- **Frontend (React + Vite):** https://github.com/akhilydv1/LLD-project-frontend
- **Backend (Spring Boot):** https://github.com/akhilydv1/LLD-backendfinal

A simple, responsive React + Vite UI for a Low-Level Design practice platform. It supports three learner input options—**Text, Document, and Diagram**—plus a Combined mode for using more than one type of evidence.

## What is included

- Overview dashboard and six starter LLD problems.
- Problem library search and difficulty filter.
- Problem brief with requirements and a change scenario.
- Four input modes: Text, Document, Diagram, and Combined.
- Structured text fields for requirements, classes/responsibilities, relationships, behaviour, trade-offs, tests and optional code.
- Document upload: PDF, DOC/DOCX, TXT, MD, RTF and ODT (20 MB per file).
- Diagram upload: PNG, JPG/JPEG, WEBP, SVG, PDF, Draw.io and XML (20 MB per file).
- Draft saving, submission status, feedback display, attempt history and retry-evaluation action when the attempt has failed.
- Responsive layout for desktop and mobile.
- Local demo mode with browser persistence. It does **not** fake AI scores or pretend to evaluate design quality.
- One API adapter file (`src/services/api.js`) and a backend contract (`BACKEND_API_CONTRACT.md`) to keep integration straightforward.

## Run locally on Windows

Requirements: Node.js 18+ (Node 20+ recommended) and npm.

```bash
npm install
npm run dev
```

Open the local address Vite prints, usually `http://localhost:5173`.

### Local demo mode

If no `.env` file exists, the UI uses local demo mode. Drafts and attempt summaries are saved in this browser. Actual server uploads and AI feedback are not performed in demo mode.

### Connect the backend

1. Copy `.env.example` to `.env`.
2. Set `VITE_API_BASE_URL` to the Spring Boot base URL, for example `http://localhost:8080`.
3. Set `VITE_LEARNER_ID` to the local demo learner ID required by your API, if the backend uses `X-Learner-Id`.
4. Restart Vite after changing `.env`.
5. Ensure Spring Boot CORS allows the Vite origin (usually `http://localhost:5173` and, if needed, `http://localhost:5174`).
6. The backend must implement the endpoints and payloads in `BACKEND_API_CONTRACT.md`, or you must adapt `src/services/api.js` to match the actual backend contract.


## Production build check

```bash
npm run build
npm run preview
```

## Main project structure

```text
designloop-frontend/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── BACKEND_API_CONTRACT.md
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── styles.css
    ├── data/
    │   └── problems.js
    └── services/
        └── api.js
```

## Current boundaries

- The frontend shows evaluator feedback returned by the backend. It does not call Gemini directly; the API must evaluate the persisted submission and return its feedback.
- Document/diagram file selection is handled in the browser. In API mode, files are uploaded via the attachments endpoint. In demo mode, only file metadata is retained in browser storage, not the file bytes.
- The starter problem cards are fallback/demo content. When API mode is enabled, the list is loaded from `GET /api/v1/problems` when available.
- ## Project Repositories

