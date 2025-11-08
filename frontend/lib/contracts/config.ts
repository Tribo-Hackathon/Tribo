import { base } from 'viem/chains';

// Contract addresses on Base network
export const CONTRACT_ADDRESSES = {
  FACTORY: "0x897FFD5c0E830dC6F5C29aD648e6Ae00e8d6e900" as const,
  REGISTRY: "0x5c9ECC849e954aFDc7Ff2Ca22D09b9033060D9d9" as const,
  NFT: "0x0000000000000000000000000000000000000000" as const, // Will be deployed dynamically
  GOV: "0x0000000000000000000000000000000000000000" as const, // Will be deployed dynamically
} as const;

// Base chain configuration (imported from viem/chains)
export const BASE_CHAIN = base;

// Environment configuration for Base network
export const ENVIRONMENT = {
  RPC_URL: BASE_CHAIN.rpcUrls.default.http[0],
  CHAIN_ID: BASE_CHAIN.id,
  // Private key will be provided by MetaMask
  // Creator address will be provided by MetaMask
} as const;
