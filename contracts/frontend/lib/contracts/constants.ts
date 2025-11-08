// Default community parameters - hardcoded as requested
export const COMMUNITY_DEFAULTS = {
  NAME: "Builders Club" as const,
  SYMBOL: "BLDR" as const,
  BASE_URI: "ipfs://base-demo/" as const,

  // Default governance parameters based on the cast command
  MAX_SUPPLY: BigInt(0), // uint256 - 0 means unlimited
  VOTING_DELAY: 1, // uint48 - 1 block
  VOTING_PERIOD: 7200, // uint32 - ~1 day in blocks (assuming 12s blocks)
  PROPOSAL_THRESHOLD: BigInt(1), // uint256
  QUORUM_NUMERATOR: BigInt(5), // uint256 - 5%
  DEPLOY_TIMELOCK: false, // bool - whether to deploy timelock
  METADATA_URI: "", // string - empty metadata URI
} as const;

// Type for community creation parameters - matches the actual contract
export interface CommunityParams {
  name: string;
  symbol: string;
  baseURI: string;
  creator: `0x${string}`;
  maxSupply: bigint;
  votingDelay: number;
  votingPeriod: number;
  proposalThreshold: bigint;
  quorumNumerator: bigint;
  deployTimelock: boolean;
  metadataURI: string;
}
