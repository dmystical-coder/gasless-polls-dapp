"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreatePollModal = ({ isOpen, onClose, onSuccess }: CreatePollModalProps) => {
  const { address: connectedAddress } = useAccount();
  const [question, setQuestion] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const { writeContractAsync: writeGaslessPollAsync } = useScaffoldWriteContract("GaslessPoll");

  const handleCreate = async () => {
    if (!connectedAddress) {
      notification.error("Please connect your wallet");
      return;
    }

    if (!question.trim()) {
      notification.error("Please enter a poll question");
      return;
    }
    if (step === 1) {
      // Go to preview
      setStep(2);
      return;
    }

    // step 2 – submit txn
    setIsCreating(true);

    try {
      await writeGaslessPollAsync({
        functionName: "createPoll",
        args: [question.trim()],
      });

      notification.success("Poll created successfully!");
      setQuestion("");
      onSuccess();
      onClose();
      setStep(1);
    } catch (error: any) {
      console.error("Error creating poll:", error);
      notification.error(error.message || "Failed to create poll");
    } finally {
      setIsCreating(false);
    }
  };

  const resetAndClose = () => {
    onClose();
    setStep(1);
  };

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-heading-3">Create New Poll</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle" disabled={isCreating}>
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <label className="label">
                <span className="label-text font-semibold">Poll Question</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full h-32 text-base"
                placeholder="What would you like to ask? (e.g., Should we implement feature X?)"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                disabled={isCreating}
                maxLength={200}
              />
              <label className="label">
                <span className="label-text-alt text-base-content/60">{question.length}/200 characters</span>
              </label>
            </div>

            {/* Info box */}
            <div className="alert alert-info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm">
                <p className="font-semibold">Your poll will be visible to everyone once created</p>
                <p className="text-xs opacity-80">You&apos;ll confirm the question on the next step</p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <h4 className="text-heading-4">Preview</h4>
            <div className="p-4 rounded-xl border border-base-300 bg-base-200">{question}</div>
            <p className="text-body-sm text-base-content/60">
              If everything looks good click &quot;Create&quot; to submit the transaction.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="modal-action">
          <button onClick={resetAndClose} className="btn btn-ghost" disabled={isCreating}>
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="btn btn-primary"
            disabled={isCreating || !connectedAddress || !question.trim()}
          >
            {isCreating ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Creating...
              </>
            ) : step === 1 ? (
              "Next"
            ) : (
              <>
                <PlusIcon className="w-5 h-5" />
                Create Poll
              </>
            )}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={resetAndClose}>
        <button>close</button>
      </form>
    </dialog>
  );
};
