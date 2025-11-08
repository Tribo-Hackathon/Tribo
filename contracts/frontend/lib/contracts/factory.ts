// Note: We're using direct viem clients instead of wagmi for custom RPC support
import { createWalletClient, createPublicClient, custom, http, decodeEventLog } from 'viem';
import { CONTRACT_ADDRESSES, ENVIRONMENT, BASE_CHAIN } from './config';
import { COMMUNITY_DEFAULTS, CommunityParams } from './constants';
import { FACTORY_ABI, DeploymentResult } from './types';

/**
 * Creates a new community using the factory contract
 * @param creatorAddress - The wallet address of the community creator (from MetaMask)
 * @returns Promise<DeploymentResult> - Result of the deployment
 */
export async function createCommunity(
  creatorAddress: `0x${string}`
): Promise<DeploymentResult> {
  try {
    // Check if MetaMask is available
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not found. Please install MetaMask.');
    }

    // Create wallet client with MetaMask and Base chain
    const walletClient = createWalletClient({
      chain: BASE_CHAIN,
      transport: custom(window.ethereum),
    });

    // Create public client for transaction receipt with Base chain
    const publicClient = createPublicClient({
      chain: BASE_CHAIN,
      transport: http(ENVIRONMENT.RPC_URLS[0]),
    });

    // Prepare community parameters using constants and creator address
    const communityParams: CommunityParams = {
      name: COMMUNITY_DEFAULTS.NAME,
      symbol: COMMUNITY_DEFAULTS.SYMBOL,
      baseURI: COMMUNITY_DEFAULTS.BASE_URI,
      creator: creatorAddress,
      maxSupply: COMMUNITY_DEFAULTS.MAX_SUPPLY,
      votingDelay: COMMUNITY_DEFAULTS.VOTING_DELAY,
      votingPeriod: COMMUNITY_DEFAULTS.VOTING_PERIOD,
      proposalThreshold: COMMUNITY_DEFAULTS.PROPOSAL_THRESHOLD,
      quorumNumerator: COMMUNITY_DEFAULTS.QUORUM_NUMERATOR,
      deployTimelock: COMMUNITY_DEFAULTS.DEPLOY_TIMELOCK,
      metadataURI: COMMUNITY_DEFAULTS.METADATA_URI,
    };

    // Execute the contract write transaction using wallet client
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESSES.FACTORY,
      abi: FACTORY_ABI,
      functionName: 'createCommunity',
      // @ts-expect-error - TODO: fix this
      args: [communityParams],
      account: creatorAddress,
    });

    // Wait for transaction confirmation using public client with custom RPC
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
    });

    // Parse logs to extract deployed contract addresses
    let contractAddresses = {
      community: undefined as string | undefined,
      nft: undefined as string | undefined,
      governance: undefined as string | undefined,
    };

    // Look for the CommunityCreated event in the transaction logs
    for (const log of receipt.logs) {
      try {
        console.log('Log:', log);
        const decodedLog = decodeEventLog({
          abi: FACTORY_ABI,
          data: log.data,
          topics: log.topics,
        });
        console.log('Decoded log:', decodedLog);

        if (decodedLog.eventName === 'CommunityCreated') {
          contractAddresses = {
            community: decodedLog.args.communityId.toString(), // Convert bigint to string
            nft: decodedLog.args.nft,
            governance: decodedLog.args.governor,
          };
          console.log('Deployed contract addresses:', {
            creator: decodedLog.args.creator,
            communityId: decodedLog.args.communityId.toString(), // Convert bigint to string for logging
            nft: decodedLog.args.nft,
            governor: decodedLog.args.governor,
            timelock: decodedLog.args.timelock,
          });
          break;
        }
      } catch {
        // Skip logs that don't match our ABI or aren't from our contract
        continue;
      }
    }

    return {
      success: true,
      transactionHash: hash,
      contractAddresses,
    };
  } catch (error) {
    console.error('Community creation failed:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Utility function to prepare community parameters
 * @param creatorAddress - The creator's wallet address
 * @returns CommunityParams object ready for contract call
 */
export function prepareCommunityParams(
  creatorAddress: `0x${string}`
): CommunityParams {
  return {
    name: COMMUNITY_DEFAULTS.NAME,
    symbol: COMMUNITY_DEFAULTS.SYMBOL,
    baseURI: COMMUNITY_DEFAULTS.BASE_URI,
    creator: creatorAddress,
    maxSupply: COMMUNITY_DEFAULTS.MAX_SUPPLY,
    votingDelay: COMMUNITY_DEFAULTS.VOTING_DELAY,
    votingPeriod: COMMUNITY_DEFAULTS.VOTING_PERIOD,
    proposalThreshold: COMMUNITY_DEFAULTS.PROPOSAL_THRESHOLD,
    quorumNumerator: COMMUNITY_DEFAULTS.QUORUM_NUMERATOR,
    deployTimelock: COMMUNITY_DEFAULTS.DEPLOY_TIMELOCK,
    metadataURI: COMMUNITY_DEFAULTS.METADATA_URI,
  };
}
