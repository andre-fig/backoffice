export async function fetchJson<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export async function postJson<T = unknown>(
  url: string,
  data: unknown
): Promise<T> {
  return fetchJson<T>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

export async function deleteRequest<T = unknown>(url: string): Promise<T> {
  return fetchJson<T>(url, {
    method: 'DELETE',
  });
}
