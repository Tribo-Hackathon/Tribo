"use client";

import { useAccount } from "wagmi";
import { CustomConnectButton } from "@/components/ui/custom-connect-button";
import { CreateForm } from "./components/create-form";

export default function CreatePage() {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center space-y-4 sm:space-y-6 max-w-md mx-auto">
          <div className="space-y-3 sm:space-y-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Create Your Community
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Connect your wallet to start building your creator community with
              automated Discord integration and DAO governance.
            </p>
          </div>
          <CustomConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
      <div className="text-center space-y-2 sm:space-y-4">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 px-4">
          Create Your Community
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-4">
          Set up your creator community in just a few simple steps
        </p>
      </div>

      <CreateForm />
    </div>
  );
}
