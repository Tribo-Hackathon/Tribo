"use client";

import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Rocket,
  CheckCircle,
  Server,
  Loader2,
  ExternalLink,
  Copy,
  AlertCircle,
} from "lucide-react";
import { CreateCommunityFormData } from "../hooks/use-create-form";
import { DeploymentResult, TransactionStatus } from "@/lib/contracts/types";
import {
  formatTransactionHash,
  getTransactionUrl,
} from "@/lib/contracts/utils";
import { COMMUNITY_DEFAULTS } from "@/lib/contracts/constants";
import Link from "next/link";

interface PreviewStepProps {
  form: UseFormReturn<CreateCommunityFormData>;
  onPrev: () => void;
  onDeploy: (data: CreateCommunityFormData) => Promise<void>;
  isDeploying: boolean;
  deploymentSuccess: boolean;
  deploymentResult: DeploymentResult | null;
  transactionStatus: TransactionStatus;
}

export function PreviewStep({
  form,
  onPrev,
  onDeploy,
  isDeploying,
  deploymentSuccess,
  deploymentResult,
  transactionStatus,
}: PreviewStepProps) {
  const formData = form.getValues();

  if (deploymentSuccess) {
    return (
      <div className="text-center space-y-8">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-gray-900">
            Community Created Successfully!
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your community &quot;{COMMUNITY_DEFAULTS.NAME}&quot; has been
            deployed and is ready for members.
          </p>
        </div>

        {/* Transaction Details */}
        {deploymentResult && transactionStatus.hash && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
            <h3 className="font-semibold text-blue-900 mb-3">
              Deployment Details
            </h3>
            <div className="text-sm text-blue-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Transaction Hash:</span>
                <div className="flex items-center space-x-2">
                  <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                    {formatTransactionHash(transactionStatus.hash)}
                  </code>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(transactionStatus.hash!)
                    }
                    className="text-blue-600 hover:text-blue-800"
                    title="Copy transaction hash"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <a
                    href={getTransactionUrl(transactionStatus.hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                    title="View on block explorer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
              {deploymentResult.contractAddresses && (
                <div className="pt-2 border-t border-blue-200">
                  <p className="font-medium mb-2">Deployed Contracts:</p>
                  <div className="space-y-1 text-xs">
                    {deploymentResult.contractAddresses.community && (
                      <div>
                        Community:{" "}
                        <code className="bg-blue-100 px-1 rounded">
                          {deploymentResult.contractAddresses.community}
                        </code>
                      </div>
                    )}
                    {deploymentResult.contractAddresses.nft && (
                      <div>
                        NFT:{" "}
                        <code className="bg-blue-100 px-1 rounded">
                          {deploymentResult.contractAddresses.nft}
                        </code>
                      </div>
                    )}
                    {deploymentResult.contractAddresses.governance && (
                      <div>
                        Governance:{" "}
                        <code className="bg-blue-100 px-1 rounded">
                          {deploymentResult.contractAddresses.governance}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-2xl mx-auto">
          <h3 className="font-semibold text-green-900 mb-4">
            What&apos;s Next?
          </h3>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-purple-900 mb-2">
                  Set up Discord Integration
                </h4>
                <p className="text-purple-800 mb-4 max-w-md mx-auto">
                  <strong>Essential next step:</strong> Create a token-gated
                  Discord server to connect with your community members
                </p>
                {deploymentResult?.contractAddresses?.community && (
                  <Link
                    href={`/discord-setup?communityId=${deploymentResult.contractAddresses.community}`}
                  >
                    <Button
                      size="lg"
                      className="bg-purple-600 hover:bg-purple-700 text-white flex items-center space-x-2 mx-auto shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                      </svg>
                      <span className="font-semibold">
                        Start Discord Setup Now
                      </span>
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-green-900">
                  Create Governance Proposals
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Engage your community with voting and decision-making
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-green-900">
                  Manage Your Community
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Monitor members, track activity, and grow your DAO
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {deploymentResult?.contractAddresses?.community && (
            <Link
              href={`/community/${deploymentResult.contractAddresses.community}`}
            >
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                Manage Your Community
              </Button>
            </Link>
          )}
          <Link href="/community">
            <Button variant="outline" size="lg">
              Browse Communities
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="lg">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Review & Deploy</h2>
        <p className="text-gray-600">
          Review your community settings before deployment
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
            DAO Configuration
          </h3>

          <div className="grid gap-4">
            <div className="flex items-start space-x-3">
              <Server className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900">DAO Name</div>
                <div className="text-gray-600">{formData.serverName}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-purple-900 mb-3">
            What will be created:
          </h3>
          <ul className="text-sm text-purple-800 space-y-2">
            <li className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              DAO governance system ({COMMUNITY_DEFAULTS.NAME})
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              NFT collection for community access ({COMMUNITY_DEFAULTS.SYMBOL})
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Smart contract deployment on blockchain
            </li>
          </ul>
        </div>

        {/* Transaction Status Display */}
        {transactionStatus.status !== "idle" && (
          <div
            className={`rounded-lg p-6 mt-6 ${
              transactionStatus.status === "pending"
                ? "bg-blue-50 border border-blue-200"
                : transactionStatus.status === "success"
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex items-center space-x-3">
              {transactionStatus.status === "pending" && (
                <>
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <div>
                    <h3 className="font-semibold text-blue-900">
                      Transaction Pending
                    </h3>
                    <p className="text-sm text-blue-800">
                      Your transaction is being processed on the blockchain...
                    </p>
                    {transactionStatus.hash && (
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="text-xs text-blue-700">Hash:</span>
                        <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                          {formatTransactionHash(transactionStatus.hash)}
                        </code>
                        <a
                          href={getTransactionUrl(transactionStatus.hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>
                </>
              )}

              {transactionStatus.status === "error" && (
                <>
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-red-900">
                      Deployment Failed
                    </h3>
                    <p className="text-sm text-red-800 break-words whitespace-pre-wrap">
                      {transactionStatus.error ||
                        "An unknown error occurred during deployment."}
                    </p>
                    {transactionStatus.hash && (
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="text-xs text-red-700">Hash:</span>
                        <code className="bg-red-100 px-2 py-1 rounded text-xs">
                          {formatTransactionHash(transactionStatus.hash)}
                        </code>
                        <a
                          href={getTransactionUrl(transactionStatus.hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-600 hover:text-red-800"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Button
            variant="outline"
            onClick={onPrev}
            disabled={isDeploying}
            className="flex-1"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Edit
          </Button>

          <Button
            onClick={() => onDeploy(formData)}
            disabled={isDeploying}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
            size="lg"
          >
            {isDeploying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-4 w-4" />
                Deploy Community
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
