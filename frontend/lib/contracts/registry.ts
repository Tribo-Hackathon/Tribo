import { createPublicClient, http } from 'viem';
import { BASE_CHAIN, CONTRACT_ADDRESSES, ENVIRONMENT } from './config';

// Community Registry ABI - extracted from CommunityRegistry.json
const REGISTRY_ABI = [
  {
    type: "function",
    name: "getAllCommunities",
    inputs: [],
    outputs: [
      {
        name: "communities",
        type: "tuple[]",
        internalType: "struct CommunityRegistry.Community[]",
        components: [
          { name: "communityId", type: "uint256", internalType: "uint256" },
          { name: "creator", type: "address", internalType: "address" },
          { name: "nft", type: "address", internalType: "address" },
          { name: "governor", type: "address", internalType: "address" },
          { name: "timelock", type: "address", internalType: "address" },
          { name: "metadataURI", type: "string", internalType: "string" },
          { name: "createdAt", type: "uint64", internalType: "uint64" }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getCommunity",
    inputs: [
      { name: "communityId", type: "uint256", internalType: "uint256" }
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct CommunityRegistry.Community",
        components: [
          { name: "communityId", type: "uint256", internalType: "uint256" },
          { name: "creator", type: "address", internalType: "address" },
          { name: "nft", type: "address", internalType: "address" },
          { name: "governor", type: "address", internalType: "address" },
          { name: "timelock", type: "address", internalType: "address" },
          { name: "metadataURI", type: "string", internalType: "string" },
          { name: "createdAt", type: "uint64", internalType: "uint64" }
        ]
      }
    ],
    stateMutability: "view"
  }
] as const;

// Community interface matching the contract struct
export interface Community {
  communityId: bigint;
  creator: string;
  nft: string;
  governor: string;
  timelock: string;
  metadataURI: string;
  createdAt: bigint;
}

/**
 * Get all communities from the registry with retry logic for rate limits
 * @returns Promise<Community[]> - Array of all communities
 */
export async function getAllCommunities(): Promise<Community[]> {
  const publicClient = createPublicClient({
    chain: BASE_CHAIN,
    transport: http(ENVIRONMENT.RPC_URL),
  });

  const MAX_RETRIES = 3;
  const INITIAL_DELAY = 1000; // 1 second

  // Helper function to check if error is a rate limit error
  const isRateLimitError = (error: unknown): boolean => {
    if (error instanceof Error) {
      return error.message.includes('429') ||
             error.message.includes('rate limit') ||
             error.message.includes('over rate limit');
    }
    const errorCode = (error as { code?: number })?.code;
    return errorCode === -32016;
  };

  // Retry logic with exponential backoff
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const communities = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.REGISTRY,
        abi: REGISTRY_ABI,
        functionName: 'getAllCommunities',
      }) as Community[];

      return communities;
    } catch (error) {
      const isRateLimit = isRateLimitError(error);

      // If it's the last attempt or not a rate limit error, throw
      if (attempt === MAX_RETRIES - 1 || !isRateLimit) {
        console.error('Failed to fetch all communities:', error);
        // For rate limit errors on last attempt, return empty array gracefully
        if (isRateLimit) {
          console.warn('Rate limit hit, returning empty array. Please try again later.');
          return [];
        }
        // For other errors, also return empty array to prevent crashes
        return [];
      }

      // Calculate exponential backoff delay
      const delay = INITIAL_DELAY * Math.pow(2, attempt);
      console.warn(`Rate limit error (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delay}ms...`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but return empty array as fallback
  return [];
}

/**
 * Get a specific community by ID
 * @param communityId - The community ID to fetch
 * @returns Promise<Community | null> - The community data or null if not found
 */
export async function getCommunity(communityId: bigint): Promise<Community | null> {
  try {
    const publicClient = createPublicClient({
      chain: BASE_CHAIN,
      transport: http(ENVIRONMENT.RPC_URL),
    });

    const community = await cachedContractRead(
      cacheKey,
      () => publicClient.readContract({
        address: CONTRACT_ADDRESSES.REGISTRY,
        abi: REGISTRY_ABI,
        functionName: 'getCommunity',
        args: [communityId],
      })
    ) as Community;

    return community;
  } catch (error) {
    console.error('Failed to fetch community:', error);
    return null;
  }
}

/**
 * Get community by creator address
 * @param creatorAddress - The creator's wallet address
 * @returns Promise<Community | null> - The community created by this address or null
 */
export async function getCommunityByCreator(creatorAddress: string): Promise<Community | null> {
  try {
    const allCommunities = await getAllCommunities();

    // Find the community created by this address
    const community = allCommunities.find(
      c => c.creator.toLowerCase() === creatorAddress.toLowerCase()
    );

    return community || null;
  } catch (error) {
    console.error('Failed to fetch community by creator:', error);
    return null;
  }
}

/**
 * Check if a creator has already created a community
 * @param creatorAddress - The creator's wallet address
 * @returns Promise<boolean> - True if the creator has a community
 */
export async function hasCreatedCommunity(creatorAddress: string): Promise<boolean> {
  try {
    const community = await getCommunityByCreator(creatorAddress);
    return community !== null;
  } catch (error) {
    console.error('Failed to check if creator has community:', error);
    return false;
  }
}
