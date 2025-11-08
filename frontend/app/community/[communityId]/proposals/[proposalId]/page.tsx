"use client";

import { useEffect, useState, use, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import Link from "next/link";
import {
  getCommunityData,
  getUserCommunityStatus,
  CommunityData,
  UserCommunityStatus,
} from "@/lib/contracts/community";
import {
  getProposal,
  castVote,
  hasUserVoted,
  Proposal,
  ProposalState,
  VoteSupport,
  getProposalStateLabel,
} from "@/lib/contracts/governance";
import { Button } from "@/components/ui/button";

interface ProposalPageProps {
  params: Promise<{ communityId: string; proposalId: string }>;
}

export default function ProposalPage({ params }: ProposalPageProps) {
  const resolvedParams = use(params);
  const { communityId, proposalId } = resolvedParams;
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [community, setCommunity] = useState<CommunityData | null>(null);
  const [userStatus, setUserStatus] = useState<UserCommunityStatus | null>(
    null
  );
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userHasVoted, setUserHasVoted] = useState<boolean | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [votingFor, setVotingFor] = useState<VoteSupport | null>(null);

  // Rate limiting protection
  const loadingRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastErrorTimeRef = useRef<number>(0);

  // Load community and proposal data with rate limiting protection
  const loadData = useCallback(
    async (isRetry = false) => {
      // Prevent multiple simultaneous calls
      if (loadingRef.current) {
        return;
      }

      // Rate limit protection: if we had an error recently, wait before retrying
      const now = Date.now();
      const timeSinceLastError = now - lastErrorTimeRef.current;
      if (!isRetry && timeSinceLastError < 5000) {
        // 5 second cooldown
        console.log("Rate limit cooldown active, skipping request");
        return;
      }

      try {
        loadingRef.current = true;
        setLoading(true);
        setError(null);

        // Clear any pending retry timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }

        // Load community data
        const communityData = await getCommunityData(BigInt(communityId));
        if (!communityData) {
          setError("Community not found");
          return;
        }
        setCommunity(communityData);

        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Load user status if connected
        if (address && isConnected) {
          try {
            const status = await getUserCommunityStatus(address, communityData);
            setUserStatus(status);
          } catch (err) {
            console.warn(
              "Failed to get user status (may be rate limited):",
              err
            );
            setUserStatus({
              role: "visitor",
              nftBalance: BigInt(0),
              isCreator: false,
              canVote: false,
            });
          }
        }

        // Small delay before loading proposal data
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Load proposal data
        const proposalData = await getProposal(
          communityData.governor,
          BigInt(proposalId)
        );
        if (!proposalData) {
          setError("Proposal not found");
          return;
        }
        setProposal(proposalData);

        // Check if user has voted (only if we have all required data)
        if (address && isConnected && proposalData) {
          try {
            await new Promise((resolve) => setTimeout(resolve, 300));
            console.log("Checking if user has voted...");
            const hasVoted = await hasUserVoted(
              communityData.governor,
              BigInt(proposalId),
              address
            );
            setUserHasVoted(hasVoted);
            console.log("User vote status:", hasVoted);
          } catch (err) {
            console.warn(
              "Failed to check user vote (may be rate limited):",
              err
            );
            // Set to null to indicate we couldn't check, rather than false
            setUserHasVoted(null);
          }
        } else {
          // Clear vote status if user is not connected or we don't have proposal data
          setUserHasVoted(null);
        }
      } catch (err: unknown) {
        console.error("Failed to load proposal:", err);
        lastErrorTimeRef.current = Date.now();

        // Provide more helpful error messages
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (
          errorMessage.includes("429") ||
          errorMessage.includes("rate limit") ||
          errorMessage.includes("over rate limit") ||
          errorMessage.includes("Rate limit")
        ) {
          setError(
            "RPC endpoint is rate-limited. Retrying automatically in 10 seconds..."
          );

          // Auto-retry after 10 seconds for rate limit errors
          retryTimeoutRef.current = setTimeout(() => {
            console.log("Auto-retrying after rate limit...");
            loadData(true);
          }, 10000);
        } else {
          setError("Failed to load proposal data. Please try again.");
        }
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [communityId, proposalId, address, isConnected]
  );

  // Stable effect that only runs once per proposal change
  useEffect(() => {
    loadData();

    // Cleanup function to clear any pending retries
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [communityId, proposalId]); // Only depend on proposal identifiers

  // Separate effect for when wallet connection changes
  useEffect(() => {
    // Only reload if we already have community data and wallet status changed
    if (community && !loadingRef.current) {
      const timeoutId = setTimeout(() => {
        loadData();
      }, 1000); // Small delay to avoid rapid re-requests

      return () => clearTimeout(timeoutId);
    }
  }, [address, isConnected, community, loadData]);

  // Handle voting
  const handleVote = async (support: VoteSupport) => {
    if (!address || !isConnected || !community || !proposal) return;

    setIsVoting(true);
    setVotingFor(support);

    try {
      await castVote(community.governor, proposal.id, support);
      setUserHasVoted(true);

      // Reload proposal to get updated vote counts
      const updatedProposal = await getProposal(
        community.governor,
        BigInt(proposalId)
      );
      if (updatedProposal) {
        setProposal(updatedProposal);
      }
    } catch (error) {
      console.error("Failed to cast vote:", error);
    } finally {
      setIsVoting(false);
      setVotingFor(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading proposal...</p>
        </div>
      </div>
    );
  }

  if (
    error ||
    (!community && !loading) ||
    (!proposal && !loading && community)
  ) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md mx-auto">
            <div className="text-red-400 text-6xl mb-4">❌</div>
            <h1 className="text-xl font-semibold text-red-800 mb-2">
              {error || "Proposal Not Found"}
            </h1>
            <p className="text-red-600 mb-4">
              {error?.includes("rate-limited")
                ? "Please wait for the automatic retry or try again manually."
                : "The proposal you're looking for doesn't exist or couldn't be loaded."}
            </p>
            <div className="space-x-4">
              <Link
                href={`/community/${communityId}`}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Back to Community
              </Link>
              <button
                onClick={() => loadData(true)}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Early return if proposal or community is not loaded
  if (!proposal || !community) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading proposal...</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate vote percentages
  const totalVotes =
    proposal.votes.forVotes +
    proposal.votes.againstVotes +
    proposal.votes.abstainVotes;
  const forPercentage =
    totalVotes > BigInt(0)
      ? Number((proposal.votes.forVotes * BigInt(100)) / totalVotes)
      : 0;
  const againstPercentage =
    totalVotes > BigInt(0)
      ? Number((proposal.votes.againstVotes * BigInt(100)) / totalVotes)
      : 0;
  const abstainPercentage =
    totalVotes > BigInt(0)
      ? Number((proposal.votes.abstainVotes * BigInt(100)) / totalVotes)
      : 0;

  const isActive = proposal.state === ProposalState.ACTIVE;
  const canVote = isConnected && isActive && userHasVoted === false && !loading;
  const voteStatusLoading = isConnected && userHasVoted === null && !loading;

  // Get state styling
  const getStateStyle = (state: ProposalState) => {
    switch (state) {
      case ProposalState.ACTIVE:
        return "bg-green-100 text-green-800 border-green-200";
      case ProposalState.SUCCEEDED:
        return "bg-blue-100 text-blue-800 border-blue-200";
      case ProposalState.DEFEATED:
        return "bg-red-100 text-red-800 border-red-200";
      case ProposalState.EXECUTED:
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Back Navigation */}
        <div className="mb-8">
          <Link
            href={`/community/${communityId}`}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200 shadow-sm"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to{" "}
            {community.nftName ||
              `Community #${community.communityId.toString()}`}
          </Link>
        </div>

        {/* Proposal Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {proposal.title}
                </h1>
                <p className="text-gray-600 mb-4">{proposal.summary}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="font-medium">
                    Proposal #{proposal.id.toString()}
                  </span>
                  <span>
                    By {proposal.proposer.slice(0, 6)}...
                    {proposal.proposer.slice(-4)}
                  </span>
                  <span className="capitalize">
                    {proposal.type.replace("_", " ")}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0 ml-4">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStateStyle(
                    proposal.state
                  )}`}
                >
                  {getProposalStateLabel(proposal.state)}
                </span>
              </div>
            </div>
          </div>

          {/* Voting Section */}
          {totalVotes > BigInt(0) && (
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Voting Results
              </h3>
              <div className="space-y-3">
                {/* For Votes */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-green-600 font-medium">For</span>
                    <span className="text-gray-600">
                      {proposal.votes.forVotes.toString()} votes (
                      {forPercentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${forPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Against Votes */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-red-600 font-medium">Against</span>
                    <span className="text-gray-600">
                      {proposal.votes.againstVotes.toString()} votes (
                      {againstPercentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${againstPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Abstain Votes */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 font-medium">Abstain</span>
                    <span className="text-gray-600">
                      {proposal.votes.abstainVotes.toString()} votes (
                      {abstainPercentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gray-500 h-2 rounded-full"
                      style={{ width: `${abstainPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Vote Status Loading */}
          {voteStatusLoading && (
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                Checking your vote status...
              </div>
            </div>
          )}

          {/* Voting Actions */}
          {canVote && (
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Cast Your Vote
              </h3>
              <div className="flex space-x-3">
                <Button
                  onClick={() => handleVote(VoteSupport.FOR)}
                  disabled={isVoting}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isVoting && votingFor === VoteSupport.FOR ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Voting...
                    </div>
                  ) : (
                    "Vote For"
                  )}
                </Button>
                <Button
                  onClick={() => handleVote(VoteSupport.AGAINST)}
                  disabled={isVoting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isVoting && votingFor === VoteSupport.AGAINST ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Voting...
                    </div>
                  ) : (
                    "Vote Against"
                  )}
                </Button>
                <Button
                  onClick={() => handleVote(VoteSupport.ABSTAIN)}
                  disabled={isVoting}
                  variant="outline"
                >
                  {isVoting && votingFor === VoteSupport.ABSTAIN ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      Voting...
                    </div>
                  ) : (
                    "Abstain"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Vote Status */}
          {userHasVoted === true && (
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center text-sm text-green-600">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                You have already voted on this proposal
              </div>
            </div>
          )}

          {!isConnected && isActive && (
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="text-sm text-gray-600">
                Connect your wallet to vote on this proposal
              </div>
            </div>
          )}
        </div>

        {/* Proposal Description */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Proposal Details
            </h2>
          </div>
          <div className="px-6 py-6">
            <div className="prose prose-gray max-w-none">
              <div className="text-gray-700 leading-relaxed">
                {(() => {
                  // Handle case where description might still be JSON
                  let displayDescription = proposal.description;
                  try {
                    const parsed = JSON.parse(proposal.description);
                    displayDescription =
                      parsed.description ||
                      parsed.title ||
                      proposal.description;
                  } catch {
                    // If it's not JSON, use as-is
                    displayDescription = proposal.description;
                  }

                  // Format the description with proper line breaks and styling
                  return displayDescription
                    .split("\n")
                    .map((paragraph, index) => {
                      if (paragraph.trim() === "") {
                        return <br key={index} />;
                      }

                      // Check if it's a header (starts with #)
                      if (paragraph.trim().startsWith("#")) {
                        const headerLevel =
                          paragraph.match(/^#+/)?.[0].length || 1;
                        const headerText = paragraph.replace(/^#+\s*/, "");

                        if (headerLevel === 1) {
                          return (
                            <h1
                              key={index}
                              className="text-2xl font-bold text-gray-900 mt-6 mb-4 first:mt-0"
                            >
                              {headerText}
                            </h1>
                          );
                        } else if (headerLevel === 2) {
                          return (
                            <h2
                              key={index}
                              className="text-xl font-semibold text-gray-900 mt-5 mb-3 first:mt-0"
                            >
                              {headerText}
                            </h2>
                          );
                        } else {
                          return (
                            <h3
                              key={index}
                              className="text-lg font-medium text-gray-900 mt-4 mb-2 first:mt-0"
                            >
                              {headerText}
                            </h3>
                          );
                        }
                      }

                      // Check if it's a list item (starts with - or *)
                      if (paragraph.trim().match(/^[-*]\s/)) {
                        const listText = paragraph.replace(/^[-*]\s*/, "");
                        return (
                          <div key={index} className="flex items-start mb-2">
                            <span className="text-purple-500 mr-2 mt-1">•</span>
                            <span>{listText}</span>
                          </div>
                        );
                      }

                      // Regular paragraph
                      return (
                        <p key={index} className="mb-4 last:mb-0">
                          {paragraph}
                        </p>
                      );
                    });
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
