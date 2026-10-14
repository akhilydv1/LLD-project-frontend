# DesignLoop — LLD Practice Studio

A full-stack platform to practice **Low-Level Design (LLD)**. Pick a real-world problem (Parking Lot, Elevator Control System, etc.), explain your design as text, a document, a diagram, or a mix of these, and receive structured AI feedback.

## 🔗 Live Demo & Repositories

| Part | Tech | Link |
|------|------|------|
| **Live App** | Deployed on Vercel | https://lld-project-frontend.vercel.app/ |
| **Frontend Repo** | React + Vite | https://github.com/akhilydv1/LLD-project-frontend |
| **Backend Repo** | Spring Boot | https://github.com/akhilydv1/LLD-backendfinal |
| **Backend API** | Deployed on Render | https://lld-backendfinal.onrender.com |

> **Note:** The backend runs on Render's free plan, so the first request after a period of inactivity can take 30–60 seconds while the server wakes up.

---

## ⚠️ Known Limitation: AI Evaluation

DesignLoop's AI feedback is powered by the **Google Gemini API** running on a **free-tier API key**. The free tier has limited capacity, so evaluation may occasionally fail with an `HTTP 503 (Service Unavailable)` or a rate-limit error when Google's servers are busy.

- This is a limitation of the free Gemini service, **not a bug in the application**.
- Your submission is **always saved safely**, even when evaluation fails.
- Click **Retry evaluation** on the feedback page to try again.
- With a paid API key (or automatic retry and a fallback model), evaluation would be far more reliable.

---

## ✨ Features

- Overview dashboard with six starter LLD problems
- Problem library with search and difficulty filter
- Problem brief with requirements and a change scenario
- **Four input modes:** Text, Document, Diagram, and Combined
- Structured text fields: requirements, classes and responsibilities, relationships, behaviour, trade-offs, tests, and optional code
- Document upload: PDF, DOC/DOCX, TXT, MD, RTF, ODT (20 MB per file)
- Diagram upload: PNG, JPG/JPEG, WEBP, SVG, PDF, Draw.io, XML (20 MB per file)
- Draft saving with revision tracking
- Submission status tracking: `DRAFT → SUBMITTED → EVALUATING → COMPLETED / FAILED`
- AI feedback with per-criterion scores, evidence, suggestions, and next steps
- Attempt history with status filter
- Retry evaluation for failed attempts
- Responsive layout for desktop and mobile
- Local demo mode (browser storage only; it never fakes AI scores)

---

## 🏗️ Architecture

```
┌────────────────────┐   HTTPS / REST    ┌────────────────────┐    ┌──────────────┐
│  React + Vite      │ ────────────────▶ │  Spring Boot API   │ ─▶ │  Gemini API  │
│  (Vercel)          │ ◀──────────────── │  (Render)          │ ◀─ │  (evaluator) │
└────────────────────┘     JSON / files  └────────────────────┘    └──────────────┘
```

**How a submission flows:**

1. The learner selects a problem and creates an attempt.
2. The learner writes a design and/or uploads files, then saves a draft.
3. On submit, the backend accepts the attempt (`202 Accepted`) and evaluates it asynchronously.
4. The backend sends the saved submission to Gemini and stores the feedback.
5. The frontend shows the status and the feedback when it is `COMPLETED`.

The frontend never calls Gemini directly. All evaluation happens on the backend, so the API key stays private.

---

## 🧰 Tech Stack

**Frontend**
- React 18, Vite
- lucide-react (icons)
- Plain CSS
- Deployed on Vercel

**Backend**
- Java, Spring Boot (REST API)
- Google Gemini API for AI evaluation
- Deployed on Render

---

## 📁 Project Structure

### Frontend

```
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

### Backend

See the backend repository for the full structure: https://github.com/akhilydv1/LLD-backendfinal

---

## 🚀 Running Locally

### Prerequisites

- Node.js 18+ (20+ recommended) and npm
- Java 17+ and Maven (for the backend)
- A Google Gemini API key (free keys from Google AI Studio work)

### 1. Start the backend

```bash
git clone https://github.com/akhilydv1/LLD-backendfinal.git
cd LLD-backendfinal
```

Set your Gemini API key as an environment variable (never commit it to Git):

```bash
# Linux / macOS
export GEMINI_API_KEY=your_key_here

# Windows (PowerShell)
$env:GEMINI_API_KEY="your_key_here"
```

Then run:

```bash
./mvnw spring-boot:run
```

The API starts on `http://localhost:8080` by default.

> Check `application.properties` in the backend repo for the exact environment variable names.

### 2. Start the frontend

```bash
git clone https://github.com/akhilydv1/LLD-project-frontend.git
cd LLD-project-frontend
npm install
```

Copy `.env.example` to `.env` and set:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_LEARNER_ID=demo-learner
```

Then run:

```bash
npm run dev
```

Open the address Vite prints, usually `http://localhost:5173`.

> Make sure the backend CORS configuration allows your frontend origin (`http://localhost:5173`, and `http://localhost:5174` if needed).

### Demo mode (frontend only)

If no `.env` file exists, the UI runs in **local demo mode**. Drafts and attempt summaries are saved in your browser only. Server uploads and AI feedback are not available in this mode, and no AI scores are faked.

---

## ☁️ Deployment

| Part | Platform | Key settings |
|------|----------|--------------|
| Frontend | Vercel | Set `VITE_API_BASE_URL` to the Render backend URL |
| Backend | Render | Set the Gemini API key as an environment variable; allow the Vercel domain in CORS |

Production build check for the frontend:

```bash
npm run build
npm run preview
```

---

## 🔌 API Overview

The frontend talks to the backend through a single adapter file, `src/services/api.js`. The full contract is described in `BACKEND_API_CONTRACT.md`.

The API covers these operations:

- List problems (`GET /api/v1/problems`)
- Create an attempt
- Save a draft (with revision check)
- Upload an attachment (document or diagram)
- Submit an attempt for evaluation
- Get an attempt and list attempts
- Get feedback
- Retry a failed evaluation

---

## 📌 Current Boundaries

- The frontend only displays feedback returned by the backend. It does not call Gemini directly.
- In API mode, document and diagram files are uploaded through the attachments endpoint. In demo mode, only file metadata is kept in browser storage, not the file contents.
- The starter problem cards are fallback content. When the backend is connected, the list is loaded from `GET /api/v1/problems`.
- AI evaluation depends on Gemini availability (see the known limitation above).

---

## 🔮 Future Improvements

- Automatic retry with backoff and a fallback model for Gemini errors
- Auto-polling of evaluation status on the feedback page
- User authentication and accounts
- More LLD problems and difficulty levels

---

## 👤 Author

**Akhil Yadav** — [GitHub](https://github.com/akhilydv1)
