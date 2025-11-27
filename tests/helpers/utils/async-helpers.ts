/**
 * Async Test Helpers
 * 
 * Utilities for testing asynchronous operations
 */

/**
 * Create a deferred promise that can be resolved or rejected externally
 */
export class Deferred<T = void> {
  promise: Promise<T>;
  resolve!: (value: T | PromiseLike<T>) => void;
  reject!: (reason?: any) => void;
  
  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

/**
 * Wait for an event to be emitted
 */
export function waitForEvent<T = any>(
  emitter: any,
  eventName: string,
  timeout: number = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      emitter.removeListener(eventName, handler);
      reject(new Error(`Timeout waiting for event '${eventName}' after ${timeout}ms`));
    }, timeout);
    
    const handler = (data: T) => {
      clearTimeout(timer);
      resolve(data);
    };
    
    emitter.once(eventName, handler);
  });
}

/**
 * Collect events emitted within a time window
 */
export function collectEvents<T = any>(
  emitter: any,
  eventName: string,
  duration: number
): Promise<T[]> {
  return new Promise(resolve => {
    const events: T[] = [];
    const handler = (data: T) => events.push(data);
    
    emitter.on(eventName, handler);
    
    setTimeout(() => {
      emitter.removeListener(eventName, handler);
      resolve(events);
    }, duration);
  });
}

/**
 * Execute multiple async operations concurrently and collect results
 */
export async function concurrentMap<T, R>(
  items: T[],
  mapper: (item: T, index: number) => Promise<R>,
  concurrency: number = 10
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const queue = items.map((item, index) => ({ item, index }));
  
  async function worker() {
    while (queue.length > 0) {
      const work = queue.shift();
      if (work) {
        results[work.index] = await mapper(work.item, work.index);
      }
    }
  }
  
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  
  return results;
}

/**
 * Create a mock async function with controllable behavior
 */
export class MockAsyncFunction<T = any> {
  private calls: any[][] = [];
  private responses: Array<{ type: 'resolve' | 'reject', value: any }> = [];
  private defaultResponse?: { type: 'resolve' | 'reject', value: any };
  
  async call(...args: any[]): Promise<T> {
    this.calls.push(args);
    
    const response = this.responses.shift() || this.defaultResponse;
    if (!response) {
      throw new Error('No response configured for MockAsyncFunction');
    }
    
    if (response.type === 'reject') {
      throw response.value;
    }
    
    return response.value;
  }
  
  mockResolvedValue(value: T): this {
    this.defaultResponse = { type: 'resolve', value };
    return this;
  }
  
  mockRejectedValue(error: any): this {
    this.defaultResponse = { type: 'reject', value: error };
    return this;
  }
  
  mockResolvedValueOnce(value: T): this {
    this.responses.push({ type: 'resolve', value });
    return this;
  }
  
  mockRejectedValueOnce(error: any): this {
    this.responses.push({ type: 'reject', value: error });
    return this;
  }
  
  getCalls(): any[][] {
    return this.calls;
  }
  
  getCallCount(): number {
    return this.calls.length;
  }
  
  reset(): void {
    this.calls = [];
    this.responses = [];
    this.defaultResponse = undefined;
  }
}
