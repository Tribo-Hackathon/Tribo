"use client";

import { useEffect, useState, use, useCallback } from "react";
import { useAccount } from "wagmi";
import {
  getCommunityData,
  getUserCommunityStatus,
  CommunityData,
  UserCommunityStatus,
} from "@/lib/contracts/community";
import { MintInterface } from "./components/mint-interface";
import { CreatorInterface } from "./components/creator-interface";
import { GovernanceInterface } from "./components/governance-interface";

interface CommunityPageProps {
  params: Promise<{ communityId: string }>;
}

export default function CommunityPage({ params }: CommunityPageProps) {
  const resolvedParams = use(params);
  const [community, setCommunity] = useState<CommunityData | null>(null);
  const [userStatus, setUserStatus] = useState<UserCommunityStatus | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();

  const loadCommunityData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const communityId = BigInt(resolvedParams.communityId);

      // Add a small delay to debounce rapid calls
      await new Promise((resolve) => setTimeout(resolve, 100));

      const communityData = await getCommunityData(communityId);

      if (!communityData) {
        setError("Community not found");
        return;
      }

      setCommunity(communityData);

      // If user is connected, get their status
      if (isConnected && address) {
        const status = await getUserCommunityStatus(address, communityData);
        setUserStatus(status);
      } else {
        setUserStatus(null);
      }
    } catch (err) {
      console.error("Failed to load community:", err);

      // Check if it's a rate limit error and show appropriate message
      if (err instanceof Error && err.message.includes("rate limit")) {
        setError("Too many requests. Please wait a moment and try again.");
      } else {
        setError("Failed to load community data");
      }
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.communityId, address, isConnected]);

  useEffect(() => {
    loadCommunityData();
  }, [loadCommunityData]);

  // Reload data when user mints successfully
  const handleMintSuccess = useCallback(() => {
    setTimeout(() => {
      loadCommunityData();
    }, 3000); // Wait a bit for blockchain confirmation
  }, [loadCommunityData]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading community...</p>
        </div>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md mx-auto">
            <div className="text-red-400 text-6xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              {error || "Community Not Found"}
            </h2>
            <p className="text-red-600 mb-4">
              The community you&apos;re looking for doesn&apos;t exist or
              couldn&apos;t be loaded.
            </p>
            <div className="space-x-4">
              <button
                onClick={() => window.history.back()}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={loadCommunityData}
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

  // Show wallet connection prompt if not connected
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Community Header */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 mb-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
              #{community.communityId.toString()}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Community #{community.communityId.toString()}
            </h1>
            <p className="text-gray-600 mb-6">
              {community.nftName} ({community.nftSymbol})
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Connect Your Wallet
              </h3>
              <p className="text-gray-600 mb-4">
                Please connect your wallet to view your role and interact with
                this community.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  Use the &quot;Connect Wallet&quot; button in the top
                  navigation to get started.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show appropriate interface based on user role
  if (!userStatus) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Checking your access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Community Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
              #{community.communityId.toString()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {community.nftName}
              </h1>
              <p className="text-gray-600">
                {community.nftSymbol} • Created by{" "}
                {community.creator.slice(0, 6)}...{community.creator.slice(-4)}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                userStatus.role === "creator"
                  ? "bg-purple-100 text-purple-800"
                  : userStatus.nftBalance > BigInt(0)
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {userStatus.role === "creator" && "👑 "}
              {userStatus.role === "visitor" &&
                userStatus.nftBalance > BigInt(0) &&
                "✅ "}
              {userStatus.role === "visitor" &&
                userStatus.nftBalance === BigInt(0) &&
                "👤 "}
              {userStatus.role === "creator"
                ? "Creator"
                : userStatus.nftBalance > BigInt(0)
                ? "NFT Holder"
                : "Visitor"}
            </div>
          </div>
        </div>
      </div>

      {/* Role-based Interface */}
      {userStatus.role === "creator" && (
        <CreatorInterface community={community} userStatus={userStatus} />
      )}

      {userStatus.role === "visitor" && userStatus.nftBalance > BigInt(0) && (
        <GovernanceInterface community={community} userStatus={userStatus} />
      )}

      {userStatus.role === "visitor" && userStatus.nftBalance === BigInt(0) && (
        <MintInterface
          community={community}
          onMintSuccess={handleMintSuccess}
        />
      )}
    </div>
  );
}
