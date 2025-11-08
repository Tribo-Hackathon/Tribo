"use client";

import { useState } from "react";
import { CommunityData } from "@/lib/contracts/community";
import { Button } from "@/components/ui/button";

interface DiscordIntegrationProps {
  community: CommunityData;
}

export function DiscordIntegration({ community }: DiscordIntegrationProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [serverCreated, setServerCreated] = useState(false);
  const [collabLandAdded, setCollabLandAdded] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState(false);

  const nftAddress = community.nft;
  const communityName =
    community.nftName || `Community #${community.communityId.toString()}`;

  // Copy NFT address to clipboard
  const copyNFTAddress = async () => {
    try {
      await navigator.clipboard.writeText(nftAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  };

  // Discord server template URL
  const discordTemplateUrl = "https://discord.new/UMM4mg6jZgGw";

  // Collab.Land URL
  const collabLandUrl = "https://collab.land/";

  const steps = [
    {
      id: 1,
      title: "Create Your Discord Server",
      description:
        "Set up a new Discord server using our pre-configured template",
      completed: serverCreated,
    },
    {
      id: 2,
      title: "Add Collab.Land Bot",
      description: "Install Collab.Land to enable NFT-based token gating",
      completed: collabLandAdded,
    },
    {
      id: 3,
      title: "Configure Token Gating",
      description: "Set up role assignment based on NFT ownership",
      completed: setupCompleted,
    },
  ];

  const getCurrentStepContent = () => {
    // Show completion screen if setup is completed
    if (setupCompleted) {
      return (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <h3 className="text-2xl font-bold text-green-900 mb-2">
              🎉 Discord Integration Complete!
            </h3>
            <p className="text-green-800 mb-6 max-w-md mx-auto">
              Your Discord server is now set up with token gating! NFT holders
              can now access exclusive channels and participate in your
              community.
            </p>

            <div className="bg-white border border-green-200 rounded-lg p-4 mb-6 max-w-lg mx-auto">
              <h4 className="font-semibold text-gray-900 mb-3">
                What&apos;s Next?
              </h4>
              <ul className="text-sm text-gray-700 space-y-2 text-left">
                <li className="flex items-center">
                  <svg
                    className="w-4 h-4 text-green-500 mr-2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Share your Discord server link with community members
                </li>
                <li className="flex items-center">
                  <svg
                    className="w-4 h-4 text-green-500 mr-2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Create governance proposals to engage your community
                </li>
                <li className="flex items-center">
                  <svg
                    className="w-4 h-4 text-green-500 mr-2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Monitor member activity and community growth
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => {
                  setSetupCompleted(false);
                  setCurrentStep(1);
                  setServerCreated(false);
                  setCollabLandAdded(false);
                }}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>View Tutorial Again</span>
              </Button>

              <Button
                onClick={() =>
                  (window.location.href = `/community/${community.communityId.toString()}`)
                }
                className="bg-purple-600 hover:bg-purple-700 flex items-center space-x-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z"
                  />
                </svg>
                <span>Go to Governance</span>
              </Button>

              <Button
                onClick={() => (window.location.href = `/community`)}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <span>Browse Communities</span>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-blue-900 mb-3">
                Step 1: Create Your Discord Server
              </h4>
              <p className="text-blue-800 mb-4">
                Click the button below to create a new Discord server using our
                pre-configured template. This template includes basic channels
                and settings optimized for DAO communities.
              </p>

              <div className="space-y-4">
                <Button
                  onClick={() => window.open(discordTemplateUrl, "_blank")}
                  className="bg-[#5865F2] hover:bg-[#4752C4] text-white flex items-center space-x-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  <span>Create Discord Server</span>
                </Button>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">
                    What happens next:
                  </h5>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Discord will open in a new tab</li>
                    <li>
                      • You&apos;ll be prompted to name your server (suggested:
                      &quot;
                      {communityName} DAO&quot;)
                    </li>
                    <li>
                      • The template will create basic channels for your
                      community
                    </li>
                    <li>
                      • You&apos;ll become the server owner with full admin
                      permissions
                    </li>
                  </ul>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="server-created"
                    checked={serverCreated}
                    onChange={(e) => setServerCreated(e.target.checked)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="server-created"
                    className="text-sm text-gray-700"
                  >
                    I have successfully created my Discord server
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" disabled>
                Previous
              </Button>
              <Button
                onClick={() => setCurrentStep(2)}
                disabled={!serverCreated}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Next Step
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-green-900 mb-3">
                Step 2: Add Collab.Land Bot
              </h4>
              <p className="text-green-800 mb-4">
                Collab.Land is a bot that enables token gating for Discord
                servers. It will automatically assign roles to users based on
                their NFT ownership.
              </p>

              <div className="space-y-4">
                <Button
                  onClick={() => window.open(collabLandUrl, "_blank")}
                  className="bg-[#00D4AA] hover:bg-[#00B894] text-white flex items-center space-x-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  <span>Add Collab.Land to Discord</span>
                </Button>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">
                    Setup Instructions:
                  </h5>
                  <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                    <li>
                      Click &quot;Add to Discord&quot; on the Collab.Land
                      website
                    </li>
                    <li>Log in with your Discord account if prompted</li>
                    <li>Select your newly created server from the dropdown</li>
                    <li>Grant the necessary permissions to Collab.Land</li>
                    <li>
                      Open your Discord server to verify the bot was added
                    </li>
                  </ol>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-yellow-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h5 className="text-sm font-medium text-yellow-800">
                        Important
                      </h5>
                      <p className="text-sm text-yellow-700 mt-1">
                        Make sure you&apos;re the server owner or have
                        administrator permissions to add bots.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="collab-land-added"
                    checked={collabLandAdded}
                    onChange={(e) => setCollabLandAdded(e.target.checked)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="collab-land-added"
                    className="text-sm text-gray-700"
                  >
                    I have successfully added Collab.Land to my Discord server
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Previous
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                disabled={!collabLandAdded}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Next Step
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-purple-900 mb-3">
                Step 3: Configure Token Gating Rules
              </h4>
              <p className="text-purple-800 mb-4">
                Now you&apos;ll set up the token gating rules to automatically
                assign roles based on NFT ownership.
              </p>

              <div className="space-y-6">
                {/* NFT Address Display */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-3">
                    Your NFT Collection Address
                  </h5>
                  <p className="text-sm text-gray-600 mb-3">
                    Copy this address to use in Collab.Land configuration:
                  </p>

                  <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg">
                    <code className="flex-1 text-sm font-mono text-gray-800 break-all">
                      {nftAddress}
                    </code>
                    <Button
                      onClick={copyNFTAddress}
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0"
                    >
                      {copiedAddress ? (
                        <div className="flex items-center space-x-1">
                          <svg
                            className="w-4 h-4 text-green-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-green-600">Copied!</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                          <span>Copy</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Configuration Instructions */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-3">
                    Collab.Land Configuration:
                  </h5>
                  <ol className="text-sm text-gray-700 space-y-3 list-decimal list-inside">
                    <li>
                      <strong>Open your Discord server</strong> and look for the
                      Collab.Land bot
                    </li>
                    <li>
                      <strong>Go to Token Gating Rules</strong> section in
                      Collab.Land
                    </li>
                    <li>
                      <strong>Select the Member role</strong> (or create a new
                      role for NFT holders)
                    </li>
                    <li>
                      <strong>Fill in the following fields:</strong>
                      <div className="ml-6 mt-2 space-y-2">
                        <div className="bg-white p-3 rounded border">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-900">
                                Chain Type:
                              </span>
                              <div className="text-gray-700">Base</div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">
                                Token Type:
                              </span>
                              <div className="text-gray-700">ERC721 (NFT)</div>
                            </div>
                            <div className="col-span-2">
                              <span className="font-medium text-gray-900">
                                Address:
                              </span>
                              <div className="text-gray-700 font-mono text-xs break-all">
                                {nftAddress}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">
                                Token ID:
                              </span>
                              <div className="text-gray-700">Leave blank</div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">
                                Balance Min:
                              </span>
                              <div className="text-gray-700">1</div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">
                                Balance Max:
                              </span>
                              <div className="text-gray-700">Leave blank</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                    <li>
                      <strong>Save the configuration</strong> and test with your
                      own wallet
                    </li>
                  </ol>
                </div>

                {/* Verification */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="font-medium text-green-900 mb-2">
                    Verification Steps:
                  </h5>
                  <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside">
                    <li>
                      Join your Discord server with an account that owns the NFT
                    </li>
                    <li>
                      Follow Collab.Land&apos;s verification process (usually
                      involves connecting wallet)
                    </li>
                    <li>Confirm that the role is automatically assigned</li>
                    <li>Test access to any role-restricted channels</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                Previous
              </Button>
              <Button
                onClick={() => {
                  setSetupCompleted(true);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Complete Setup
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Discord Integration Setup
        </h3>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Create a token-gated Discord server for your community. Only NFT
          holders will be able to access exclusive channels and participate in
          discussions.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-8 mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                  setupCompleted
                    ? "bg-green-600 text-white"
                    : currentStep === step.id
                    ? "bg-purple-600 text-white"
                    : step.completed
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {step.completed || setupCompleted ? (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              <div className="ml-3 text-left">
                <div className="text-sm font-medium text-gray-900">
                  {step.title}
                </div>
                <div className="text-xs text-gray-500">{step.description}</div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className="w-8 h-px bg-gray-300 mx-4"></div>
            )}
          </div>
        ))}
      </div>

      {/* Current Step Content */}
      <div className="max-w-4xl mx-auto">{getCurrentStepContent()}</div>
    </div>
  );
}
