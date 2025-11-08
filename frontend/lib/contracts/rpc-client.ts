import { createPublicClient, http, PublicClient } from 'viem';
import { BASE_CHAIN, ENVIRONMENT } from './config';

// Cache for storing contract call results
const contractCallCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds cache

// RPC client with retry logic and fallback endpoints
let currentRpcIndex = 0;

/**
 * Create a public client with retry logic and fallback RPC endpoints
 */
export function createResilientPublicClient(): PublicClient {
  const rpcUrl = ENVIRONMENT.RPC_URLS[currentRpcIndex % ENVIRONMENT.RPC_URLS.length];

  return createPublicClient({
    chain: BASE_CHAIN,
    transport: http(rpcUrl, {
      timeout: 10000, // 10 second timeout
      retryCount: 2,
      retryDelay: 1000, // 1 second delay between retries
    }),
  });
}

/**
 * Execute a contract read with caching and retry logic
 */
export async function cachedContractRead<T>(
  cacheKey: string,
  contractCall: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  // Check cache first
  const cached = contractCallCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as T;
  }

  let lastError: Error | null = null;

  // Try with different RPC endpoints
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await contractCall();

      // Cache the successful result
      contractCallCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If it's a rate limit error (429), try next RPC endpoint
      if (error instanceof Error && (error.message.includes('rate limit') || error.message.includes('429'))) {
        currentRpcIndex = (currentRpcIndex + 1) % ENVIRONMENT.RPC_URLS.length;
        console.warn(`Rate limit hit, switching to RPC endpoint ${currentRpcIndex + 1}`);

        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }

      // For other errors, throw immediately
      throw error;
    }
  }

  throw lastError || new Error('All RPC endpoints failed');
}

/**
 * Batch multiple contract reads with delay between calls to avoid rate limits
 */
export async function batchContractReads<T>(
  calls: Array<{ key: string; call: () => Promise<T> }>,
  delayMs: number = 100
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < calls.length; i++) {
    const { key, call } = calls[i];

    try {
      const result = await cachedContractRead(key, call);
      results.push(result);

      // Add delay between calls to avoid rate limits (except for last call)
      if (i < calls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Failed to execute batch call ${i}:`, error);
      throw error;
    }
  }

  return results;
}

/**
 * Clear the contract call cache
 */
export function clearContractCache(): void {
  contractCallCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: contractCallCache.size,
    keys: Array.from(contractCallCache.keys())
  };
}
