"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  createProposal,
  getProposalThreshold,
  getUserVotingPower,
  getDelegatedTo,
  delegateVotes,
  ProposalType,
  CreateProposalParams,
} from "@/lib/contracts/governance";
import { CommunityData, UserCommunityStatus } from "@/lib/contracts/community";
import { Button } from "@/components/ui/button";

// Form validation schema with conditional validation
const proposalSchema = z
  .object({
    title: z
      .string()
      .min(5, "Title must be at least 5 characters")
      .max(100, "Title must be less than 100 characters"),
    summary: z
      .string()
      .min(10, "Summary must be at least 10 characters")
      .max(200, "Summary must be less than 200 characters"),
    description: z
      .string()
      .min(50, "Description must be at least 50 characters")
      .max(5000, "Description must be less than 5000 characters"),
    type: z.nativeEnum(ProposalType),
    // Treasury proposal fields
    treasuryRecipient: z.string().optional(),
    treasuryAmount: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Validate treasury fields when treasury proposal is selected
    if (data.type === ProposalType.TREASURY) {
      if (!data.treasuryRecipient || data.treasuryRecipient.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Recipient address is required for treasury proposals",
          path: ["treasuryRecipient"],
        });
      } else if (!/^0x[a-fA-F0-9]{40}$/.test(data.treasuryRecipient)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid Ethereum address format",
          path: ["treasuryRecipient"],
        });
      }

      if (!data.treasuryAmount || data.treasuryAmount.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Amount is required for treasury proposals",
          path: ["treasuryAmount"],
        });
      } else if (
        isNaN(parseFloat(data.treasuryAmount)) ||
        parseFloat(data.treasuryAmount) <= 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Amount must be a positive number",
          path: ["treasuryAmount"],
        });
      }
    }
  });

type ProposalFormData = z.infer<typeof proposalSchema>;

interface CreateProposalFormProps {
  community: CommunityData;
  userStatus: UserCommunityStatus;
  onSuccess?: (proposalId: string) => void;
  onCancel?: () => void;
}

export function CreateProposalForm({
  community,
  userStatus,
  onSuccess,
  onCancel,
}: CreateProposalFormProps) {
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "checking" | "submitting" | "success" | "error" | "delegating"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [userVotingPower, setUserVotingPower] = useState<bigint | null>(null);
  const [proposalThreshold, setProposalThreshold] = useState<bigint | null>(
    null
  );
  const [needsDelegation, setNeedsDelegation] = useState<boolean>(false);
  const [delegationTxHash, setDelegationTxHash] = useState<string | null>(null);

  const { address, isConnected } = useAccount();

  const form = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
    mode: "onChange", // Enable real-time validation
    defaultValues: {
      title: "",
      summary: "",
      description: "",
      type: ProposalType.TEXT_ONLY,
      treasuryRecipient: "",
      treasuryAmount: "",
    },
  });

  const watchedType = form.watch("type");

  // Re-validate form when proposal type changes
  useEffect(() => {
    form.trigger();
  }, [watchedType, form]);

  // Check user eligibility
  const checkEligibility = async () => {
    if (!address || !isConnected) return;

    try {
      setSubmitStatus("checking");
      setError(null);
      setNeedsDelegation(false);

      const [votingPower, threshold] = await Promise.all([
        getUserVotingPower(community.governor, address),
        getProposalThreshold(community.governor),
      ]);

      setUserVotingPower(votingPower);
      setProposalThreshold(threshold);

      // Creators can always create proposals, regardless of voting power
      if (userStatus.isCreator) {
        setSubmitStatus("idle");
        return true;
      }

      // If user has no voting power, check if they need to delegate
      if (votingPower === BigInt(0)) {
        // Check if user has NFTs but hasn't delegated
        // Note: We check delegation on the NFT contract, not the Governor's token
        const delegatedTo = await getDelegatedTo(community.nft, address);
        const isNotDelegated =
          delegatedTo === "0x0000000000000000000000000000000000000000" ||
          delegatedTo.toLowerCase() !== address.toLowerCase();

        if (isNotDelegated) {
          setNeedsDelegation(true);
          setError(
            "You need to delegate your voting power to yourself before creating proposals. Click 'Delegate Votes' below."
          );
          setSubmitStatus("error");
          return false;
        } else {
          // User has delegated but still no voting power - this indicates a contract configuration issue
          setError(
            "There appears to be a configuration issue with the governance system. The Governor contract may be using a different token than expected. Please contact the community creator."
          );
          setSubmitStatus("error");
          return false;
        }
      }

      if (votingPower < threshold) {
        setError(
          `Insufficient voting power. You have ${votingPower.toString()} votes, but need ${threshold.toString()} votes to create a proposal.`
        );
        setSubmitStatus("error");
        return false;
      }

      setSubmitStatus("idle");
      return true;
    } catch (err) {
      console.error("Failed to check eligibility:", err);
      setError("Failed to check proposal eligibility");
      setSubmitStatus("error");
      return false;
    }
  };

  // Handle vote delegation
  const handleDelegateVotes = async () => {
    if (!address || !isConnected) return;

    try {
      setSubmitStatus("delegating");
      setError(null);

      const txHash = await delegateVotes(community.nft, address);
      setDelegationTxHash(txHash);

      // Wait a bit for the transaction to be mined, then recheck eligibility
      setTimeout(async () => {
        await checkEligibility();
      }, 3000);
    } catch (err) {
      console.error("Failed to delegate votes:", err);
      setError("Failed to delegate voting power. Please try again.");
      setSubmitStatus("error");
    }
  };

  // Handle form submission
  const onSubmit = async (data: ProposalFormData) => {
    if (!address || !isConnected) {
      setError("Please connect your wallet");
      return;
    }

    // Check eligibility first
    const isEligible = await checkEligibility();
    if (!isEligible) return;

    setSubmitStatus("submitting");
    setError(null);
    setTxHash(null);

    try {
      // Prepare proposal parameters based on type
      let targets: string[] = [];
      let values: bigint[] = [];
      let calldatas: string[] = [];

      switch (data.type) {
        case ProposalType.TEXT_ONLY:
          // Text-only proposals need at least one target (Governor contract requirement)
          // Use a no-op call to the user's own address with 0 value and empty calldata
          targets = [address];
          values = [BigInt(0)];
          calldatas = ["0x"];
          break;

        case ProposalType.TREASURY:
          if (!data.treasuryRecipient || !data.treasuryAmount) {
            throw new Error(
              "Treasury recipient and amount are required for treasury proposals"
            );
          }

          // Validate recipient address
          if (!/^0x[a-fA-F0-9]{40}$/.test(data.treasuryRecipient)) {
            throw new Error("Invalid recipient address");
          }

          // Convert amount to wei (assuming ETH input)
          const amountWei = BigInt(parseFloat(data.treasuryAmount) * 1e18);

          targets = [data.treasuryRecipient];
          values = [amountWei];
          calldatas = ["0x"]; // Empty calldata for simple ETH transfer
          break;

        default:
          throw new Error("Unsupported proposal type");
      }

      const proposalParams: CreateProposalParams = {
        targets,
        values,
        calldatas,
        description: data.description,
        type: data.type,
        title: data.title,
        summary: data.summary,
      };

      // Submit proposal
      const hash = await createProposal(community.governor, proposalParams);
      setTxHash(hash);
      setSubmitStatus("success");

      // Reset form
      form.reset();

      // Call success callback
      setTimeout(() => {
        onSuccess?.(hash);
      }, 2000);
    } catch (err) {
      console.error("Failed to create proposal:", err);

      // Check for specific MetaMask/wallet errors
      if (err instanceof Error) {
        if (err.message.includes("User rejected")) {
          setError("Transaction was rejected by user");
        } else if (err.message.includes("insufficient funds")) {
          setError("Insufficient funds to pay for gas");
        } else if (err.message.includes("gas")) {
          setError(`Gas estimation failed: ${err.message}`);
        } else if (err.message.includes("revert")) {
          setError(`Smart contract error: ${err.message}`);
        } else {
          setError(`Transaction failed: ${err.message}`);
        }
      } else {
        setError("Failed to create proposal - unknown error");
      }

      setSubmitStatus("error");
    }
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  if (!isConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          Wallet Not Connected
        </h3>
        <p className="text-yellow-700">
          Please connect your wallet to create proposals.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">
          Create New Proposal
        </h3>
        <div className="flex space-x-3">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            variant="outline"
            onClick={togglePreview}
            disabled={!form.formState.isValid}
          >
            {showPreview ? "Edit" : "Preview"}
          </Button>
        </div>
      </div>

      {/* Status Messages */}
      {submitStatus === "success" && txHash && (
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
                Proposal Created Successfully!
              </h3>
              <div className="mt-1 text-sm text-green-700">
                <p>
                  Transaction:{" "}
                  <code className="bg-green-100 px-1 rounded text-xs">
                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </code>
                </p>
                <p className="mt-1">
                  Your proposal is now live and ready for voting!
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
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-1 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Eligibility Check */}
      {userVotingPower !== null && proposalThreshold !== null && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            Proposal Eligibility
          </h4>
          <div className="text-sm text-blue-700">
            {userStatus.isCreator ? (
              <div>
                <p className="text-purple-700 font-medium mb-2">
                  👑 Community Creator
                </p>
                <p className="text-green-700 font-medium">
                  ✓ Always eligible to create proposals
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  As the creator, you can create proposals regardless of voting
                  power
                </p>
              </div>
            ) : (
              <div>
                <p>Your voting power: {userVotingPower.toString()} votes</p>
                <p>Required threshold: {proposalThreshold.toString()} votes</p>
                <p
                  className={
                    userVotingPower >= proposalThreshold
                      ? "text-green-700 font-medium"
                      : "text-red-700 font-medium"
                  }
                >
                  {userVotingPower >= proposalThreshold
                    ? "✓ Eligible to create proposals"
                    : "✗ Insufficient voting power"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {showPreview ? (
        // Preview Mode
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Proposal Preview
          </h4>
          <div className="space-y-4">
            <div>
              <h5 className="font-medium text-gray-700">Title</h5>
              <p className="text-gray-900">
                {form.getValues("title") || "No title provided"}
              </p>
            </div>
            <div>
              <h5 className="font-medium text-gray-700">Summary</h5>
              <p className="text-gray-900">
                {form.getValues("summary") || "No summary provided"}
              </p>
            </div>
            <div>
              <h5 className="font-medium text-gray-700">Type</h5>
              <p className="text-gray-900 capitalize">
                {form.getValues("type").replace("_", " ")}
              </p>
            </div>
            <div>
              <h5 className="font-medium text-gray-700">Description</h5>
              <div className="bg-gray-50 p-3 rounded border whitespace-pre-wrap">
                {form.getValues("description") || "No description provided"}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Form Mode
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            {/* Basic Information */}
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Proposal Title *
                </label>
                <input
                  type="text"
                  id="title"
                  {...form.register("title")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  placeholder="Enter a clear, descriptive title..."
                />
                {form.formState.errors.title && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="summary"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Summary *
                </label>
                <input
                  type="text"
                  id="summary"
                  {...form.register("summary")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  placeholder="Brief summary of the proposal..."
                />
                {form.formState.errors.summary && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.summary.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="type"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Proposal Type *
                </label>
                <select
                  id="type"
                  {...form.register("type")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                >
                  <option value={ProposalType.TEXT_ONLY}>
                    Text Only (Community Decision)
                  </option>
                  <option value={ProposalType.TREASURY}>
                    Treasury (Transfer Funds)
                  </option>
                </select>
                {form.formState.errors.type && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.type.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Detailed Description *
                </label>
                <textarea
                  id="description"
                  rows={8}
                  {...form.register("description")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  placeholder="Provide a detailed description of your proposal, including rationale, expected outcomes, and any relevant information..."
                />
                {form.formState.errors.description && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>
            </div>

            {/* Type-specific fields */}
            {watchedType === ProposalType.TREASURY && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  Treasury Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="treasuryRecipient"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Recipient Address *
                    </label>
                    <input
                      type="text"
                      id="treasuryRecipient"
                      {...form.register("treasuryRecipient")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                      placeholder="0x..."
                    />
                    {form.formState.errors.treasuryRecipient && (
                      <p className="mt-1 text-sm text-red-600">
                        {form.formState.errors.treasuryRecipient.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="treasuryAmount"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Amount (ETH) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      id="treasuryAmount"
                      {...form.register("treasuryAmount")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                      placeholder="0.0"
                    />
                    {form.formState.errors.treasuryAmount && (
                      <p className="mt-1 text-sm text-red-600">
                        {form.formState.errors.treasuryAmount.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={checkEligibility}
              disabled={submitStatus === "checking"}
            >
              {submitStatus === "checking"
                ? "Checking..."
                : "Check Eligibility"}
            </Button>
            {needsDelegation && (
              <Button
                type="button"
                onClick={handleDelegateVotes}
                disabled={submitStatus === "delegating"}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitStatus === "delegating" ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Delegating...
                  </div>
                ) : (
                  "Delegate Votes"
                )}
              </Button>
            )}
            <Button
              type="submit"
              disabled={
                submitStatus === "submitting" ||
                submitStatus === "success" ||
                !form.formState.isValid
              }
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitStatus === "submitting" ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Proposal...
                </div>
              ) : submitStatus === "success" ? (
                "Proposal Created!"
              ) : (
                "Create Proposal"
              )}
            </Button>
          </div>

          {submitStatus === "submitting" && (
            <div className="text-center text-sm text-gray-600">
              <p>Please confirm the transaction in your wallet...</p>
            </div>
          )}

          {submitStatus === "delegating" && (
            <div className="text-center text-sm text-blue-600">
              <p>Please confirm the delegation transaction in your wallet...</p>
            </div>
          )}

          {delegationTxHash && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
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
                  <h3 className="text-sm font-medium text-blue-800">
                    Votes Delegated Successfully!
                  </h3>
                  <div className="mt-1 text-sm text-blue-700">
                    <p>
                      Your voting power has been activated. You can now create
                      proposals.
                    </p>
                    <p className="font-mono text-xs mt-1 break-all">
                      Transaction: {delegationTxHash}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
