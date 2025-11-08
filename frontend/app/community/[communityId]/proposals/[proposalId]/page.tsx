"use client";

import { useEffect, useState, use } from "react";
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

  // Load community and proposal data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load community data
        const communityData = await getCommunityData(BigInt(communityId));
        if (!communityData) {
          setError("Community not found");
          return;
        }
        setCommunity(communityData);

        // Load user status if connected
        if (address && isConnected) {
          const status = await getUserCommunityStatus(
            BigInt(communityId),
            address
          );
          setUserStatus(status);
        }

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

        // Check if user has voted
        if (address && isConnected) {
          try {
            const hasVoted = await hasUserVoted(
              communityData.governor,
              BigInt(proposalId),
              address
            );
            setUserHasVoted(hasVoted);
          } catch (err) {
            console.error("Failed to check user vote:", err);
          }
        }
      } catch (err) {
        console.error("Failed to load proposal:", err);
        setError("Failed to load proposal data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [communityId, proposalId, address, isConnected]);

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

  if (error || !community || !proposal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error || "Proposal Not Found"}
          </h1>
          <p className="text-gray-600 mb-6">
            The proposal you're looking for doesn't exist or couldn't be loaded.
          </p>
          <Link
            href={`/community/${communityId}`}
            className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-lg hover:bg-purple-700 transition-colors duration-200 shadow-sm"
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
            Back to Community
          </Link>
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
  const canVote = isConnected && isActive && userHasVoted === false;

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
            Back to {community.name}
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
