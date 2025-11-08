import { createPublicClient, createWalletClient, custom, http, parseAbiItem } from 'viem';
import { BASE_CHAIN, ENVIRONMENT } from './config';
import { cachedContractRead } from './rpc-client';

// Governor contract ABI - key functions for governance
const GOVERNOR_ABI = [
  // Proposal creation
  {
    inputs: [
      { name: "targets", type: "address[]", internalType: "address[]" },
      { name: "values", type: "uint256[]", internalType: "uint256[]" },
      { name: "calldatas", type: "bytes[]", internalType: "bytes[]" },
      { name: "description", type: "string", internalType: "string" }
    ],
    name: "propose",
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Voting
  {
    inputs: [
      { name: "proposalId", type: "uint256", internalType: "uint256" },
      { name: "support", type: "uint8", internalType: "uint8" }
    ],
    name: "castVote",
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "proposalId", type: "uint256", internalType: "uint256" },
      { name: "support", type: "uint8", internalType: "uint8" },
      { name: "reason", type: "string", internalType: "string" }
    ],
    name: "castVoteWithReason",
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Proposal state queries
  {
    inputs: [{ name: "proposalId", type: "uint256", internalType: "uint256" }],
    name: "state",
    outputs: [{ name: "", type: "uint8", internalType: "enum IGovernor.ProposalState" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "proposalId", type: "uint256", internalType: "uint256" }],
    name: "proposalDeadline",
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "proposalId", type: "uint256", internalType: "uint256" }],
    name: "proposalSnapshot",
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "proposalId", type: "uint256", internalType: "uint256" }],
    name: "proposalVotes",
    outputs: [
      { name: "againstVotes", type: "uint256", internalType: "uint256" },
      { name: "forVotes", type: "uint256", internalType: "uint256" },
      { name: "abstainVotes", type: "uint256", internalType: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  // Voting power
  {
    inputs: [
      { name: "account", type: "address", internalType: "address" },
      { name: "timepoint", type: "uint256", internalType: "uint256" }
    ],
    name: "getVotes",
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  // Thresholds
  {
    inputs: [],
    name: "proposalThreshold",
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  // Vote checking
  {
    inputs: [
      { name: "proposalId", type: "uint256", internalType: "uint256" },
      { name: "account", type: "address", internalType: "address" }
    ],
    name: "hasVoted",
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "proposalId", type: "uint256", internalType: "uint256" },
      { indexed: true, name: "proposer", type: "address", internalType: "address" },
      { indexed: false, name: "targets", type: "address[]", internalType: "address[]" },
      { indexed: false, name: "values", type: "uint256[]", internalType: "uint256[]" },
      { indexed: false, name: "signatures", type: "string[]", internalType: "string[]" },
      { indexed: false, name: "calldatas", type: "bytes[]", internalType: "bytes[]" },
      { indexed: false, name: "voteStart", type: "uint256", internalType: "uint256" },
      { indexed: false, name: "voteEnd", type: "uint256", internalType: "uint256" },
      { indexed: false, name: "description", type: "string", internalType: "string" }
    ],
    name: "ProposalCreated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "voter", type: "address", internalType: "address" },
      { indexed: false, name: "proposalId", type: "uint256", internalType: "uint256" },
      { indexed: false, name: "support", type: "uint8", internalType: "uint8" },
      { indexed: false, name: "weight", type: "uint256", internalType: "uint256" },
      { indexed: false, name: "reason", type: "string", internalType: "string" }
    ],
    name: "VoteCast",
    type: "event"
  }
] as const;

// Enums and Types
export enum ProposalState {
  PENDING = 0,
  ACTIVE = 1,
  CANCELED = 2,
  DEFEATED = 3,
  SUCCEEDED = 4,
  QUEUED = 5,
  EXPIRED = 6,
  EXECUTED = 7
}

export enum VoteSupport {
  AGAINST = 0,
  FOR = 1,
  ABSTAIN = 2
}

export enum ProposalType {
  TEXT_ONLY = 'text_only',
  TREASURY = 'treasury',
  PARAMETER_CHANGE = 'parameter',
  CUSTOM = 'custom'
}

export interface ProposalVotes {
  againstVotes: bigint;
  forVotes: bigint;
  abstainVotes: bigint;
}

export interface Proposal {
  id: bigint;
  proposer: string;
  targets: string[];
  values: bigint[];
  calldatas: string[];
  voteStart: bigint;
  voteEnd: bigint;
  description: string;
  state: ProposalState;
  votes: ProposalVotes;
  snapshot: bigint;
  deadline: bigint;
  type: ProposalType;
  title: string;
  summary: string;
}

export interface Vote {
  voter: string;
  proposalId: bigint;
  support: VoteSupport;
  weight: bigint;
  reason: string;
  timestamp: bigint;
}

export interface CreateProposalParams {
  targets: string[];
  values: bigint[];
  calldatas: string[];
  description: string;
  type: ProposalType;
  title: string;
  summary: string;
}

/**
 * Create a new governance proposal
 * @param governorAddress - The governor contract address
 * @param params - Proposal parameters
 * @returns Promise<string> - Transaction hash
 */
export async function createProposal(
  governorAddress: string,
  params: CreateProposalParams
): Promise<string> {
  try {
    // Check if MetaMask is available
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not found. Please install MetaMask.');
    }

    // Create wallet client
    const walletClient = createWalletClient({
      chain: BASE_CHAIN,
      transport: custom(window.ethereum),
    });

    // Get the connected account
    const [account] = await walletClient.getAddresses();
    if (!account) {
      throw new Error('No wallet connected');
    }

    // Format description with metadata
    const fullDescription = JSON.stringify({
      title: params.title,
      summary: params.summary,
      description: params.description,
      type: params.type
    });

    // Execute the proposal creation
    const hash = await walletClient.writeContract({
      address: governorAddress as `0x${string}`,
      abi: GOVERNOR_ABI,
      functionName: 'propose',
      args: [params.targets as `0x${string}`[], params.values, params.calldatas as `0x${string}`[], fullDescription],
      account,
    });

    return hash;
  } catch (error) {
    console.error('Failed to create proposal:', error);
    throw error;
  }
}

/**
 * Cast a vote on a proposal
 * @param governorAddress - The governor contract address
 * @param proposalId - The proposal ID
 * @param support - Vote support (0=Against, 1=For, 2=Abstain)
 * @param reason - Optional voting reason
 * @returns Promise<string> - Transaction hash
 */
export async function castVote(
  governorAddress: string,
  proposalId: bigint,
  support: VoteSupport,
  reason?: string
): Promise<string> {
  try {
    // Check if MetaMask is available
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not found. Please install MetaMask.');
    }

    // Create wallet client
    const walletClient = createWalletClient({
      chain: BASE_CHAIN,
      transport: custom(window.ethereum),
    });

    // Get the connected account
    const [account] = await walletClient.getAddresses();
    if (!account) {
      throw new Error('No wallet connected');
    }

    // Cast vote with or without reason
    const hash = reason
      ? await walletClient.writeContract({
          address: governorAddress as `0x${string}`,
          abi: GOVERNOR_ABI,
          functionName: 'castVoteWithReason',
          args: [proposalId, support, reason],
          account,
        })
      : await walletClient.writeContract({
          address: governorAddress as `0x${string}`,
          abi: GOVERNOR_ABI,
          functionName: 'castVote',
          args: [proposalId, support],
          account,
        });

    return hash;
  } catch (error) {
    console.error('Failed to cast vote:', error);
    throw error;
  }
}

/**
 * Get proposal state
 * @param governorAddress - The governor contract address
 * @param proposalId - The proposal ID
 * @returns Promise<ProposalState> - Current proposal state
 */
export async function getProposalState(
  governorAddress: string,
  proposalId: bigint
): Promise<ProposalState> {
  try {
    const publicClient = createPublicClient({
      chain: BASE_CHAIN,
      transport: http(ENVIRONMENT.RPC_URL),
    });

    const cacheKey = `proposal-state-${governorAddress}-${proposalId}`;
    const state = await cachedContractRead(
      cacheKey,
      () => publicClient.readContract({
        address: governorAddress as `0x${string}`,
        abi: GOVERNOR_ABI,
        functionName: 'state',
        args: [proposalId],
      })
    );

    return state as ProposalState;
  } catch (error) {
    console.error('Failed to get proposal state:', error);
    throw error;
  }
}

/**
 * Get proposal votes
 * @param governorAddress - The governor contract address
 * @param proposalId - The proposal ID
 * @returns Promise<ProposalVotes> - Vote counts
 */
export async function getProposalVotes(
  governorAddress: string,
  proposalId: bigint
): Promise<ProposalVotes> {
  try {
    const publicClient = createPublicClient({
      chain: BASE_CHAIN,
      transport: http(ENVIRONMENT.RPC_URL),
    });

    const cacheKey = `proposal-votes-${governorAddress}-${proposalId}`;
    const votes = await cachedContractRead(
      cacheKey,
      () => publicClient.readContract({
        address: governorAddress as `0x${string}`,
        abi: GOVERNOR_ABI,
        functionName: 'proposalVotes',
        args: [proposalId],
      })
    );

    return {
      againstVotes: votes[0] as bigint,
      forVotes: votes[1] as bigint,
      abstainVotes: votes[2] as bigint,
    };
  } catch (error) {
    console.error('Failed to get proposal votes:', error);
    throw error;
  }
}

/**
 * Get user's current voting power
 * @param governorAddress - The governor contract address
 * @param userAddress - The user's address
 * @returns Promise<bigint> - Current voting power
 */
export async function getUserVotingPower(
  governorAddress: string,
  userAddress: string
): Promise<bigint> {
  try {
    const publicClient = createPublicClient({
      chain: BASE_CHAIN,
      transport: http(ENVIRONMENT.RPC_URL),
    });

    // Get the current block number
    const currentBlock = await publicClient.getBlockNumber();

    // Use the previous block to ensure it's been mined
    const timepoint = currentBlock > BigInt(0) ? currentBlock - BigInt(1) : BigInt(0);

    const votingPower = await publicClient.readContract({
      address: governorAddress as `0x${string}`,
      abi: GOVERNOR_ABI,
      functionName: 'getVotes',
      args: [userAddress as `0x${string}`, timepoint],
    });

    return votingPower as bigint;
  } catch (error) {
    console.error('Failed to get voting power:', error);
    return BigInt(0);
  }
}

/**
 * Check if user has delegated their voting power
 * @param nftAddress - The NFT contract address
 * @param userAddress - The user's address
 * @returns Promise<string> - The address the user has delegated to
 */
export async function getDelegatedTo(
  nftAddress: string,
  userAddress: string
): Promise<string> {
  try {
    const publicClient = createPublicClient({
      chain: BASE_CHAIN,
      transport: http(ENVIRONMENT.RPC_URL),
    });

    const delegatedTo = await publicClient.readContract({
      address: nftAddress as `0x${string}`,
      abi: [
        {
          name: 'delegates',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
          outputs: [{ name: '', type: 'address', internalType: 'address' }],
        },
      ],
      functionName: 'delegates',
      args: [userAddress as `0x${string}`],
    });

    return delegatedTo as string;
  } catch (error) {
    console.error('Failed to check delegation:', error);
    return '0x0000000000000000000000000000000000000000';
  }
}

/**
 * Delegate voting power to self or another address
 * @param nftAddress - The NFT contract address
 * @param delegatee - The address to delegate to (usually self)
 * @returns Promise<string> - Transaction hash
 */
export async function delegateVotes(
  nftAddress: string,
  delegatee: string
): Promise<string> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No wallet found');
  }

  const walletClient = createWalletClient({
    chain: BASE_CHAIN,
    transport: custom(window.ethereum),
  });

  const [account] = await walletClient.getAddresses();

  const hash = await walletClient.writeContract({
    address: nftAddress as `0x${string}`,
    abi: [
      {
        name: 'delegate',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'delegatee', type: 'address', internalType: 'address' }],
        outputs: [],
      },
    ],
    functionName: 'delegate',
    args: [delegatee as `0x${string}`],
    account,
  });

  return hash;
}

/**
 * Get user's voting power at a specific block
 * @param governorAddress - The governor contract address
 * @param userAddress - The user's address
 * @param blockNumber - The specific block number
 * @returns Promise<bigint> - Voting power at that block
 */
export async function getUserVotingPowerAtBlock(
  governorAddress: string,
  userAddress: string,
  blockNumber: bigint
): Promise<bigint> {
  try {
    const publicClient = createPublicClient({
      chain: BASE_CHAIN,
      transport: http(ENVIRONMENT.RPC_URL),
    });

    const votingPower = await publicClient.readContract({
      address: governorAddress as `0x${string}`,
      abi: GOVERNOR_ABI,
      functionName: 'getVotes',
      args: [userAddress as `0x${string}`, blockNumber],
    });

    return votingPower as bigint;
  } catch (error) {
    console.error('Failed to get voting power at block:', error);
    return BigInt(0);
  }
}

/**
 * Check if user has voted on a proposal with rate limiting protection
 * @param governorAddress - The governor contract address
 * @param proposalId - The proposal ID
 * @param userAddress - The user's address
 * @returns Promise<boolean> - True if user has voted
 */
export async function hasUserVoted(
  governorAddress: string,
  proposalId: bigint,
  userAddress: string
): Promise<boolean> {
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
      const publicClient = createPublicClient({
        chain: BASE_CHAIN,
        transport: http(ENVIRONMENT.RPC_URL),
      });

      const hasVoted = await publicClient.readContract({
        address: governorAddress as `0x${string}`,
        abi: GOVERNOR_ABI,
        functionName: 'hasVoted',
        args: [proposalId, userAddress as `0x${string}`],
      });

      return hasVoted as boolean;
    } catch (error) {
      const isRateLimit = isRateLimitError(error);

      // If it's the last attempt or not a rate limit error, return false
      if (attempt === MAX_RETRIES - 1 || !isRateLimit) {
        if (isRateLimit) {
          console.warn('Rate limit hit when checking user vote, returning false. Please try again later.');
        } else {
          console.error('Failed to check if user voted:', error);
        }
        // Return false as default (assume user hasn't voted)
        return false;
      }

      // Calculate exponential backoff delay
      const delay = INITIAL_DELAY * Math.pow(2, attempt);
      console.warn(`Rate limit error when checking user vote (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delay}ms...`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but return false as fallback
  return false;
}

/**
 * Get proposal threshold (minimum voting power needed to create proposals)
 * @param governorAddress - The governor contract address
 * @returns Promise<bigint> - Proposal threshold
 */
export async function getProposalThreshold(governorAddress: string): Promise<bigint> {
  try {
    const publicClient = createPublicClient({
      chain: BASE_CHAIN,
      transport: http(ENVIRONMENT.RPC_URL),
    });

    const threshold = await publicClient.readContract({
      address: governorAddress as `0x${string}`,
      abi: GOVERNOR_ABI,
      functionName: 'proposalThreshold',
    });

    return threshold as bigint;
  } catch (error) {
    console.error('Failed to get proposal threshold:', error);
    return BigInt(0);
  }
}

/**
 * Get all proposals by parsing ProposalCreated events
 * @param governorAddress - The governor contract address
 * @param fromBlock - Starting block number (optional)
 * @returns Promise<Proposal[]> - Array of proposals
 */
export async function getAllProposals(
  governorAddress: string,
  fromBlock?: bigint
): Promise<Proposal[]> {
  try {
    const publicClient = createPublicClient({
      chain: BASE_CHAIN,
      transport: http(ENVIRONMENT.RPC_URL),
    });

    // Try to get the current block number to use a more recent starting point
    // This avoids querying from block 0 which can be very large and timeout
    let startBlock = fromBlock;
    if (!startBlock) {
      try {
        const currentBlock = await publicClient.getBlockNumber();
        // Start from 100,000 blocks ago (approximately 2-3 days on Base)
        // This is a reasonable range that should capture recent proposals
        startBlock = currentBlock > BigInt(100000)
          ? currentBlock - BigInt(100000)
          : BigInt(0);
      } catch (error) {
        console.warn('Failed to get current block number, using block 0:', error);
        startBlock = BigInt(0);
      }
    }

    // Get ProposalCreated events with error handling
    let logs;
    try {
      logs = await publicClient.getLogs({
        address: governorAddress as `0x${string}`,
        event: parseAbiItem('event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)'),
        fromBlock: startBlock,
      });
    } catch (error: unknown) {
      // If the query fails (e.g., 503, timeout), try with a smaller range
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as { code?: number })?.code;

      if (errorMessage.includes('503') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('no backend') ||
          errorCode === -32011) {
        console.warn('RPC endpoint unavailable, trying with smaller block range:', error);

        // Try with a much smaller range (last 10,000 blocks)
        try {
          const currentBlock = await publicClient.getBlockNumber();
          const recentBlock = currentBlock > BigInt(10000)
            ? currentBlock - BigInt(10000)
            : BigInt(0);

          logs = await publicClient.getLogs({
            address: governorAddress as `0x${string}`,
            event: parseAbiItem('event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)'),
            fromBlock: recentBlock,
          });
        } catch (retryError) {
          console.error('Failed to get proposals even with smaller range:', retryError);
          // Return empty array - UI will handle this gracefully
          return [];
        }
      } else {
        throw error;
      }
    }

    // Process each proposal
    const proposals: Proposal[] = [];
    let consecutiveRateLimitErrors = 0;
    const MAX_CONSECUTIVE_RATE_LIMIT_ERRORS = 3;

    for (const log of logs) {
      try {
        const { proposalId, proposer, targets, values, calldatas, voteStart, voteEnd, description } = log.args || {};

        if (!proposalId) continue;

        // Parse description metadata
        let parsedDescription;
        let title = 'Untitled Proposal';
        let summary = '';
        let type = ProposalType.TEXT_ONLY;

        try {
          parsedDescription = JSON.parse(description || '{}');
          title = parsedDescription.title || title;
          summary = parsedDescription.summary || '';
          type = parsedDescription.type || type;
        } catch {
          // If description is not JSON, use it as title
          title = description || title;
        }

        // Get current state and votes sequentially to avoid rate limits
        // Add error handling for each call
        let state = ProposalState.PENDING;
        let votes: ProposalVotes = { againstVotes: BigInt(0), forVotes: BigInt(0), abstainVotes: BigInt(0) };
        let snapshot = BigInt(0);
        let deadline = BigInt(0);

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

        try {
          state = await getProposalState(governorAddress, proposalId);
          consecutiveRateLimitErrors = 0; // Reset on success
        } catch (error) {
          if (isRateLimitError(error)) {
            consecutiveRateLimitErrors++;
            if (consecutiveRateLimitErrors >= MAX_CONSECUTIVE_RATE_LIMIT_ERRORS) {
              console.warn(`Too many rate limit errors (${consecutiveRateLimitErrors}), stopping proposal processing`);
              break; // Stop processing remaining proposals
            }
          }
          console.warn(`Failed to get state for proposal ${proposalId}:`, error);
          // Continue with default state
        }

        try {
          votes = await getProposalVotes(governorAddress, proposalId);
          consecutiveRateLimitErrors = 0; // Reset on success
        } catch (error) {
          if (isRateLimitError(error)) {
            consecutiveRateLimitErrors++;
            if (consecutiveRateLimitErrors >= MAX_CONSECUTIVE_RATE_LIMIT_ERRORS) {
              console.warn(`Too many rate limit errors (${consecutiveRateLimitErrors}), stopping proposal processing`);
              break; // Stop processing remaining proposals
            }
          }
          console.warn(`Failed to get votes for proposal ${proposalId}:`, error);
          // Continue with default votes
        }

        try {
          snapshot = await publicClient.readContract({
            address: governorAddress as `0x${string}`,
            abi: GOVERNOR_ABI,
            functionName: 'proposalSnapshot',
            args: [proposalId],
          }) as bigint;
          consecutiveRateLimitErrors = 0; // Reset on success
        } catch (error) {
          if (isRateLimitError(error)) {
            consecutiveRateLimitErrors++;
            if (consecutiveRateLimitErrors >= MAX_CONSECUTIVE_RATE_LIMIT_ERRORS) {
              console.warn(`Too many rate limit errors (${consecutiveRateLimitErrors}), stopping proposal processing`);
              break; // Stop processing remaining proposals
            }
          }
          console.warn(`Failed to get snapshot for proposal ${proposalId}:`, error);
          // Continue with default snapshot
        }

        try {
          deadline = await publicClient.readContract({
            address: governorAddress as `0x${string}`,
            abi: GOVERNOR_ABI,
            functionName: 'proposalDeadline',
            args: [proposalId],
          }) as bigint;
          consecutiveRateLimitErrors = 0; // Reset on success
        } catch (error) {
          if (isRateLimitError(error)) {
            consecutiveRateLimitErrors++;
            if (consecutiveRateLimitErrors >= MAX_CONSECUTIVE_RATE_LIMIT_ERRORS) {
              console.warn(`Too many rate limit errors (${consecutiveRateLimitErrors}), stopping proposal processing`);
              break; // Stop processing remaining proposals
            }
          }
          console.warn(`Failed to get deadline for proposal ${proposalId}:`, error);
          // Continue with default deadline
        }

        // Add a delay between proposals to avoid rate limits
        // Use longer delay if we've hit rate limit errors recently
        if (logs.indexOf(log) < logs.length - 1) {
          const delay = consecutiveRateLimitErrors > 0 ? 500 : 200; // 500ms if rate limited, 200ms otherwise
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        proposals.push({
          id: proposalId,
          proposer: proposer || '',
          targets: (targets || []) as string[],
          values: (values || []) as bigint[],
          calldatas: (calldatas || []) as string[],
          voteStart: voteStart || BigInt(0),
          voteEnd: voteEnd || BigInt(0),
          description: description || '',
          state,
          votes,
          snapshot: snapshot as bigint,
          deadline: deadline as bigint,
          type,
          title,
          summary,
        });
      } catch (error) {
        console.error('Failed to process proposal:', error);
        continue;
      }
    }

    // Sort by proposal ID (newest first)
    return proposals.sort((a, b) => Number(b.id - a.id));
  } catch (error) {
    console.error('Failed to get all proposals:', error);
    return [];
  }
}

/**
 * Get a specific proposal by ID
 * @param governorAddress - The governor contract address
 * @param proposalId - The proposal ID
 * @returns Promise<Proposal | null> - Proposal data or null if not found
 */
export async function getProposal(
  governorAddress: string,
  proposalId: bigint
): Promise<Proposal | null> {
  const MAX_RETRIES = 2;
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
      // Get all proposals and find the specific one
      const proposals = await getAllProposals(governorAddress);
      return proposals.find(p => p.id === proposalId) || null;
    } catch (error) {
      const isRateLimit = isRateLimitError(error);

      // If it's the last attempt or not a rate limit error, return null
      if (attempt === MAX_RETRIES - 1 || !isRateLimit) {
        if (isRateLimit) {
          console.warn('Rate limit hit when getting proposal, returning null. Please try again later.');
        } else {
          console.error('Failed to get proposal:', error);
        }
        return null;
      }

      // Calculate exponential backoff delay
      const delay = INITIAL_DELAY * Math.pow(2, attempt);
      console.warn(`Rate limit error when getting proposal (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delay}ms...`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but return null as fallback
  return null;
}

/**
 * Parse proposal description to extract metadata
 * @param description - Raw description string
 * @returns Parsed proposal metadata
 */
export function parseProposalDescription(description: string) {
  try {
    const parsed = JSON.parse(description);
    return {
      title: parsed.title || 'Untitled Proposal',
      summary: parsed.summary || '',
      description: parsed.description || description,
      type: parsed.type || ProposalType.TEXT_ONLY,
    };
  } catch {
    return {
      title: description || 'Untitled Proposal',
      summary: '',
      description: description || '',
      type: ProposalType.TEXT_ONLY,
    };
  }
}

/**
 * Get proposal state label
 * @param state - Proposal state enum value
 * @returns Human-readable state label
 */
export function getProposalStateLabel(state: ProposalState): string {
  switch (state) {
    case ProposalState.PENDING:
      return 'Pending';
    case ProposalState.ACTIVE:
      return 'Active';
    case ProposalState.CANCELED:
      return 'Canceled';
    case ProposalState.DEFEATED:
      return 'Defeated';
    case ProposalState.SUCCEEDED:
      return 'Succeeded';
    case ProposalState.QUEUED:
      return 'Queued';
    case ProposalState.EXPIRED:
      return 'Expired';
    case ProposalState.EXECUTED:
      return 'Executed';
    default:
      return 'Unknown';
  }
}

/**
 * Get vote support label
 * @param support - Vote support enum value
 * @returns Human-readable vote label
 */
export function getVoteSupportLabel(support: VoteSupport): string {
  switch (support) {
    case VoteSupport.AGAINST:
      return 'Against';
    case VoteSupport.FOR:
      return 'For';
    case VoteSupport.ABSTAIN:
      return 'Abstain';
    default:
      return 'Unknown';
  }
}
