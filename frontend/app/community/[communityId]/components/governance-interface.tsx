"use client";

import { useState, useEffect, useCallback } from "react";
import { CommunityData, UserCommunityStatus } from "@/lib/contracts/community";
import {
  getAllProposals,
  Proposal,
  ProposalState,
} from "@/lib/contracts/governance";
import { Button } from "@/components/ui/button";
import { CreateProposalForm } from "./create-proposal-form";
import { ProposalCard } from "./proposal-card";

interface GovernanceInterfaceProps {
  community: CommunityData;
  userStatus: UserCommunityStatus;
}

export function GovernanceInterface({
  community,
  userStatus,
}: GovernanceInterfaceProps) {
  const [activeTab, setActiveTab] = useState<"proposals" | "create">(
    "proposals"
  );
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  // Load proposals
  const loadProposals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const allProposals = await getAllProposals(community.governor);
      setProposals(allProposals);

      // If no proposals were loaded, it might be due to RPC issues
      // But we don't show an error unless there's an actual exception
      if (allProposals.length === 0) {
        // This is fine - might just be no proposals yet or RPC temporarily unavailable
        // The UI will show "No Proposals Yet" message
      }
    } catch (err: unknown) {
      console.error("Failed to load proposals:", err);

      // Provide more helpful error messages
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorCode = (err as { code?: number })?.code;

      if (
        errorMessage.includes("503") ||
        errorMessage.includes("no backend") ||
        errorCode === -32011
      ) {
        setError(
          "RPC endpoint temporarily unavailable. Please try again in a few moments."
        );
      } else if (errorMessage.includes("timeout")) {
        setError(
          "Request timed out. The network may be slow. Please try again."
        );
      } else {
        setError("Failed to load proposals. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [community.governor]);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  // Filter proposals based on selected filter
  const filteredProposals = proposals.filter((proposal) => {
    switch (filter) {
      case "active":
        return proposal.state === ProposalState.ACTIVE;
      case "completed":
        return [
          ProposalState.SUCCEEDED,
          ProposalState.DEFEATED,
          ProposalState.EXECUTED,
          ProposalState.EXPIRED,
          ProposalState.CANCELED,
        ].includes(proposal.state);
      default:
        return true;
    }
  });

  // Handle proposal creation success
  const handleProposalSuccess = () => {
    setActiveTab("proposals");
    loadProposals(); // Reload proposals
  };

  // Handle vote success
  const handleVoteSuccess = () => {
    loadProposals(); // Reload proposals to update vote counts
  };

  const tabs = [
    { id: "proposals" as const, name: "Proposals", icon: "📋" },
    // Only show create tab for non-creators
    ...(userStatus.isCreator
      ? []
      : [{ id: "create" as const, name: "Create Proposal", icon: "✏️" }]),
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Governance Dashboard
            </h2>
            <p className="text-gray-600">
              Participate in community decisions and shape the future
            </p>
          </div>
          <div className="text-right">
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="text-sm text-gray-600">Your Role</div>
              <div className="text-lg font-semibold text-green-600 capitalize">
                {userStatus.role}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                NFTs: {userStatus.nftBalance.toString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Community Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-2">NFT Collection</h3>
          <div className="text-sm text-gray-600">
            <div className="font-mono">
              {community.nftName} ({community.nftSymbol})
            </div>
            <div className="font-mono text-xs mt-1 break-all">
              {community.nft.slice(0, 20)}...
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-2">
            Governor Contract
          </h3>
          <div className="text-sm text-gray-600">
            <div className="font-mono text-xs break-all">
              {community.governor.slice(0, 20)}...
            </div>
            <div className="text-green-600 mt-1">✓ Active</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Timelock</h3>
          <div className="text-sm text-gray-600">
            <div className="font-mono text-xs break-all">
              {community.timelock.slice(0, 20)}...
            </div>
            <div className="text-blue-600 mt-1">⏱ Configured</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === "proposals" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Proposals</h3>
              {/* Only show create button for non-creators */}
              {!userStatus.isCreator && (
                <Button
                  onClick={() => setActiveTab("create")}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Create Proposal
                </Button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: "all", name: "All Proposals", count: proposals.length },
                  {
                    id: "active",
                    name: "Active",
                    count: proposals.filter(
                      (p) => p.state === ProposalState.ACTIVE
                    ).length,
                  },
                  {
                    id: "completed",
                    name: "Completed",
                    count: proposals.filter((p) =>
                      [
                        ProposalState.SUCCEEDED,
                        ProposalState.DEFEATED,
                        ProposalState.EXECUTED,
                        ProposalState.EXPIRED,
                        ProposalState.CANCELED,
                      ].includes(p.state)
                    ).length,
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() =>
                      setFilter(tab.id as "all" | "active" | "completed")
                    }
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      filter === tab.id
                        ? "border-purple-500 text-purple-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {tab.name} ({tab.count})
                  </button>
                ))}
              </nav>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading proposals...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-red-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Error Loading Proposals
                    </h3>
                    <div className="mt-1 text-sm text-red-700">{error}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <Button variant="outline" onClick={loadProposals}>
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {/* Proposals List */}
            {!loading && !error && (
              <>
                {filteredProposals.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <div className="text-gray-400 text-6xl mb-4">📋</div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      {filter === "all"
                        ? "No Proposals Yet"
                        : `No ${
                            filter.charAt(0).toUpperCase() + filter.slice(1)
                          } Proposals`}
                    </h4>
                    <p className="text-gray-600 mb-4">
                      {filter === "all"
                        ? userStatus.isCreator
                          ? "No proposals have been created yet. Community members with NFTs can create proposals."
                          : "Be the first to create a proposal for this community"
                        : userStatus.isCreator
                        ? `No ${filter} proposals found. Try a different filter.`
                        : `No ${filter} proposals found. Try a different filter or create a new proposal.`}
                    </p>
                    {/* Only show create button for non-creators */}
                    {!userStatus.isCreator && (
                      <Button
                        onClick={() => setActiveTab("create")}
                        variant="outline"
                      >
                        Create {filter === "all" ? "First" : "New"} Proposal
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {filteredProposals.map((proposal) => (
                      <ProposalCard
                        key={proposal.id.toString()}
                        proposal={proposal}
                        communityId={community.communityId.toString()}
                        governorAddress={community.governor}
                        onVoteSuccess={handleVoteSuccess}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "create" && !userStatus.isCreator && (
          <CreateProposalForm
            community={community}
            userStatus={userStatus}
            onSuccess={handleProposalSuccess}
            onCancel={() => setActiveTab("proposals")}
          />
        )}
      </div>
    </div>
  );
}
