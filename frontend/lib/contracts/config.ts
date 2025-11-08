// Contract addresses configuration
export const CONTRACT_ADDRESSES = {
  FACTORY: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853" as const,
  REGISTRY: "0x0433d874a28147DB0b330C000fcC50C0f0BaF425" as const,
  NFT: "0xb14D33721D921fA72Eae56EfE9149caF7C7f2736" as const,
  GOV: "0x67142Aa1328d0773E9e2C42588693a090Aed934C" as const,
} as const;

// Custom Anvil chain configuration
export const ANVIL_CHAIN = {
  id: 31337,
  name: 'Anvil',
  network: 'anvil',
  nativeCurrency: {
    decimals: 18,
    name: 'GO',
    symbol: 'GO',
  },
  rpcUrls: {
    default: { http: ['https://a949fa5aa577.ngrok-free.app'] },
    public: { http: ['https://a949fa5aa577.ngrok-free.app'] },
  },
  blockExplorers: {
    default: { name: 'Local', url: '#' }, // No block explorer for local chain
  },
} as const;

// Environment configuration
export const ENVIRONMENT = {
  RPC_URL: "https://a949fa5aa577.ngrok-free.app" as const,
  CHAIN_ID: 31337 as const,
  // Private key will be provided by MetaMask
  // Creator address will be provided by MetaMask
} as const;
