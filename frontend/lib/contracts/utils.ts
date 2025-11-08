import { TransactionStatus } from './types';

/**
 * Formats a transaction hash for display
 * @param hash - The transaction hash
 * @returns Formatted hash string
 */
export function formatTransactionHash(hash: string): string {
  if (hash.length < 10) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

/**
 * Creates a block explorer URL for a transaction
 * @param hash - The transaction hash
 * @param chainId - The chain ID (optional, defaults to mainnet)
 * @returns Block explorer URL
 */
export function getTransactionUrl(hash: string, chainId: number = 1): string {
  // For local development, we might not have a block explorer
  // This is a placeholder that could be configured per environment
  if (chainId === 31337) {
    // Local hardhat/anvil chain
    return `#${hash}`;
  }

  // Ethereum mainnet
  return `https://etherscan.io/tx/${hash}`;
}

/**
 * Validates if an address is a valid Ethereum address
 * @param address - The address to validate
 * @returns boolean indicating if address is valid
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Creates initial transaction status
 * @returns Initial TransactionStatus object
 */
export function createInitialTransactionStatus(): TransactionStatus {
  return {
    status: 'idle',
  };
}

/**
 * Updates transaction status to pending
 * @param hash - The transaction hash
 * @returns TransactionStatus object with pending status
 */
export function createPendingTransactionStatus(hash: string): TransactionStatus {
  return {
    status: 'pending',
    hash,
  };
}

/**
 * Updates transaction status to success
 * @param hash - The transaction hash
 * @returns TransactionStatus object with success status
 */
export function createSuccessTransactionStatus(hash: string): TransactionStatus {
  return {
    status: 'success',
    hash,
  };
}

/**
 * Updates transaction status to error
 * @param error - The error message
 * @param hash - The transaction hash (optional)
 * @returns TransactionStatus object with error status
 */
export function createErrorTransactionStatus(error: string, hash?: string): TransactionStatus {
  return {
    status: 'error',
    error,
    hash,
  };
}
