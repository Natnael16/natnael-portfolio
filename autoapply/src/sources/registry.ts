import type { JobSource } from "./types.js";
import { ashby } from "./ashby.js";

const sources: Record<string, JobSource> = {
  ashby,
};

export function getSource(id: string): JobSource {
  const src = sources[id];
  if (!src) {
    throw new Error(`Unknown job source "${id}". Register it in src/sources/registry.ts`);
  }
  return src;
}
