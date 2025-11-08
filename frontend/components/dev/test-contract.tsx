"use client";

import { useState } from "react";
import { createPublicClient, http } from "viem";
import {
  CONTRACT_ADDRESSES,
  ENVIRONMENT,
  ANVIL_CHAIN,
} from "@/lib/contracts/config";

// NFT Contract ABI - just the balanceOf function we need
const NFT_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Test address for demonstration
const TEST_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

export function TestContract() {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testBalanceOf = async () => {
    setLoading(true);
    setError(null);
    setBalance(null);

    try {
      // Create public client with custom Anvil chain from config
      const client = createPublicClient({
        chain: ANVIL_CHAIN,
        transport: http(ENVIRONMENT.RPC_URL),
      });

      // Call the contract using NFT address from config
      const result = await client.readContract({
        address: CONTRACT_ADDRESSES.NFT,
        abi: NFT_ABI,
        functionName: "balanceOf",
        args: [TEST_ADDRESS],
      });

      setBalance(result.toString());
    } catch (err) {
      console.error("Contract call failed:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        🧪 Contract Test Component
      </h3>

      <div className="space-y-3 text-sm">
        <div>
          <span className="font-medium">NFT Contract:</span>{" "}
          <code className="bg-gray-200 px-2 py-1 rounded text-xs">
            {CONTRACT_ADDRESSES.NFT}
          </code>
        </div>
        <div>
          <span className="font-medium">Test Address:</span>{" "}
          <code className="bg-gray-200 px-2 py-1 rounded text-xs">
            {TEST_ADDRESS}
          </code>
        </div>
        <div>
          <span className="font-medium">RPC URL:</span>{" "}
          <code className="bg-gray-200 px-2 py-1 rounded text-xs">
            {ENVIRONMENT.RPC_URL}
          </code>
        </div>
        <div>
          <span className="font-medium">Factory Contract:</span>{" "}
          <code className="bg-gray-200 px-2 py-1 rounded text-xs">
            {CONTRACT_ADDRESSES.FACTORY}
          </code>
        </div>
      </div>

      <button
        onClick={testBalanceOf}
        disabled={loading}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Testing..." : "Test balanceOf()"}
      </button>

      {balance !== null && (
        <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded">
          <span className="font-medium text-green-800">Balance:</span>{" "}
          <code className="text-green-900">{balance}</code>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
          <span className="font-medium text-red-800">Error:</span>{" "}
          <code className="text-red-900 text-xs">{error}</code>
        </div>
      )}
    </div>
  );
}
