// Contract interaction types
export interface DeploymentResult {
  success: boolean;
  transactionHash?: string;
  contractAddresses?: {
    community?: string;
    nft?: string;
    governance?: string;
  };
  error?: string;
}

export interface TransactionStatus {
  status: 'idle' | 'pending' | 'success' | 'error';
  hash?: string;
  error?: string;
}

// Factory contract ABI - extracted from the actual contract
export const FACTORY_ABI = [
  {
    type: "function",
    name: "createCommunity",
    inputs: [
      {
        name: "cfg",
        type: "tuple",
        internalType: "struct CommunityFactory.DeploymentConfig",
        components: [
          { name: "name", type: "string", internalType: "string" },
          { name: "symbol", type: "string", internalType: "string" },
          { name: "baseURI", type: "string", internalType: "string" },
          { name: "creator", type: "address", internalType: "address" },
          { name: "maxSupply", type: "uint256", internalType: "uint256" },
          { name: "votingDelay", type: "uint48", internalType: "uint48" },
          { name: "votingPeriod", type: "uint32", internalType: "uint32" },
          { name: "proposalThreshold", type: "uint256", internalType: "uint256" },
          { name: "quorumNumerator", type: "uint256", internalType: "uint256" },
          { name: "deployTimelock", type: "bool", internalType: "bool" },
          { name: "metadataURI", type: "string", internalType: "string" }
        ]
      }
    ],
    outputs: [
      { name: "communityId", type: "uint256", internalType: "uint256" },
      { name: "nft", type: "address", internalType: "address" },
      { name: "governor", type: "address", internalType: "address" },
      { name: "timelock", type: "address", internalType: "address" }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "event",
    name: "CommunityCreated",
    inputs: [
      { name: "creator", type: "address", indexed: true, internalType: "address" },
      { name: "communityId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "nft", type: "address", indexed: false, internalType: "address" },
      { name: "governor", type: "address", indexed: false, internalType: "address" },
      { name: "timelock", type: "address", indexed: false, internalType: "address" }
    ],
    anonymous: false
  }
] as const;
