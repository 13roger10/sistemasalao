// Base API configuration for salon services

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, string[]>;
}

export class ApiException extends Error {
  code: string;
  details?: Record<string, string[]>;

  constructor(error: ApiError) {
    super(error.message);
    this.code = error.code;
    this.details = error.details;
  }
}

// Generic fetch wrapper with error handling
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Get auth token from localStorage, trying multiple keys
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('salon_auth_token')
      || localStorage.getItem('auth_token')
      || null;

    // Debug log — SEC-014: nunca logar (nem parte do) token.
    console.log(`[API] ${options.method || 'GET'} ${url}`);
    console.log(`[API] Token found: ${token ? 'yes' : 'no'}`);
  }

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  console.log(`[API] Response: ${response.status} ${response.statusText}`);
  // SEC-014: não logar headers da resposta (podem conter Authorization/Set-Cookie).

  // Handle non-JSON responses
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    if (!response.ok) {
      // Try to get text response for debugging
      const textBody = await response.text().catch(() => '(no body)');
      console.error(`[API] Non-JSON error response: ${response.status}`, textBody);
      throw new ApiException({
        message: `Erro de servidor (${response.status}): ${textBody || response.statusText}`,
        code: 'SERVER_ERROR',
      });
    }
    return {} as T;
  }

  // Try to parse JSON
  let data;
  try {
    const textBody = await response.text();
    // SEC-014: não logar o corpo da resposta (pode conter tokens e PII).
    data = textBody ? JSON.parse(textBody) : {};
  } catch (parseError) {
    console.error(`[API] JSON parse error:`, parseError);
    throw new ApiException({
      message: 'Erro ao processar resposta do servidor',
      code: 'PARSE_ERROR',
    });
  }

  if (!response.ok) {
    // Map backend error fields to frontend format
    const fieldErrors = data.fieldErrors || data.details;
    let message = data.message || 'Erro desconhecido';

    // Append field error details to message for better debugging
    if (fieldErrors && Object.keys(fieldErrors).length > 0) {
      const errorDetails = Object.entries(fieldErrors)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join('; ');
      message = `${message} (${errorDetails})`;
    }

    console.error(`[API] Error response (${response.status}):`, data);
    throw new ApiException({
      message: `[HTTP ${response.status}] ${message}`,
      code: data.errorCode || data.code || 'UNKNOWN_ERROR',
      details: fieldErrors,
    });
  }

  console.log(`[API] Success response:`, data);
  return data;
}

// HTTP methods
export const api = {
  get: <T>(endpoint: string, params?: Record<string, unknown> | object): Promise<T> => {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return fetchApi<T>(url, { method: 'GET' });
  },

  post: <T>(endpoint: string, data?: unknown): Promise<T> => {
    return fetchApi<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  put: <T>(endpoint: string, data?: unknown): Promise<T> => {
    return fetchApi<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  patch: <T>(endpoint: string, data?: unknown): Promise<T> => {
    return fetchApi<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  delete: <T>(endpoint: string): Promise<T> => {
    return fetchApi<T>(endpoint, { method: 'DELETE' });
  },

  // Upload file
  upload: async <T>(
    endpoint: string,
    file: File,
    fieldName: string = 'file'
  ): Promise<T> => {
    const formData = new FormData();
    formData.append(fieldName, file);

    const token = typeof window !== 'undefined'
      ? localStorage.getItem('salon_auth_token')
      : null;

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiException({
        message: data.message || 'Erro no upload',
        code: data.code || 'UPLOAD_ERROR',
      });
    }

    return data;
  },
};

// Helper to build query string from filters
export function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    if (Array.isArray(value)) {
      value.forEach((v) => searchParams.append(key, String(v)));
    } else if (value instanceof Date) {
      searchParams.append(key, value.toISOString());
    } else if (typeof value === 'object') {
      searchParams.append(key, JSON.stringify(value));
    } else {
      searchParams.append(key, String(value));
    }
  });

  return searchParams.toString();
}
