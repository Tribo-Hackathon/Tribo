"use client";

import { useEffect, useState, use, useCallback, useRef } from "react";
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
  const loadingRef = useRef(false); // Prevent multiple simultaneous calls
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastErrorTimeRef = useRef<number>(0);

  const { address, isConnected } = useAccount();

  const loadCommunityData = useCallback(
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

        const communityId = BigInt(resolvedParams.communityId);
        const communityData = await getCommunityData(communityId);

        if (!communityData) {
          setError("Community not found");
          return;
        }

        setCommunity(communityData);

        // If user is connected, get their status
        // Add a small delay to avoid rate limits if we just loaded community data
        if (isConnected && address) {
          // Small delay to avoid hitting rate limits immediately after community data fetch
          await new Promise((resolve) => setTimeout(resolve, 500));

          try {
            const status = await getUserCommunityStatus(address, communityData);
            setUserStatus(status);
          } catch (err: unknown) {
            console.warn(
              "Failed to get user status (may be rate limited):",
              err
            );
            // Set default status if we can't fetch it
            setUserStatus({
              role: "visitor",
              nftBalance: BigInt(0),
              isCreator: false,
              canVote: false,
            });
          }
        } else {
          setUserStatus(null);
        }
      } catch (err: unknown) {
        console.error("Failed to load community:", err);
        lastErrorTimeRef.current = Date.now();

        // Provide more helpful error messages
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (
          errorMessage.includes("429") ||
          errorMessage.includes("rate limit") ||
          errorMessage.includes("over rate limit")
        ) {
          setError(
            "RPC endpoint is rate-limited. Retrying automatically in 10 seconds..."
          );

          // Auto-retry after 10 seconds for rate limit errors
          retryTimeoutRef.current = setTimeout(() => {
            console.log("Auto-retrying after rate limit...");
            loadCommunityData(true);
          }, 10000);
        } else {
          setError("Failed to load community data. Please try again.");
        }
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [resolvedParams.communityId, address, isConnected]
  );

  // Stable effect that only runs once per communityId change
  useEffect(() => {
    loadCommunityData();

    // Cleanup function to clear any pending retries
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [resolvedParams.communityId, loadCommunityData]); // Include loadCommunityData

  // Separate effect for when wallet connection changes
  useEffect(() => {
    // Only reload if we already have community data and wallet status changed
    if (community && !loadingRef.current) {
      const timeoutId = setTimeout(() => {
        loadCommunityData();
      }, 1000); // Small delay to avoid rapid re-requests

      return () => clearTimeout(timeoutId);
    }
  }, [address, isConnected, community, loadCommunityData]);

  // Reload data when user mints successfully
  const handleMintSuccess = useCallback(() => {
    setTimeout(() => {
      loadCommunityData();
    }, 3000); // Wait a bit for blockchain confirmation
  }, [loadCommunityData]);

  if (loading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600">
            Loading community...
          </p>
        </div>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6 md:p-8 max-w-md mx-auto">
            <div className="text-red-400 text-4xl sm:text-6xl mb-3 sm:mb-4">
              ❌
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-red-800 mb-2">
              {error || "Community Not Found"}
            </h2>
            <p className="text-sm sm:text-base text-red-600 mb-4">
              The community you&apos;re looking for doesn&apos;t exist or
              couldn&apos;t be loaded.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center">
              <button
                onClick={() => window.history.back()}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors text-sm sm:text-base"
              >
                Go Back
              </button>
              <button
                onClick={() => loadCommunityData(true)}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors text-sm sm:text-base"
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
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="max-w-2xl mx-auto">
          {/* Community Header */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 md:mb-8 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl font-bold mx-auto mb-3 sm:mb-4">
              #{community.communityId.toString()}
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Community #{community.communityId.toString()}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              {community.nftName} ({community.nftSymbol})
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                Connect Your Wallet
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                Please connect your wallet to view your role and interact with
                this community.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <p className="text-blue-800 text-xs sm:text-sm">
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
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Checking your access...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
      {/* Community Header */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-lg sm:text-xl font-bold flex-shrink-0">
                #{community.communityId.toString()}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 break-words">
                  {community.nftName}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                  <span className="font-medium">{community.nftSymbol}</span> •
                  Created by{" "}
                  <span className="font-mono">
                    {community.creator.slice(0, 6)}...
                    {community.creator.slice(-4)}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex-shrink-0">
              <div
                className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap ${
                  userStatus.role === "creator"
                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                    : userStatus.nftBalance > BigInt(0)
                    ? "bg-green-100 text-green-800 border border-green-200"
                    : "bg-gray-100 text-gray-800 border border-gray-200"
                }`}
              >
                <span className="text-base sm:text-lg">
                  {userStatus.role === "creator" && "👑"}
                  {userStatus.role === "visitor" &&
                    userStatus.nftBalance > BigInt(0) &&
                    "✅"}
                  {userStatus.role === "visitor" &&
                    userStatus.nftBalance === BigInt(0) &&
                    "👤"}
                </span>
                <span>
                  {userStatus.role === "creator"
                    ? "Creator"
                    : userStatus.nftBalance > BigInt(0)
                    ? "NFT Holder"
                    : "Visitor"}
                </span>
              </div>
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
