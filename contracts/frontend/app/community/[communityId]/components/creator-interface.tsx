"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { CommunityData, UserCommunityStatus } from "@/lib/contracts/community";
import { GovernanceInterface } from "./governance-interface";

interface CreatorInterfaceProps {
  community: CommunityData;
  userStatus: UserCommunityStatus;
}

export function CreatorInterface({
  community,
  userStatus,
}: CreatorInterfaceProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "governance" | "settings"
  >("overview");
  const router = useRouter();
  useAccount(); // For potential future use

  const handleTabClick = (tabId: string) => {
    if (tabId === "discord") {
      // Navigate to standalone Discord setup page
      router.push(
        `/discord-setup?communityId=${community.communityId.toString()}`
      );
    } else {
      setActiveTab(tabId as "overview" | "governance" | "settings");
    }
  };

  const tabs = [
    { id: "overview" as const, name: "Overview", icon: "📊" },
    { id: "governance" as const, name: "Governance", icon: "🏛️" },
    { id: "discord" as const, name: "Discord", icon: "💬" },
    { id: "settings" as const, name: "Settings", icon: "⚙️" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Creator Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Creator Dashboard
            </h2>
            <p className="text-gray-600">
              Manage your community and governance settings
            </p>
          </div>
          <div className="text-right">
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="text-sm text-gray-600">Your Status</div>
              <div className="text-lg font-semibold text-purple-600">
                👑 Creator
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Full Admin Access
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
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
        {activeTab === "overview" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">👥</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">
                      Total Members
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">-</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">📋</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">
                      Active Proposals
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">0</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">🎨</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">
                      NFTs Minted
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">-</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">💰</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">
                      Treasury
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">-</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Community Contracts
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      NFT Contract
                    </span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Active
                    </span>
                  </div>
                  <div className="font-mono text-xs text-gray-600 bg-gray-50 p-2 rounded break-all">
                    {community.nft}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Governor Contract
                    </span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Active
                    </span>
                  </div>
                  <div className="font-mono text-xs text-gray-600 bg-gray-50 p-2 rounded break-all">
                    {community.governor}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Timelock Contract
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Configured
                    </span>
                  </div>
                  <div className="font-mono text-xs text-gray-600 bg-gray-50 p-2 rounded break-all">
                    {community.timelock}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "governance" && (
          <GovernanceInterface community={community} userStatus={userStatus} />
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900">
              Community Settings
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">
                  Basic Information
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Community ID
                    </label>
                    <input
                      type="text"
                      value={community.communityId.toString()}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      NFT Collection Name
                    </label>
                    <input
                      type="text"
                      value={community.nftName || "Loading..."}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Symbol
                    </label>
                    <input
                      type="text"
                      value={community.nftSymbol || "Loading..."}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">
                  Advanced Settings
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Metadata URI
                    </label>
                    <textarea
                      value={community.metadataURI}
                      disabled
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm"
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <span className="text-yellow-500">⚠️</span>
                      </div>
                      <div className="ml-3">
                        <h5 className="text-sm font-medium text-yellow-800">
                          Settings Locked
                        </h5>
                        <p className="text-sm text-yellow-700 mt-1">
                          Most community settings are immutable after deployment
                          for security. Future updates may allow
                          governance-based modifications.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
