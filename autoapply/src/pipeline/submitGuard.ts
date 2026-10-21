import { isRetryableFailure } from "./retry.js";

export function isAlreadySentSubmitError(error: string): boolean {
  return /unconfirmed submit|already submitted|already been submitted/i.test(error);
}

export function nextStatusAfterSubmitFail(opts: {
  wasQueued: boolean;
  error: string;
  spam: boolean;
}): "queued_submit" | "pending_approval" | "failed" {
  if (opts.spam) return "pending_approval";
  if (isAlreadySentSubmitError(opts.error)) return "failed";
  if (/empty|missing|flagged fields|conditional required|validation/i.test(opts.error)) {
    return "pending_approval";
  }
  if (opts.wasQueued && isRetryableFailure(opts.error)) return "queued_submit";
  return "pending_approval";
}
