export function isRetryableFailure(error: string | null | undefined): boolean {
  if (!error) return false;
  if (/apply page not found|page you requested was not found/i.test(error)) return false;
  return /no form fields|extract|timeout|net::|cloudflare|did not load|navigation|JSON|Expected ','|Unexpected token|Unterminated|Model did not return JSON/i.test(
    error,
  );
}
