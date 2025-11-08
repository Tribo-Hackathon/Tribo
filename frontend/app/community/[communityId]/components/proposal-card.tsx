"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import {
  Proposal,
  ProposalState,
  VoteSupport,
  getProposalStateLabel,
  castVote,
  hasUserVoted,
} from "@/lib/contracts/governance";
import { Button } from "@/components/ui/button";

interface ProposalCardProps {
  proposal: Proposal;
  communityId: string;
  governorAddress: string;
  onVoteSuccess?: () => void;
}

export function ProposalCard({
  proposal,
  communityId,
  governorAddress,
  onVoteSuccess,
}: ProposalCardProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [userHasVoted, setUserHasVoted] = useState<boolean | null>(null);
  const [votingFor, setVotingFor] = useState<VoteSupport | null>(null);

  const { address, isConnected } = useAccount();

  // Check if user has voted
  const checkUserVote = async () => {
    if (!address || !isConnected) return;

    try {
      const hasVoted = await hasUserVoted(
        governorAddress,
        proposal.id,
        address
      );
      setUserHasVoted(hasVoted);
    } catch (error) {
      console.error("Failed to check user vote:", error);
    }
  };

  // Handle voting
  const handleVote = async (support: VoteSupport) => {
    if (!address || !isConnected) return;

    setIsVoting(true);
    setVotingFor(support);

    try {
      await castVote(governorAddress, proposal.id, support);

      setUserHasVoted(true);
      onVoteSuccess?.();
    } catch (error) {
      console.error("Failed to cast vote:", error);
    } finally {
      setIsVoting(false);
      setVotingFor(null);
    }
  };

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
      case ProposalState.PENDING:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case ProposalState.CANCELED:
        return "bg-gray-100 text-gray-800 border-gray-200";
      case ProposalState.QUEUED:
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case ProposalState.EXPIRED:
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Calculate time remaining
  const getTimeRemaining = () => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const deadline = proposal.deadline;

    if (deadline <= now) {
      return "Voting ended";
    }

    const remaining = Number(deadline - now);
    const days = Math.floor(remaining / (24 * 60 * 60));
    const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((remaining % (60 * 60)) / 60);

    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  const isActive = proposal.state === ProposalState.ACTIVE;
  const canVote = isConnected && isActive && userHasVoted === false;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <Link
            href={`/community/${communityId}/proposals/${proposal.id}`}
            className="block group"
          >
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors break-words">
              {proposal.title}
            </h3>
          </Link>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
            {proposal.summary}
          </p>
        </div>

        <div className="flex-shrink-0 self-start sm:self-auto">
          <span
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap ${getStateStyle(
              proposal.state
            )}`}
          >
            {getProposalStateLabel(proposal.state)}
          </span>
        </div>
      </div>

      {/* Proposal Info */}
      <div className="flex flex-wrap items-center text-xs sm:text-sm text-gray-500 mb-4 gap-2 sm:gap-4">
        <div>
          <span className="font-medium">
            Proposal #{proposal.id.toString()}
          </span>
        </div>
        <div>
          <span>
            By {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
          </span>
        </div>
        <div>
          <span className="capitalize">{proposal.type.replace("_", " ")}</span>
        </div>
      </div>

      {/* Vote Progress */}
      {totalVotes > BigInt(0) && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Voting Progress</span>
            <span>{totalVotes.toString()} votes cast</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div className="flex h-2 rounded-full overflow-hidden">
              <div
                className="bg-green-500"
                style={{ width: `${forPercentage}%` }}
              ></div>
              <div
                className="bg-red-500"
                style={{ width: `${againstPercentage}%` }}
              ></div>
              <div
                className="bg-gray-400"
                style={{ width: `${abstainPercentage}%` }}
              ></div>
            </div>
          </div>

          <div className="flex justify-between text-xs text-gray-500">
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
              For: {forPercentage}%
            </span>
            <span className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
              Against: {againstPercentage}%
            </span>
            <span className="flex items-center">
              <div className="w-2 h-2 bg-gray-400 rounded-full mr-1"></div>
              Abstain: {abstainPercentage}%
            </span>
          </div>
        </div>
      )}

      {/* Time Remaining */}
      {isActive && (
        <div className="mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{getTimeRemaining()}</span>
          </div>
        </div>
      )}

      {/* Voting Buttons */}
      {isActive && (
        <div className="border-t border-gray-200 pt-4">
          {!isConnected ? (
            <div className="text-center text-sm text-gray-500">
              Connect wallet to vote
            </div>
          ) : userHasVoted === null ? (
            <div className="text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={checkUserVote}
                className="text-xs"
              >
                Check Vote Status
              </Button>
            </div>
          ) : userHasVoted ? (
            <div className="text-center text-sm text-green-600 font-medium">
              ✓ You have already voted on this proposal
            </div>
          ) : canVote ? (
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={() => handleVote(VoteSupport.FOR)}
                disabled={isVoting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {isVoting && votingFor === VoteSupport.FOR ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                    Voting...
                  </div>
                ) : (
                  "👍 For"
                )}
              </Button>

              <Button
                size="sm"
                onClick={() => handleVote(VoteSupport.AGAINST)}
                disabled={isVoting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {isVoting && votingFor === VoteSupport.AGAINST ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                    Voting...
                  </div>
                ) : (
                  "👎 Against"
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleVote(VoteSupport.ABSTAIN)}
                disabled={isVoting}
                className="flex-1"
              >
                {isVoting && votingFor === VoteSupport.ABSTAIN ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1"></div>
                    Voting...
                  </div>
                ) : (
                  "🤷 Abstain"
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center text-sm text-gray-500">
              Voting not available
            </div>
          )}
        </div>
      )}

      {/* View Details Link */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <Link
          href={`/community/${communityId}/proposals/${proposal.id}`}
          className="text-sm text-purple-600 hover:text-purple-700 font-medium"
        >
          View Details →
        </Link>
      </div>
    </div>
  );
}
