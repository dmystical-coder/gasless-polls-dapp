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
  const [duration, setDuration] = useState(86400); // Default: 1 day in seconds
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const { writeContractAsync: writeGaslessPollAsync } = useScaffoldWriteContract("GaslessPoll");

  // Duration presets in seconds
  const durationPresets = [
    { label: "1 Hour", value: 3600 },
    { label: "6 Hours", value: 21600 },
    { label: "1 Day", value: 86400 },
    { label: "3 Days", value: 259200 },
    { label: "1 Week", value: 604800 },
    { label: "1 Month", value: 2592000 },
  ];

  const formatDuration = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

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
        args: [question.trim(), BigInt(duration)],
      });

      notification.success("Poll created successfully!");
      setQuestion("");
      setDuration(86400); // Reset to default
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
    setDuration(86400); // Reset to default
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
                <span className="label-text-alt text-base-content/60">{question.length}/500 characters</span>
              </label>
            </div>

            {/* Duration selector */}
            <div>
              <label className="label">
                <span className="label-text font-semibold">Poll Duration</span>
                <span className="label-text-alt text-base-content/60">Minimum: 1 hour</span>
              </label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {durationPresets.map(preset => (
                  <button
                    key={preset.value}
                    type="button"
                    className={`btn btn-sm ${duration === preset.value ? "btn-primary" : "btn-outline"}`}
                    onClick={() => setDuration(preset.value)}
                    disabled={isCreating}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="alert alert-warning">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span className="text-xs">
                  Choosing this option will have the poll open for <strong>{formatDuration(duration)}</strong>
                </span>
              </div>
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
            <div className="p-4 rounded-xl border border-base-300 bg-base-200">
              <p className="font-semibold mb-2">{question}</p>
              <p className="text-sm text-base-content/60">Duration: {formatDuration(duration)}</p>
            </div>
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
