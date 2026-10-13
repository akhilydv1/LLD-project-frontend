# DesignLoop frontend ↔ backend API contract

This document is the integration agreement expected by this frontend. Since the backend is being rebuilt separately, either implement these routes or update `src/services/api.js` after the backend API is finalized. Do not silently return mocked AI evaluation from the server.

## Common rules

- Base URL: `VITE_API_BASE_URL`, e.g. `http://localhost:8080`.
- JSON endpoints use `Content-Type: application/json`.
- Requests send `X-Learner-Id: <VITE_LEARNER_ID>`.
- Submission sends a unique `Idempotency-Key` header.
- CORS must allow the Vite origin, methods GET/POST/PUT/OPTIONS, and headers `Content-Type`, `X-Learner-Id`, and `Idempotency-Key`.
- Keep provider secrets such as Gemini API keys on the backend only.
- Save learner submission evidence before starting asynchronous evaluation. If evaluation fails, the submitted evidence must remain available.

## 1. List problems

`GET /api/v1/problems`

Response can be an array or `{ "problems": [...] }` / `{ "items": [...] }`.

Each problem should contain:

```json
{
  "id": "parking-lot",
  "title": "Parking Lot with Safe Checkout",
  "difficulty": "MEDIUM",
  "suggestedMinutes": 45,
  "description": "Design the object model for one office parking facility.",
  "category": "State and ownership",
  "skills": ["Class design", "Failure handling"],
  "requirements": [
    { "id": "R1", "description": "State a business requirement." }
  ],
  "changeScenario": "Introduce a weekend flat-rate tariff."
}
```

## 2. Problem detail

`GET /api/v1/problems/{problemId}`

Return the same problem fields plus detailed assumptions, out-of-scope items and rubric/criteria if available.

## 3. Create an attempt

`POST /api/v1/attempts`

Request:

```json
{
  "problemId": "parking-lot",
  "submissionFormat": "TEXT"
}
```

`submissionFormat` is one of `TEXT`, `DOCUMENT`, `DIAGRAM`, `COMBINED`.

Response (minimum required fields):

```json
{
  "id": "canonical-uuid-or-id",
  "problemId": "parking-lot",
  "status": "DRAFT",
  "revision": 0
}
```

The frontend also accepts `attemptId` instead of `id`.

## 4. Save draft

`PUT /api/v1/attempts/{id}/draft`

The `artifact.format` is `STRUCTURED_TEXT`, `DOCUMENT`, `DIAGRAM` or `COMBINED`. `expectedRevision` supports optimistic revision checking. For text and combined submissions, save the structured sections. For document/diagram-only submissions, the sections may be empty and `notes` can explain the evidence.

```json
{
  "expectedRevision": 0,
  "artifact": {
    "format": "STRUCTURED_TEXT",
    "sections": {
      "requirements": "Business rules and assumptions...",
      "responsibilities": "Classes and what each class owns...",
      "relationships": "Composition, references and dependencies...",
      "behavior": "Main use case and failure paths...",
      "tradeoffs": "Reasons for choices and change scenario...",
      "tests": "Edge cases, expected results and test seams...",
      "code": "Optional short code or pseudocode..."
    },
    "notes": "Optional context for attachments."
  }
}
```

Response should contain the updated `revision` and attempt status, or at least return HTTP 200/204 on success. On revision conflict, return HTTP 409 with a structured error.

## 5. Upload a document or diagram

`POST /api/v1/attempts/{id}/attachments` using `multipart/form-data`:

- `file`: the binary file (one file per request)
- `kind`: `DOCUMENT` or `DIAGRAM`
- `notes`: optional string

Allow the formats shown in the UI and enforce a configurable server-side size/type limit. Do not trust only the filename or client-side validation. Return attachment metadata including `id`, `name`, `kind`, `size` and upload status. Store attachment bytes server-side or in object storage; don't save just the browser filename as proof of upload.

The UI accepts documents PDF/DOC/DOCX/TXT/MD/RTF/ODT and diagrams PNG/JPG/JPEG/WEBP/SVG/PDF/Draw.io/XML, up to 20 MB each. The backend can choose a lower limit, but then update the UI and this contract to match.

## 6. Submit

`POST /api/v1/attempts/{id}/submit`

Header: `Idempotency-Key: <unique-value>`

No request body required. Save/freeze the submission, then enqueue evaluation without waiting for the LLM call. Preferred response: HTTP `202 Accepted`.

```json
{
  "attemptId": "canonical-uuid-or-id",
  "status": "SUBMITTED",
  "revision": 1,
  "evaluationRun": 1,
  "replayed": false,
  "statusUrl": "/api/v1/attempts/{id}",
  "feedbackUrl": "/api/v1/attempts/{id}/feedback"
}
```

Repeated calls with the same idempotency key must not create duplicate evaluation runs or charge external services twice.

## 7. Attempt status/details

`GET /api/v1/attempts/{id}`

Return current `status`, `revision`, problem metadata, saved draft/submission metadata, attachment metadata, optional `feedback`, and optional `failure`. Use statuses `DRAFT`, `SUBMITTED`, `EVALUATING`, `COMPLETED`, and `FAILED` consistently.

## 8. Feedback

`GET /api/v1/attempts/{id}/feedback`

If evaluation is still running, return a documented `409`/`425` or a status object. When finished, return meaningful feedback from the configured evaluator:

```json
{
  "provider": "GEMINI",
  "model": "configured-model-name",
  "assessmentType": "RUBRIC_BASED_DESIGN_REVIEW",
  "summary": "A concise overall assessment.",
  "overallScore": 72,
  "criteria": [
    {
      "criterionId": "RESPONSIBILITIES",
      "label": "Class responsibilities",
      "score": 3,
      "confidence": "MEDIUM",
      "evidence": [{ "section": "responsibilities", "quote": "Evidence from the learner submission" }],
      "concern": "A specific design weakness or gap.",
      "suggestion": "An actionable improvement."
    }
  ],
  "nextSteps": ["Walk through the failed-payment interaction."]
}
```

Scores can use a documented 0–4 or 0–100 scale, but the UI assumes a numeric `overallScore` is on a 0–100 scale and displays per-criterion scores with their value. Do not return a score if the evaluator did not actually assess design quality. Clearly label readiness-only fallback, and never advertise a `RULES` completeness check as Gemini feedback.

## 9. Attempt history

`GET /api/v1/attempts`

Return an array or `{ "attempts": [...] }` / `{ "items": [...] }`. Each item should include enough information to show attempt ID, problem title/ID, status, format, revision and updated/created time.

## 10. Retry evaluation

`POST /api/v1/attempts/{id}/retry-evaluation`

Only retry eligible failed evaluation runs. Return the new status and evaluation run number. Persist the original submission; do not require the learner to resubmit or re-upload unless the contract explicitly says otherwise.

## Error response format

Prefer `application/problem+json`, for example:

```json
{
  "title": "Bad Request",
  "status": 400,
  "detail": "Explain what needs to be corrected.",
  "code": "INVALID_ARTIFACT",
  "fieldErrors": [{ "field": "artifact.sections", "message": "Required section is missing." }]
}
```

Never return stack traces, API keys or provider credentials to the browser.
