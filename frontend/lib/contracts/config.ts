// Contract addresses configuration
export const CONTRACT_ADDRESSES = {
  FACTORY: "0x897FFD5c0E830dC6F5C29aD648e6Ae00e8d6e900" as const,
  REGISTRY: "0x5c9ECC849e954aFDc7Ff2Ca22D09b9033060D9d9" as const,
} as const;

// Base mainnet chain configuration with multiple RPC endpoints for redundancy
export const BASE_CHAIN = {
  id: 8453,
  name: 'Base',
  network: 'base',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [
        'https://mainnet.base.org',
        'https://base-mainnet.public.blastapi.io',
        'https://base.gateway.tenderly.co'
      ]
    },
    public: {
      http: [
        'https://mainnet.base.org',
        'https://base-mainnet.public.blastapi.io',
        'https://base.gateway.tenderly.co'
      ]
    },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://basescan.org' },
  },
} as const;

// Environment configuration with fallback RPC URLs
export const ENVIRONMENT = {
  RPC_URLS: [
    "https://mainnet.base.org",
    "https://base-mainnet.public.blastapi.io",
    "https://base.gateway.tenderly.co"
  ] as const,
  CHAIN_ID: 8453 as const,
  // Private key will be provided by MetaMask
  // Creator address will be provided by MetaMask
} as const;
