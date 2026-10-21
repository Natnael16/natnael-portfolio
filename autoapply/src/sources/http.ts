/** Shared fetch for public job APIs: timeout, an honest user agent, and errors that ingest retry can read. */

const DEFAULT_UA = "autoapply/0.1 (personal job search; one request per board per run)";

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export async function fetchText(
  url: string,
  opts: { headers?: Record<string, string>; timeoutMs?: number } = {},
): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": DEFAULT_UA, ...opts.headers },
    signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
    redirect: "follow",
  });
  const body = await res.text();
  if (!res.ok) {
    throw new HttpError(`${res.status} from ${new URL(url).host}: ${body.slice(0, 200)}`, res.status);
  }
  return body;
}

export async function fetchJson<T>(
  url: string,
  opts: { headers?: Record<string, string>; timeoutMs?: number } = {},
): Promise<T> {
  const body = await fetchText(url, { ...opts, headers: { accept: "application/json", ...opts.headers } });
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(`Non-JSON response from ${new URL(url).host}: ${body.slice(0, 120)}`);
  }
}
