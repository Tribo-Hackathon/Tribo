import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { BASE_CHAIN, ENVIRONMENT } from './config';
import { getCommunity, Community } from './registry';

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
  // NEW: Dynamic pricing functions
  {
    inputs: [],
    name: "getMintPrice",
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "mintPriceUSD",
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "priceFeed",
    outputs: [{ name: "", type: "address", internalType: "contract AggregatorV3Interface" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "newPriceUSD", type: "uint256", internalType: "uint256" }],
    name: "setMintPriceUSD",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Existing functions
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
  mintPriceUSD?: bigint;
  priceFeedAddress?: string;
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

    const publicClient = createPublicClient({
      chain: BASE_CHAIN,
      transport: http(ENVIRONMENT.RPC_URL),
    });

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

    // Fetch essential NFT details first (name and symbol are required)
    // Use sequential calls with delays to avoid rate limits
    let nftName: string;
    let nftSymbol: string;

    try {
      nftName = await publicClient.readContract({
        address: community.nft as `0x${string}`,
        abi: ACCESS_NFT_ABI,
        functionName: 'name',
      }) as string;

      // Small delay between calls
      await new Promise(resolve => setTimeout(resolve, 100));

      nftSymbol = await publicClient.readContract({
        address: community.nft as `0x${string}`,
        abi: ACCESS_NFT_ABI,
        functionName: 'symbol',
      }) as string;
    } catch (error) {
      if (isRateLimitError(error)) {
        throw new Error('Rate limit exceeded while fetching essential NFT data. Please try again later.');
      }
      throw error;
    }

    // Fetch pricing data with error handling - these are optional and can fail due to rate limits
    let mintPrice: bigint | undefined;
    let mintPriceUSD: bigint | undefined;
    let priceFeedAddress: string | undefined;

    // Add delays between optional calls to reduce rate limit pressure
    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      mintPrice = await publicClient.readContract({
        address: community.nft as `0x${string}`,
        abi: ACCESS_NFT_ABI,
        functionName: 'getMintPrice',
      }) as bigint;
    } catch (error) {
      console.warn('Failed to fetch mint price (may be rate limited):', error);
      // Continue without mint price
    }

    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      mintPriceUSD = await publicClient.readContract({
        address: community.nft as `0x${string}`,
        abi: ACCESS_NFT_ABI,
        functionName: 'mintPriceUSD',
      }) as bigint;
    } catch (error) {
      console.warn('Failed to fetch mint price USD (may be rate limited):', error);
      // Continue without USD price
    }

    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      priceFeedAddress = await publicClient.readContract({
        address: community.nft as `0x${string}`,
        abi: ACCESS_NFT_ABI,
        functionName: 'priceFeed',
      }) as string;
    } catch (error) {
      console.warn('Failed to fetch price feed address (may be rate limited):', error);
      // Continue without price feed address
    }

    return {
      ...community,
      nftName,
      nftSymbol,
      mintPrice,
      mintPriceUSD,
      priceFeedAddress,
    };
  } catch (error) {
    console.error('Failed to fetch community data:', error);

    // Re-throw rate limit errors so they can be handled properly by the UI
    if (error instanceof Error && error.message.includes('Rate limit')) {
      throw error;
    }

    return null;
  }
}

/**
 * Check NFT balance for a user in a specific community with retry logic for rate limits
 * @param userAddress - The user's wallet address
 * @param nftAddress - The NFT contract address
 * @returns Promise<bigint> - The user's NFT balance
 */
export async function checkNFTBalance(userAddress: string, nftAddress: string): Promise<bigint> {
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
      const balance = await publicClient.readContract({
        address: nftAddress as `0x${string}`,
        abi: ACCESS_NFT_ABI,
        functionName: 'balanceOf',
        args: [userAddress as `0x${string}`],
      });

      return balance as bigint;
    } catch (error) {
      const isRateLimit = isRateLimitError(error);

      // If it's the last attempt or not a rate limit error, return 0
      if (attempt === MAX_RETRIES - 1 || !isRateLimit) {
        if (isRateLimit) {
          console.warn('Rate limit hit when checking NFT balance, returning 0. Please try again later.');
        } else {
          console.error('Failed to check NFT balance:', error);
        }
        // Return 0 as default (user doesn't have NFT)
        return BigInt(0);
      }

      // Calculate exponential backoff delay
      const delay = INITIAL_DELAY * Math.pow(2, attempt);
      console.warn(`Rate limit error when checking NFT balance (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delay}ms...`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but return 0 as fallback
  return BigInt(0);
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
 * Mint an NFT for a community (now uses dynamic pricing)
 * @param nftAddress - The NFT contract address
 * @returns Promise<string> - Transaction hash
 */
export async function mintNFT(nftAddress: string): Promise<string> {
  try {
    // Check if MetaMask is available
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not found. Please install MetaMask.');
    }

    // Create clients
    const walletClient = createWalletClient({
      chain: BASE_CHAIN,
      transport: custom(window.ethereum),
    });

    const publicClient = createPublicClient({
      chain: BASE_CHAIN,
      transport: http(ENVIRONMENT.RPC_URL),
    });

    // Get the connected account
    const [account] = await walletClient.getAddresses();
    if (!account) {
      throw new Error('No wallet connected');
    }

    // Get current mint price from contract
    const mintPrice = await publicClient.readContract({
      address: nftAddress as `0x${string}`,
      abi: ACCESS_NFT_ABI,
      functionName: 'getMintPrice',
    }) as bigint;

    // Execute the mint transaction with dynamic price
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

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('InvalidPriceFeed')) {
        throw new Error('Price feed unavailable. Please try again later.');
      } else if (error.message.includes('InvalidMintValue')) {
        throw new Error('Incorrect payment amount. Please refresh and try again.');
      }
    }

    throw error;
  }
}

/**
 * Get current mint price for a community's NFT (dynamic pricing)
 * @param nftAddress - The NFT contract address
 * @returns Promise<bigint> - The current mint price in wei
 */
export async function getMintPrice(nftAddress: string): Promise<bigint> {
  try {
    const publicClient = createPublicClient({
      chain: BASE_CHAIN,
      transport: http(ENVIRONMENT.RPC_URL),
    });

    const price = await publicClient.readContract({
      address: nftAddress as `0x${string}`,
      abi: ACCESS_NFT_ABI,
      functionName: 'getMintPrice',
    });

    return price as bigint;
  } catch (error) {
    console.error('Failed to get mint price:', error);
    return BigInt(0);
  }
}
