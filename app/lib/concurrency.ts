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

/**
 * Serializes async operations that share the same key, so read-modify-write
 * sequences against the same S3 JSON object (e.g. _albums.json, images.json)
 * don't race with concurrent writes and clobber each other.
 */
export class KeyedMutex {
  private tails = new Map<string, Promise<void>>();

  async runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const tail = this.tails.get(key) ?? Promise.resolve();
    let releaseNext!: () => void;
    const next = new Promise<void>((resolve) => {
      releaseNext = resolve;
    });
    this.tails.set(key, tail.then(() => next));

    await tail;
    try {
      return await fn();
    } finally {
      releaseNext();
    }
  }
}

const globalForConcurrency = globalThis as unknown as {
  s3Semaphore: Semaphore | undefined;
  processingSemaphore: Semaphore | undefined;
  jsonMutex: KeyedMutex | undefined;
};

// Global semaphore for S3 image fetches — max 20 concurrent requests
export const s3Semaphore =
  globalForConcurrency.s3Semaphore ?? new Semaphore(20);

// Global semaphore for CPU-bound Sharp/BlurHash processing — kept separate
// from s3Semaphore so image processing can't starve regular image serving
export const processingSemaphore =
  globalForConcurrency.processingSemaphore ?? new Semaphore(4);

// Global mutex protecting read-modify-write sequences on S3 JSON metadata
export const jsonMutex = globalForConcurrency.jsonMutex ?? new KeyedMutex();

if (process.env.NODE_ENV !== "production") {
  globalForConcurrency.s3Semaphore = s3Semaphore;
  globalForConcurrency.processingSemaphore = processingSemaphore;
  globalForConcurrency.jsonMutex = jsonMutex;
}
