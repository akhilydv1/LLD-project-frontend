const configuredBase = (import.meta.env.VITE_API_BASE_URL || "").trim();

const rawBase =
  configuredBase ||
  (import.meta.env.DEV ? "http://localhost:8080" : "");

export const API_BASE = rawBase.replace(/\/+$/, "");
export const API_ENABLED = Boolean(API_BASE);

// Backend's configured demo learner ID.
// Replace this with the actual learner ID when user-specific identity is implemented.
const LEARNER_ID = "d847c7fe-2d42-49d4-8e4d-dde0acbbfd6a";

console.log("API_BASE:", API_BASE);

export function displayApiError(error) {
  if (error?.status === 0 || error instanceof TypeError) {
    return "Unable to connect to the backend. Please check the server URL and try again.";
  }

  return error?.message || "Something went wrong. Please try again.";
}

export async function apiRequest(path, options = {}) {
  if (!API_ENABLED) {
    throw new Error(
      "Backend URL is not configured. Set VITE_API_BASE_URL in Vercel."
    );
  }

  const headers = {
    Accept: "application/json",
    "X-Learner-Id": LEARNER_ID,
    ...options.headers,
  };

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch (cause) {
    const error = new Error(
      "Unable to connect to the backend. Please check the server URL and try again."
    );
    error.status = 0;
    error.cause = cause;
    throw error;
  }

  const contentType = response.headers.get("content-type") || "";
  let data = null;

  if (response.status !== 204) {
    try {
      data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message =
      (typeof data === "string" && data) ||
      data?.detail ||
      data?.message ||
      data?.error ||
      `Request failed with status ${response.status}.`;

    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

const jsonBody = (value) => JSON.stringify(value);

export const api = {
  listProblems() {
    return apiRequest("/api/v1/problems");
  },

  listAttempts() {
    return apiRequest("/api/v1/attempts");
  },

  createAttempt(problemId, mode) {
    return apiRequest("/api/v1/attempts", {
      method: "POST",
      body: jsonBody({
        problemId,
        format: mode === "TEXT" ? "STRUCTURED_TEXT" : mode,
      }),
    });
  },

  saveDraft(id, revision, artifact) {
    return apiRequest(
      `/api/v1/attempts/${encodeURIComponent(id)}/draft`,
      {
        method: "PUT",
        body: jsonBody({
          expectedRevision: revision,
          artifact,
        }),
      }
    );
  },

  uploadAttachment(id, file, kind, notes = "") {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    form.append("notes", notes);

    return apiRequest(
      `/api/v1/attempts/${encodeURIComponent(id)}/attachments`,
      {
        method: "POST",
        body: form,
      }
    );
  },

  getAttempt(id) {
    return apiRequest(`/api/v1/attempts/${encodeURIComponent(id)}`);
  },

  submitAttempt(id) {
    return apiRequest(
      `/api/v1/attempts/${encodeURIComponent(id)}/submit`,
      {
        method: "POST",
        headers: {
          "Idempotency-Key": crypto.randomUUID(),
        },
      }
    );
  },

  getFeedback(id) {
    return apiRequest(
      `/api/v1/attempts/${encodeURIComponent(id)}/feedback`
    );
  },

  retryEvaluation(id) {
    return apiRequest(
      `/api/v1/attempts/${encodeURIComponent(id)}/retry-evaluation`,
      {
        method: "POST",
      }
    );
  },
};