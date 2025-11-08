"use client";

import { useCreateForm } from "../hooks/use-create-form";
import { StepIndicator } from "./step-indicator";
import { BasicInfoStep } from "./basic-info-step";
import { PreviewStep } from "./preview-step";

const steps = [
  {
    title: "Basic Info",
    description: "DAO Configuration",
  },
  {
    title: "Deploy",
    description: "Review & create DAO",
  },
];

export function CreateForm() {
  const {
    form,
    currentStep,
    isDeploying,
    deploymentSuccess,
    deploymentResult,
    transactionStatus,
    nextStep,
    prevStep,
    deployContract,
  } = useCreateForm();

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-8">
      <StepIndicator currentStep={currentStep} totalSteps={2} steps={steps} />

      <div className="mt-8">
        {currentStep === 1 && <BasicInfoStep form={form} onNext={nextStep} />}

        {currentStep === 2 && (
          <PreviewStep
            form={form}
            onPrev={prevStep}
            onDeploy={deployContract}
            isDeploying={isDeploying}
            deploymentSuccess={deploymentSuccess}
            deploymentResult={deploymentResult}
            transactionStatus={transactionStatus}
          />
        )}
      </div>
    </div>
  );
}
