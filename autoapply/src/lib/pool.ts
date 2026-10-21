export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const width = Math.max(1, Math.min(concurrency, Math.max(items.length, 1)));

  async function worker() {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(width, items.length) }, () => worker()));
  return results;
}

export async function retryForever<T>(
  label: string,
  fn: () => Promise<T>,
  isRetryable: (err: unknown) => boolean,
  maxAttempts = 12,
): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (!isRetryable(err) || attempt === maxAttempts - 1) throw err;
      const wait = Math.min(60_000, 1500 * 2 ** attempt);
      console.warn(`${label}: retry ${attempt + 1} in ${wait}ms`);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  throw last;
}
