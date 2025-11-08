import { createPublicClient, http } from 'viem';
import { ANVIL_CHAIN, CONTRACT_ADDRESSES, ENVIRONMENT } from './config';

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
 * Get all communities from the registry
 * @returns Promise<Community[]> - Array of all communities
 */
export async function getAllCommunities(): Promise<Community[]> {
  try {
    const publicClient = createPublicClient({
      chain: ANVIL_CHAIN,
      transport: http(ENVIRONMENT.RPC_URL),
    });

    const communities = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.REGISTRY,
      abi: REGISTRY_ABI,
      functionName: 'getAllCommunities',
    }) as Community[];

    return communities;
  } catch (error) {
    console.error('Failed to fetch all communities:', error);
    return [];
  }
}

/**
 * Get a specific community by ID
 * @param communityId - The community ID to fetch
 * @returns Promise<Community | null> - The community data or null if not found
 */
export async function getCommunity(communityId: bigint): Promise<Community | null> {
  try {
    const publicClient = createPublicClient({
      chain: ANVIL_CHAIN,
      transport: http(ENVIRONMENT.RPC_URL),
    });

    const community = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.REGISTRY,
      abi: REGISTRY_ABI,
      functionName: 'getCommunity',
      args: [communityId],
    }) as Community;

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
