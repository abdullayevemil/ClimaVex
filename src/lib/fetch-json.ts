export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    let message = "Request failed.";

    try {
      const body = (await response.json()) as { error?: string };
      message = body.error ?? message;
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
