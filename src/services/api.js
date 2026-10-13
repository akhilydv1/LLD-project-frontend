const rawBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').trim();

export const API_BASE = rawBase.replace(/\/+$/, '');
export const API_ENABLED = Boolean(API_BASE);

export const LEARNER_ID = (
  import.meta.env.VITE_LEARNER_ID ||
  'd847c7fe-2d42-49d4-8e4d-dde0acbbfd6a'
).trim();

function endpoint(path) {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

async function request(path, options = {}) {
  if (!API_ENABLED) {
    throw new Error('API base URL is missing. Check your frontend .env file.');
  }

  const headers = new Headers(options.headers || {});

  headers.set('X-Learner-Id', LEARNER_ID);

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  let response;

  try {
    response = await fetch(endpoint(path), {
      ...options,
      headers,
    });
  } catch (error) {
    const networkError = new Error(
      'Backend se connect nahi ho pa raha. Spring Boot aur CORS configuration check karo.'
    );
    networkError.cause = error;
    networkError.status = 0;
    throw networkError;
  }

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.message ||
      data?.title ||
      `Request failed (${response.status})`;

    const error = new Error(message);
    error.status = response.status;
    error.payload = data;

    throw error;
  }

  return data;
}

function normalizeArray(data, keys = []) {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  if (Array.isArray(data?.content)) return data.content;

  return [];
}

export const api = {
  async listProblems() {
    const data = await request('/api/v1/problems');
    return normalizeArray(data, ['problems', 'items']);
  },

  getProblem(problemId) {
    return request(
      `/api/v1/problems/${encodeURIComponent(problemId)}`
    );
  },

  createAttempt(problemId, submissionFormat = 'TEXT') {
    return request('/api/v1/attempts', {
      method: 'POST',
      body: JSON.stringify({
        problemId,
        submissionFormat,
      }),
    });
  },

  saveDraft(attemptId, expectedRevision, artifact) {
    return request(
      `/api/v1/attempts/${encodeURIComponent(attemptId)}/draft`,
      {
        method: 'PUT',
        body: JSON.stringify({
          expectedRevision,
          artifact,
        }),
      }
    );
  },

  async uploadAttachment(attemptId, file, kind, notes = '') {
    const form = new FormData();

    form.append('file', file);
    form.append('kind', kind);
    form.append('notes', notes);

    return request(
      `/api/v1/attempts/${encodeURIComponent(attemptId)}/attachments`,
      {
        method: 'POST',
        body: form,
      }
    );
  },

  submitAttempt(attemptId) {
    const idempotencyKey =
      globalThis.crypto?.randomUUID?.() ||
      `submit-${Date.now()}`;

    return request(
      `/api/v1/attempts/${encodeURIComponent(attemptId)}/submit`,
      {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      }
    );
  },

  getAttempt(attemptId) {
    return request(
      `/api/v1/attempts/${encodeURIComponent(attemptId)}`
    );
  },

  retryEvaluation(attemptId) {
    return request(
      `/api/v1/attempts/${encodeURIComponent(attemptId)}/retry-evaluation`,
      {
        method: 'POST',
      }
    );
  },

  getFeedback(attemptId) {
    return request(
      `/api/v1/attempts/${encodeURIComponent(attemptId)}/feedback`
    );
  },

  async listAttempts() {
    const data = await request('/api/v1/attempts');
    return normalizeArray(data, ['attempts', 'items']);
  },
};

export function displayApiError(error) {
  if (error?.status === 0 || error instanceof TypeError) {
    return 'Backend se connect nahi ho pa raha. Check karo Spring Boot chal raha hai aur CORS configured hai.';
  }

  return error?.message || 'Something went wrong. Please try again.';
}