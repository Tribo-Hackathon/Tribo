"use client";

import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ArrowRight, Server } from "lucide-react";
import { CreateCommunityFormData } from "../hooks/use-create-form";

interface BasicInfoStepProps {
  form: UseFormReturn<CreateCommunityFormData>;
  onNext: () => void;
}

export function BasicInfoStep({ form, onNext }: BasicInfoStepProps) {
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = form;

  const onSubmit = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      onNext();
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">DAO Configuration</h2>
        <p className="text-gray-600">
          Set up your decentralized autonomous organization
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-md mx-auto space-y-6"
      >
        <div className="space-y-2">
          <label
            htmlFor="serverName"
            className="flex items-center text-sm font-medium text-gray-700"
          >
            <Server className="w-4 h-4 mr-2" />
            DAO Name
          </label>
          <input
            id="serverName"
            type="text"
            placeholder="My Awesome DAO"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            {...register("serverName")}
          />
          {errors.serverName && (
            <p className="text-sm text-red-600">{errors.serverName.message}</p>
          )}
          <p className="text-xs text-gray-500">
            This will be the name of your DAO and community
          </p>
        </div>

        <Button
          type="submit"
          className="w-full bg-purple-600 hover:bg-purple-700"
          size="lg"
        >
          Continue to Preview
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
