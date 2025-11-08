"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { getAllCommunities, Community } from "@/lib/contracts/registry";
// Utility function to format date
function formatTimeAgo(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

export default function CommunityDiscoveryPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false); // Prevent multiple simultaneous calls

  const loadCommunities = async () => {
    // Prevent multiple simultaneous calls
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      const allCommunities = await getAllCommunities();
      setCommunities(allCommunities);
    } catch (err: unknown) {
      console.error("Failed to load communities:", err);

      // Provide more helpful error messages
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (
        errorMessage.includes("429") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("over rate limit")
      ) {
        setError(
          "RPC endpoint is rate-limited. Please wait a moment and try again."
        );
      } else {
        setError("Failed to load communities. Please try again.");
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    loadCommunities();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading communities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              Error Loading Communities
            </h2>
            <p className="text-red-600">{error}</p>
            <button
              onClick={loadCommunities}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Discover Communities
        </h1>
        <p className="text-gray-600">
          Explore all communities on the platform. Join by minting an NFT or
          participate in governance if you&apos;re already a member.
        </p>
      </div>

      {communities.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              No Communities Yet
            </h2>
            <p className="text-gray-600 mb-4">
              Be the first to create a community on the platform!
            </p>
            <Link
              href="/create"
              className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create Community
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communities.map((community) => (
            <Link
              key={community.communityId.toString()}
              href={`/community/${community.communityId}`}
              className="block group"
            >
              <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-purple-300 transition-all duration-200 group-hover:scale-[1.02]">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                      Community #{community.communityId.toString()}
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <span className="font-medium">Creator:</span>
                        <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-xs">
                          {community.creator.slice(0, 6)}...
                          {community.creator.slice(-4)}
                        </code>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium">Created:</span>
                        <span className="ml-2">
                          {formatTimeAgo(community.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                      {community.communityId.toString()}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                    <div>
                      <span className="font-medium">NFT:</span>
                      <div className="font-mono mt-1">
                        {community.nft.slice(0, 8)}...
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Governor:</span>
                      <div className="font-mono mt-1">
                        {community.governor.slice(0, 8)}...
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-purple-600 font-medium group-hover:text-purple-700">
                    View Community →
                  </span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-12 text-center">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Ready to Create Your Own?
          </h2>
          <p className="text-gray-600 mb-4">
            Start your own community with custom governance and NFT access.
          </p>
          <Link
            href="/create"
            className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Create Community
          </Link>
        </div>
      </div>
    </div>
  );
}
