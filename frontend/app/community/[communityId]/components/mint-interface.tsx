"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import Image from "next/image";
import { CommunityData, mintNFT } from "@/lib/contracts/community";
import { Button } from "@/components/ui/button";

interface MintInterfaceProps {
  community: CommunityData;
  onMintSuccess?: () => void;
}

export function MintInterface({
  community,
  onMintSuccess,
}: MintInterfaceProps) {
  const [isMinting, setIsMinting] = useState(false);
  const [mintStatus, setMintStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { address, isConnected } = useAccount();

  const handleMint = async () => {
    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    setIsMinting(true);
    setMintStatus("pending");
    setError(null);
    setTxHash(null);

    try {
      const hash = await mintNFT(community.nft);
      setTxHash(hash);
      setMintStatus("success");

      // Call success callback after a short delay to allow for blockchain confirmation
      setTimeout(() => {
        onMintSuccess?.();
      }, 2000);
    } catch (err) {
      console.error("Mint failed:", err);

      // Handle specific contract errors
      let errorMessage = "Minting failed";
      if (err instanceof Error) {
        if (err.message.includes("Price feed unavailable")) {
          errorMessage =
            "Price feed temporarily unavailable. Please try again in a few minutes.";
        } else if (err.message.includes("Incorrect payment amount")) {
          errorMessage =
            "Payment amount mismatch. Please refresh the page and try again.";
        } else if (err.message.includes("User rejected")) {
          errorMessage = "Transaction was rejected by user";
        } else if (err.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds to pay for gas and mint price";
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      setMintStatus("error");
    } finally {
      setIsMinting(false);
    }
  };

  const mintPriceInEth = community.mintPrice
    ? formatEther(community.mintPrice)
    : "0";

  const mintPriceInUSD = community.mintPriceUSD
    ? (Number(community.mintPriceUSD) / 100).toFixed(2)
    : "0.00";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-8">
          {/* NFT Image Section */}
          <div className="text-center lg:text-left">
            <div className="relative w-80 h-80 mx-auto lg:mx-0 mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-blue-500 rounded-2xl transform rotate-3"></div>
              <div className="relative bg-white rounded-2xl p-4 shadow-lg">
                <Image
                  src="/images/nft-preview.png"
                  alt={`${community.nftName} NFT Preview`}
                  width={300}
                  height={300}
                  className="w-full h-full object-cover rounded-xl"
                  priority
                />
              </div>
            </div>
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium mb-2">
                #{community.communityId.toString()}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                {community.nftName}
              </h3>
              <p className="text-gray-600 text-sm">
                {community.nftSymbol} Collection
              </p>
            </div>
          </div>

          {/* Content Section */}
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Join the Community
            </h2>
            <p className="text-gray-600 mb-6 text-lg">
              Mint an NFT to become a member and participate in governance
            </p>

            {/* Dynamic Pricing Display */}
            <div className="bg-white rounded-lg p-4 mb-6 border border-purple-200">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Current Mint Price</p>
                {community.mintPrice ? (
                  <>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-2xl font-bold text-purple-600">
                        {mintPriceInEth} ETH
                      </span>
                      {community.mintPriceUSD && (
                        <span className="text-lg text-gray-500">
                          (${mintPriceInUSD})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Price updates automatically via Chainlink
                    </p>
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-yellow-600 mb-1">
                      Pricing temporarily unavailable
                    </p>
                    <p className="text-xs text-gray-500">
                      You can still mint - the price will be calculated at mint
                      time
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Key Benefits */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-center lg:justify-start">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                <span className="text-gray-700">
                  Voting rights on proposals
                </span>
              </div>
              <div className="flex items-center justify-center lg:justify-start">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                <span className="text-gray-700">Create new proposals</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                <span className="text-gray-700">
                  Exclusive community access
                </span>
              </div>
            </div>

            {/* Mint Price Highlight */}
            <div className="bg-white rounded-lg p-4 border border-purple-200 mb-6">
              <div className="text-center lg:text-left">
                <p className="text-sm text-gray-600 mb-1">Mint Price</p>
                <p className="text-3xl font-bold text-purple-600">
                  {mintPriceInEth} ETH
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Technical Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">
                Contract Address:
              </span>
              <div className="mt-1">
                <div className="font-mono text-xs text-gray-500 break-all">
                  {community.nft}
                </div>
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Creator:</span>
              <div className="mt-1">
                <div className="font-mono text-gray-600">
                  {community.creator.slice(0, 6)}...
                  {community.creator.slice(-4)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {!isConnected ? (
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Connect your wallet to mint an NFT
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                Please connect your wallet using the button in the top
                navigation
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {mintStatus === "success" && txHash && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-white"
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
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      NFT Minted Successfully!
                    </h3>
                    <div className="mt-1 text-sm text-green-700">
                      <p>
                        Transaction:{" "}
                        <code className="bg-green-100 px-1 rounded text-xs">
                          {txHash.slice(0, 10)}...{txHash.slice(-8)}
                        </code>
                      </p>
                      <p className="mt-1">
                        You now have access to governance features!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Minting Failed
                    </h3>
                    <div className="mt-1 text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center">
              <Button
                onClick={handleMint}
                disabled={isMinting || mintStatus === "success"}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMinting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Minting...
                  </div>
                ) : mintStatus === "success" ? (
                  "Minted Successfully!"
                ) : community.mintPrice ? (
                  `Mint NFT for ${mintPriceInEth} ETH${
                    community.mintPriceUSD ? ` ($${mintPriceInUSD})` : ""
                  }`
                ) : (
                  "Mint NFT"
                )}
              </Button>
            </div>

            {mintStatus === "pending" && (
              <div className="text-center text-sm text-gray-600">
                <p>Please confirm the transaction in your wallet...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
