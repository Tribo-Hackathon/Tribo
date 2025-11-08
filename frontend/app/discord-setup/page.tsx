"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getCommunityData, CommunityData } from "@/lib/contracts/community";
import { DiscordIntegration } from "@/app/community/[communityId]/components/discord-integration";
import { Button } from "@/components/ui/button";

export default function DiscordSetupPage() {
  const [community, setCommunity] = useState<CommunityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const communityId = searchParams.get('communityId');

  useEffect(() => {
    const loadCommunityData = async () => {
      if (!communityId) return;

      try {
        setLoading(true);
        setError(null);

        const communityData = await getCommunityData(BigInt(communityId));
        if (!communityData) {
          setError("Community not found");
          return;
        }

        setCommunity(communityData);
      } catch (err) {
        console.error("Failed to load community:", err);
        setError("Failed to load community data");
      } finally {
        setLoading(false);
      }
    };

    loadCommunityData();
  }, [communityId]);

  return (
    <div className="max-w-6xl mx-auto">

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading community data...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center mb-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">Community Not Found</h3>
          <p className="text-yellow-800 mb-4">
            {error} You can still use this guide for general Discord setup.
          </p>
        </div>
      )}

      {/* Discord Integration Component */}
      {community ? (
        <DiscordIntegration community={community} />
      ) : !loading && (
        /* Generic Discord Setup Guide */
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Discord Integration Setup Guide
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Learn how to create a token-gated Discord server for your DAO community.
              This guide works for any NFT-based community project.
            </p>
          </div>

          {/* Generic Setup Steps */}
          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Setup Overview</h2>

            <div className="space-y-8">
              {/* Step 1 */}
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Discord Server</h3>
                  <p className="text-gray-600 mb-3">
                    Use our pre-configured template to set up a Discord server optimized for DAO communities.
                  </p>
                  <Button
                    onClick={() => window.open("https://discord.new/UMM4mg6jZgGw", "_blank")}
                    className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
                  >
                    Create Discord Server
                  </Button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                  2
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Add Collab.Land Bot</h3>
                  <p className="text-gray-600 mb-3">
                    Install Collab.Land to enable NFT-based token gating for your Discord server.
                  </p>
                  <Button
                    onClick={() => window.open("https://collab.land/", "_blank")}
                    className="bg-[#00D4AA] hover:bg-[#00B894] text-white"
                  >
                    Add Collab.Land
                  </Button>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                  3
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Configure Token Gating</h3>
                  <p className="text-gray-600 mb-3">
                    Set up role assignment based on NFT ownership using these settings:
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-900">Chain Type:</span>
                        <div className="text-gray-700">Base</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Token Type:</span>
                        <div className="text-gray-700">ERC721 (NFT)</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Balance Min:</span>
                        <div className="text-gray-700">1</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Balance Max:</span>
                        <div className="text-gray-700">Leave blank</div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <span className="font-medium text-gray-900">NFT Contract Address:</span>
                      <div className="text-gray-700 text-sm mt-1">
                        Use your community's NFT contract address from your DAO platform
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">
              Need Help with Your Specific Community?
            </h3>
            <p className="text-purple-800 mb-4">
              If you have a specific community, we can provide customized setup instructions with your NFT contract address.
            </p>
            <Link href="/community">
              <Button className="bg-purple-600 hover:bg-purple-700">
                Browse Communities
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
