/**
 * Simple semaphore that limits the number of concurrent async operations.
 * Excess requests are queued and executed as slots become available.
 */
export class Semaphore {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly maxConcurrent: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.maxConcurrent) {
      this.running++;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) {
      this.running++;
      next();
    }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

// Global semaphore for S3 image fetches — max 20 concurrent requests
const globalForSemaphore = globalThis as unknown as {
  s3Semaphore: Semaphore | undefined;
};

export const s3Semaphore =
  globalForSemaphore.s3Semaphore ?? new Semaphore(20);

if (process.env.NODE_ENV !== "production") {
  globalForSemaphore.s3Semaphore = s3Semaphore;
}
