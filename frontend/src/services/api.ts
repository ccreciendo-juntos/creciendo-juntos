const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:4000/api/v1' 
  : 'https://creciendo-juntos-api.creciendojuntos.workers.dev/api/v1';

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export const request = async <T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<ApiResponse<T>> => {
  const token = localStorage.getItem('cj_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const result = await response.json();
    return result as ApiResponse<T>;
  } catch (err: any) {
    console.error('Fetch error:', err);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'No se pudo establecer conexión con el servidor. Intente nuevamente.'
      }
    };
  }
};
