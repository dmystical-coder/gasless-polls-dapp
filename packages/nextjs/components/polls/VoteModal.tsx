"use client";

import { useState } from "react";
import { useAccount, useChainId, useSignTypedData } from "wagmi";
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useDeployedContractInfo, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

interface VoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  pollId: number;
  vote: boolean;
  pollQuestion: string;
  onSuccess: () => void;
}

export const VoteModal = ({ isOpen, onClose, pollId, vote, pollQuestion, onSuccess }: VoteModalProps) => {
  const { address: connectedAddress } = useAccount();
  const [isVoting, setIsVoting] = useState(false);
  const [step, setStep] = useState<"confirm" | "signing" | "submitting" | "success">("confirm");
  const { signTypedDataAsync } = useSignTypedData();
  const chainId = useChainId();

  // Get deployed contract info
  const { data: deployedContractData } = useDeployedContractInfo("GaslessPoll");

  // Get user's current nonce
  const { data: userNonce } = useScaffoldReadContract({
    contractName: "GaslessPoll",
    functionName: "getUserNonce",
    args: [connectedAddress],
  });

  const handleVote = async () => {
    if (!connectedAddress) {
      notification.error("Please connect your wallet");
      return;
    }

    setIsVoting(true);
    setStep("signing");

    try {
      // Define the EIP-712 domain and types for voting
      const domain = {
        name: "GaslessPoll",
        version: "1",
        chainId: chainId,
        verifyingContract: deployedContractData?.address as `0x${string}`,
      };

      const types = {
        Vote: [
          { name: "pollId", type: "uint256" },
          { name: "vote", type: "bool" },
          { name: "nonce", type: "uint256" },
        ],
      };

      const message = {
        pollId: BigInt(pollId),
        vote: vote,
        nonce: userNonce || BigInt(0),
      };

      // Sign the typed data
      const signature = await signTypedDataAsync({
        domain,
        types,
        primaryType: "Vote",
        message,
      });

      setStep("submitting");

      // Submit to relayer
      const response = await fetch(`${process.env.NEXT_PUBLIC_RELAYER_URL}/submit-vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pollId: pollId,
          vote: vote,
          nonce: Number(userNonce || 0),
          signature: signature,
          voter: connectedAddress,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setStep("success");
        notification.success(`Vote submitted successfully! ${vote ? "Yes" : "No"} vote queued for processing.`);
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        throw new Error(result.error || "Failed to submit vote");
      }
    } catch (error: any) {
      console.error("Vote submission error:", error);
      notification.error(error.message || "Failed to submit vote");
      setStep("confirm");
    } finally {
      setIsVoting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-lg animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-heading-3">Confirm Your Vote</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle" disabled={isVoting}>
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Poll question */}
          <div className="p-4 bg-base-200 rounded-lg">
            <p className="text-sm text-base-content/60 mb-2">Poll Question</p>
            <p className="font-semibold">{pollQuestion}</p>
          </div>

          {/* Vote selection */}
          <div className="flex items-center justify-center gap-4 p-6 bg-base-200 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-base-content/60 mb-2">Your Vote</p>
              <div
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-full ${
                  vote ? "bg-success text-success-content" : "bg-error text-error-content"
                }`}
              >
                {vote ? (
                  <>
                    <CheckCircleIcon className="w-6 h-6" />
                    <span className="font-bold text-lg">Yes</span>
                  </>
                ) : (
                  <>
                    <XCircleIcon className="w-6 h-6" />
                    <span className="font-bold text-lg">No</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Steps indicator */}
          {step !== "confirm" && (
            <div className="space-y-3">
              <div
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  step === "signing" ? "bg-primary/10" : "bg-base-200"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step === "signing" ? "bg-primary text-primary-content" : "bg-success text-success-content"
                  }`}
                >
                  {step === "signing" ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <CheckCircleIcon className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm">Sign Message</p>
                  <p className="text-xs text-base-content/60">
                    {step === "signing" ? "Waiting for signature..." : "Signature received"}
                  </p>
                </div>
              </div>

              <div
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  step === "submitting" ? "bg-primary/10" : step === "success" ? "bg-success/10" : "bg-base-200"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step === "submitting"
                      ? "bg-primary text-primary-content"
                      : step === "success"
                        ? "bg-success text-success-content"
                        : "bg-base-300"
                  }`}
                >
                  {step === "submitting" ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : step === "success" ? (
                    <CheckCircleIcon className="w-5 h-5" />
                  ) : (
                    <span className="text-xs">2</span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm">Submit to Relayer</p>
                  <p className="text-xs text-base-content/60">
                    {step === "submitting"
                      ? "Sending to relayer..."
                      : step === "success"
                        ? "Vote queued for batch processing"
                        : "Pending"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          {step === "confirm" && (
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
                <p className="font-semibold">No gas fees required!</p>
                <p className="text-xs opacity-80">You&apos;ll only need to sign a message with your wallet</p>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="alert alert-success">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm">
                <p className="font-semibold">Vote submitted successfully!</p>
                <p className="text-xs opacity-80">Your vote will be processed in the next batch</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {step === "confirm" && (
          <div className="modal-action">
            <button onClick={onClose} className="btn btn-ghost" disabled={isVoting}>
              Cancel
            </button>
            <button onClick={handleVote} className={`btn ${vote ? "btn-success" : "btn-error"}`} disabled={isVoting}>
              {vote ? (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  Confirm Yes Vote
                </>
              ) : (
                <>
                  <XCircleIcon className="w-5 h-5" />
                  Confirm No Vote
                </>
              )}
            </button>
          </div>
        )}
      </div>
      <form method="dialog" className="modal-backdrop" onClick={step === "confirm" ? onClose : undefined}>
        <button disabled={step !== "confirm"}>close</button>
      </form>
    </dialog>
  );
};
