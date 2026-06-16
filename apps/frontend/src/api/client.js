const runtimeConfig = window.__AICLOUD_CONFIG__ || {};
const viteEnv = import.meta.env || {};

const STORAGE_KEYS = {
  auth: "aicloud.authApiBaseUrl",
  questionnaire: "aicloud.questionnaireApiBaseUrl",
  ai: "aicloud.aiApiBaseUrl",
  board: "aicloud.boardApiBaseUrl",
  hospital: "aicloud.hospitalApiBaseUrl",
};

const DEFAULT_BASE_URLS = {
  auth: "",
  questionnaire: "",
  ai: "",
  board: "",
  hospital: "",
};

// const DEFAULT_BASE_URLS = {
//   auth: "http://localhost:8081",
//   questionnaire: "http://localhost:8082",
//   ai: "http://localhost:8084",
//   board: "http://localhost:8083",
//   hospital: "http://localhost:8085",
// };

const ENV_KEYS = {
  auth: "VITE_AUTH_API_BASE_URL",
  questionnaire: "VITE_QUESTIONNAIRE_API_BASE_URL",
  ai: "VITE_AI_API_BASE_URL",
  board: "VITE_BOARD_API_BASE_URL",
  hospital: "VITE_HOSPITAL_API_BASE_URL",
};

export const SERVICE_LABELS = {
  auth: "auth-user-service",
  questionnaire: "questionnaire-service",
  ai: "ai-triage-service",
  board: "board-service",
  hospital: "hospital-recommendation-service",
};

export const TOKEN_KEY = "aicloud.accessToken";

function fromLocalStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return "";
  }
}

function normalizeStoredBaseUrl(service, value) {
  const fallback = DEFAULT_BASE_URLS[service];
  const normalized = String(value || "").replace(/\/$/, "");
  const sameOrigin = typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "";

  if (!normalized || normalized === sameOrigin) {
    try {
      window.localStorage.removeItem(STORAGE_KEYS[service]);
    } catch {
      // Ignore storage cleanup failures.
    }
    return "";
  }

  return normalized || fallback;
}

function resolveBaseUrl(service) {
  const envKey = ENV_KEYS[service];
  const value =
    normalizeStoredBaseUrl(service, fromLocalStorage(STORAGE_KEYS[service])) ||
    runtimeConfig[envKey] ||
    viteEnv[envKey] ||
    DEFAULT_BASE_URLS[service];

  return String(value || DEFAULT_BASE_URLS[service]).replace(/\/$/, "");
}

export const apiBaseUrls = {
  auth: resolveBaseUrl("auth"),
  questionnaire: resolveBaseUrl("questionnaire"),
  ai: resolveBaseUrl("ai"),
  board: resolveBaseUrl("board"),
  hospital: resolveBaseUrl("hospital"),
};

export function getToken() {
  return fromLocalStorage(TOKEN_KEY);
}

export function setToken(value) {
  window.localStorage.setItem(TOKEN_KEY, value);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(service, status, message) {
    super(message);
    this.name = "ApiError";
    this.service = service;
    this.status = status;
  }
}

function toRequestBody(body, headers) {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string" || body instanceof FormData) return body;
  headers["content-type"] = headers["content-type"] || "application/json";
  return JSON.stringify(body);
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  return text ? { message: text } : {};
}

export async function request(service, path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${apiBaseUrls[service]}${path}`, {
      ...options,
      headers,
      body: toRequestBody(options.body, headers),
    });
  } catch (error) {
    throw new ApiError(service, 0, error.message || "Network request failed");
  }

  const payload = await parseResponse(response);
  if (!response.ok) {
    throw new ApiError(service, response.status, payload.message || payload.error || response.statusText);
  }
  return payload;
}

export function friendlyApiError(error, fallbackService) {
  const service = SERVICE_LABELS[error?.service || fallbackService] || fallbackService || "API service";
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return `${service}에 연결할 수 없습니다. Docker 컨테이너가 실행 중인지 확인해 주세요.`;
    }
    if (error.status === 401) {
      return "로그인이 필요하거나 세션이 만료되었습니다. 다시 로그인해 주세요.";
    }
    if (error.status === 403) {
      return "접근 권한이 없습니다.";
    }
    return `${service} 요청에 실패했습니다. ${error.message}`;
  }
  return `${service} 요청 중 오류가 발생했습니다. ${error?.message || "알 수 없는 오류"}`;
}
