import { createWalletClient, custom, parseAbiItem } from 'viem';
import { BASE_CHAIN } from './config';
import { createResilientPublicClient, cachedContractRead } from './rpc-client';

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
    const publicClient = createResilientPublicClient();
    const cacheKey = `state_${governorAddress}_${proposalId}`;

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
    const publicClient = createResilientPublicClient();
    const cacheKey = `votes_${governorAddress}_${proposalId}`;

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
    const publicClient = createResilientPublicClient();

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
    const publicClient = createResilientPublicClient();

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
    const publicClient = createResilientPublicClient();

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
 * Check if user has voted on a proposal
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
  try {
    const publicClient = createResilientPublicClient();

    const hasVoted = await publicClient.readContract({
      address: governorAddress as `0x${string}`,
      abi: GOVERNOR_ABI,
      functionName: 'hasVoted',
      args: [proposalId, userAddress as `0x${string}`],
    });

    return hasVoted as boolean;
  } catch (error) {
    console.error('Failed to check if user voted:', error);
    return false;
  }
}

/**
 * Get proposal threshold (minimum voting power needed to create proposals)
 * @param governorAddress - The governor contract address
 * @returns Promise<bigint> - Proposal threshold
 */
export async function getProposalThreshold(governorAddress: string): Promise<bigint> {
  try {
    const publicClient = createResilientPublicClient();

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
    const publicClient = createResilientPublicClient();
    const cacheKey = `proposals_${governorAddress}_${fromBlock || 0}`;

    // Get ProposalCreated events with caching and retry logic
    const logs = await cachedContractRead(
      cacheKey,
      () => publicClient.getLogs({
        address: governorAddress as `0x${string}`,
        event: parseAbiItem('event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)'),
        fromBlock: fromBlock || BigInt(0),
      })
    );

    // Process each proposal
    const proposals: Proposal[] = [];

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

        // Get current state and votes with caching and delays
        const [state, votes] = await Promise.all([
          getProposalState(governorAddress, proposalId),
          getProposalVotes(governorAddress, proposalId),
        ]);

        // Add delay before additional calls to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

        const [snapshot, deadline] = await Promise.all([
          cachedContractRead(
            `snapshot_${governorAddress}_${proposalId}`,
            () => publicClient.readContract({
              address: governorAddress as `0x${string}`,
              abi: GOVERNOR_ABI,
              functionName: 'proposalSnapshot',
              args: [proposalId],
            })
          ),
          cachedContractRead(
            `deadline_${governorAddress}_${proposalId}`,
            () => publicClient.readContract({
              address: governorAddress as `0x${string}`,
              abi: GOVERNOR_ABI,
              functionName: 'proposalDeadline',
              args: [proposalId],
            })
          ),
        ]);

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
  try {
    // Get all proposals and find the specific one
    const proposals = await getAllProposals(governorAddress);
    return proposals.find(p => p.id === proposalId) || null;
  } catch (error) {
    console.error('Failed to get proposal:', error);
    return null;
  }
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
