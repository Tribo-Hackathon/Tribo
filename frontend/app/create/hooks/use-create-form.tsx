"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAccount } from "wagmi";
import { createCommunity } from "@/lib/contracts/factory";
import { DeploymentResult, TransactionStatus } from "@/lib/contracts/types";
import {
  createInitialTransactionStatus,
  createPendingTransactionStatus,
  createSuccessTransactionStatus,
  createErrorTransactionStatus,
} from "@/lib/contracts/utils";

// Form schema
const createCommunitySchema = z.object({
  serverName: z
    .string()
    .min(3, "Server name must be at least 3 characters")
    .max(50, "Server name must be less than 50 characters")
    .regex(
      /^[a-zA-Z0-9\s-_]+$/,
      "Server name can only contain letters, numbers, spaces, hyphens, and underscores"
    ),
});

export type CreateCommunityFormData = z.infer<typeof createCommunitySchema>;

const STORAGE_KEY = "create-community-form";

export function useCreateForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentSuccess, setDeploymentSuccess] = useState(false);
  const [deploymentResult, setDeploymentResult] =
    useState<DeploymentResult | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>(
    createInitialTransactionStatus()
  );

  const { address, isConnected } = useAccount();

  const form = useForm<CreateCommunityFormData>({
    resolver: zodResolver(createCommunitySchema),
    defaultValues: {
      serverName: "",
    },
  });

  // Load form data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        form.reset(parsedData);
      } catch (error) {
        console.error("Failed to load saved form data:", error);
      }
    }
  }, [form]);

  // Save form data to localStorage on changes
  useEffect(() => {
    const subscription = form.watch((data) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const nextStep = async () => {
    const isValid = await form.trigger();
    if (isValid && currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const deployContract = async (data: CreateCommunityFormData) => {
    if (!isConnected || !address) {
      console.error("Wallet not connected");
      setTransactionStatus(
        createErrorTransactionStatus("Wallet not connected")
      );
      return;
    }

    setIsDeploying(true);
    setTransactionStatus(createInitialTransactionStatus());

    try {
      console.log("Deploying community with data:", data);
      console.log("Creator address:", address);

      // Call the real contract deployment function
      const result = await createCommunity(address);

      if (result.success && result.transactionHash) {
        // Set pending status with transaction hash
        setTransactionStatus(
          createPendingTransactionStatus(result.transactionHash)
        );

        // Update to success status
        setTransactionStatus(
          createSuccessTransactionStatus(result.transactionHash)
        );

        // Clear saved form data on successful deployment
        localStorage.removeItem(STORAGE_KEY);
        setDeploymentSuccess(true);
        setDeploymentResult(result);

        console.log("Community created successfully:", result);
      } else {
        // Handle deployment failure
        setTransactionStatus(
          createErrorTransactionStatus(result.error || "Deployment failed")
        );
        console.error("Deployment failed:", result.error);
      }
    } catch (error) {
      console.error("Deployment failed:", error);
      setTransactionStatus(
        createErrorTransactionStatus(
          error instanceof Error ? error.message : "Unknown error occurred"
        )
      );
    } finally {
      setIsDeploying(false);
    }
  };

  const resetForm = () => {
    form.reset();
    setCurrentStep(1);
    setDeploymentSuccess(false);
    setDeploymentResult(null);
    setTransactionStatus(createInitialTransactionStatus());
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    form,
    currentStep,
    isDeploying,
    deploymentSuccess,
    deploymentResult,
    transactionStatus,
    nextStep,
    prevStep,
    deployContract,
    resetForm,
  };
}
