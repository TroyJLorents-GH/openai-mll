let _getToken = null;

export function setTokenProvider(fn) {
  _getToken = fn;
}

export async function apiFetch(url, options = {}) {
  const headers = { ...options.headers };

  if (_getToken) {
    const token = await _getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return fetch(url, { ...options, headers });
}
