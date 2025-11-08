import { createWalletClient, custom } from 'viem';
import { BASE_CHAIN } from './config';
import { getCommunity, Community } from './registry';
import { createResilientPublicClient, cachedContractRead, batchContractReads } from './rpc-client';

// AccessNFT ABI - key functions for checking balance and minting
const ACCESS_NFT_ABI = [
  {
    inputs: [{ name: "owner", type: "address", internalType: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "mint",
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "getMintPrice",
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view",
    type: "function",
  }
] as const;

// User role types
export type UserRole = 'creator' | 'visitor';

export interface CommunityData extends Community {
  nftName?: string;
  nftSymbol?: string;
  mintPrice?: bigint;
}

export interface UserCommunityStatus {
  role: UserRole;
  nftBalance: bigint;
  isCreator: boolean;
  canVote: boolean;
}

/**
 * Get comprehensive community data including NFT details
 * @param communityId - The community ID to fetch
 * @returns Promise<CommunityData | null> - Enhanced community data or null
 */
export async function getCommunityData(communityId: bigint): Promise<CommunityData | null> {
  try {
    const community = await getCommunity(communityId);
    if (!community) return null;

    const publicClient = createResilientPublicClient();
    const nftAddress = community.nft as `0x${string}`;

    // Create cache keys for each contract call
    const cacheKeyBase = `nft_${nftAddress}`;

    // Batch contract reads with caching and retry logic
    const [nftName, nftSymbol, mintPrice] = await batchContractReads([
      {
        key: `${cacheKeyBase}_name`,
        call: () => publicClient.readContract({
          address: nftAddress,
          abi: ACCESS_NFT_ABI,
          functionName: 'name',
        })
      },
      {
        key: `${cacheKeyBase}_symbol`,
        call: () => publicClient.readContract({
          address: nftAddress,
          abi: ACCESS_NFT_ABI,
          functionName: 'symbol',
        })
      },
      {
        key: `${cacheKeyBase}_mintPrice`,
        call: () => publicClient.readContract({
          address: nftAddress,
          abi: ACCESS_NFT_ABI,
          functionName: 'getMintPrice',
        })
      }
    ], 200); // 200ms delay between calls

    return {
      ...community,
      nftName: nftName as string,
      nftSymbol: nftSymbol as string,
      mintPrice: mintPrice as bigint,
    };
  } catch (error) {
    console.error('Failed to fetch community data:', error);
    return null;
  }
}

/**
 * Check NFT balance for a user in a specific community
 * @param userAddress - The user's wallet address
 * @param nftAddress - The NFT contract address
 * @returns Promise<bigint> - The user's NFT balance
 */
export async function checkNFTBalance(userAddress: string, nftAddress: string): Promise<bigint> {
  try {
    const publicClient = createResilientPublicClient();
    const cacheKey = `balance_${nftAddress}_${userAddress}`;

    const balance = await cachedContractRead(
      cacheKey,
      () => publicClient.readContract({
        address: nftAddress as `0x${string}`,
        abi: ACCESS_NFT_ABI,
        functionName: 'balanceOf',
        args: [userAddress as `0x${string}`],
      })
    );

    return balance as bigint;
  } catch (error) {
    console.error('Failed to check NFT balance:', error);
    return BigInt(0);
  }
}

/**
 * Check if a user is the creator of a community
 * @param userAddress - The user's wallet address
 * @param creatorAddress - The community creator's address
 * @returns boolean - True if the user is the creator
 */
export function isCreator(userAddress: string, creatorAddress: string): boolean {
  return userAddress.toLowerCase() === creatorAddress.toLowerCase();
}

/**
 * Get user's status and role in a community
 * @param userAddress - The user's wallet address
 * @param community - The community data
 * @returns Promise<UserCommunityStatus> - User's role and permissions
 */
export async function getUserCommunityStatus(
  userAddress: string,
  community: Community
): Promise<UserCommunityStatus> {
  try {
    const [nftBalance, userIsCreator] = await Promise.all([
      checkNFTBalance(userAddress, community.nft),
      Promise.resolve(isCreator(userAddress, community.creator))
    ]);

    const hasNFT = nftBalance > BigInt(0);

    let role: UserRole;
    if (userIsCreator) {
      role = 'creator';
    } else {
      role = 'visitor';
    }

    return {
      role,
      nftBalance,
      isCreator: userIsCreator,
      canVote: hasNFT || userIsCreator, // Both NFT holders and creators can vote
    };
  } catch (error) {
    console.error('Failed to get user community status:', error);
    return {
      role: 'visitor',
      nftBalance: BigInt(0),
      isCreator: false,
      canVote: false,
    };
  }
}

/**
 * Mint an NFT for a community
 * @param nftAddress - The NFT contract address
 * @param mintPrice - The price to mint (in wei)
 * @returns Promise<string> - Transaction hash
 */
export async function mintNFT(nftAddress: string, mintPrice: bigint): Promise<string> {
  try {
    // Check if MetaMask is available
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not found. Please install MetaMask.');
    }

    // Create wallet client with MetaMask
    const walletClient = createWalletClient({
      chain: BASE_CHAIN,
      transport: custom(window.ethereum),
    });

    // Get the connected account
    const [account] = await walletClient.getAddresses();
    if (!account) {
      throw new Error('No wallet connected');
    }

    // Execute the mint transaction
    const hash = await walletClient.writeContract({
      address: nftAddress as `0x${string}`,
      abi: ACCESS_NFT_ABI,
      functionName: 'mint',
      account,
      value: mintPrice,
    });

    return hash;
  } catch (error) {
    console.error('Failed to mint NFT:', error);
    throw error;
  }
}

/**
 * Get mint price for a community's NFT
 * @param nftAddress - The NFT contract address
 * @returns Promise<bigint> - The mint price in wei
 */
export async function getMintPrice(nftAddress: string): Promise<bigint> {
  try {
    const publicClient = createResilientPublicClient();
    const cacheKey = `mintPrice_${nftAddress}`;

    const price = await cachedContractRead(
      cacheKey,
      () => publicClient.readContract({
        address: nftAddress as `0x${string}`,
        abi: ACCESS_NFT_ABI,
        functionName: 'getMintPrice',
      })
    );

    return price as bigint;
  } catch (error) {
    console.error('Failed to get mint price:', error);
    return BigInt(0);
  }
}
