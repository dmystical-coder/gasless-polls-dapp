"use client";

import { useState } from "react";
import { Avatar } from "../Avatar";
import { VoteModal } from "./VoteModal";
import { useAccount } from "wagmi";
import { CheckCircleIcon, ClockIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import type { Poll } from "~~/types/poll";

interface PollCardProps {
  pollId: number;
  poll: Poll;
  onVoteSubmitted?: () => void;
}

export const PollCard = ({ pollId, poll, onVoteSubmitted }: PollCardProps) => {
  const { address: connectedAddress } = useAccount();
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedVote, setSelectedVote] = useState<boolean | null>(null);

  // Check if user has already voted
  const { data: hasVoted } = useScaffoldReadContract({
    contractName: "GaslessPoll",
    functionName: "hasUserVoted",
    args: [BigInt(pollId), connectedAddress],
  });

  const totalVotes = Number(poll.yesVotes) + Number(poll.noVotes);
  const yesPercentage = totalVotes > 0 ? (Number(poll.yesVotes) / totalVotes) * 100 : 0;
  const noPercentage = totalVotes > 0 ? (Number(poll.noVotes) / totalVotes) * 100 : 0;

  const formatTimeAgo = (timestamp: bigint) => {
    const now = Date.now();
    const then = Number(timestamp) * 1000;
    const diff = now - then;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  const handleVoteClick = (vote: boolean) => {
    setSelectedVote(vote);
    setShowVoteModal(true);
  };

  const isCreator = connectedAddress?.toLowerCase() === poll.creator.toLowerCase();

  return (
    <>
      <div
        className={`card bg-base-100 shadow-xl border-2 transition-all duration-300 ${
          poll.active ? "border-primary/20 hover:border-primary/40" : "border-base-300 opacity-75"
        } ${isCreator ? "ring-2 ring-accent/30" : ""}`}
      >
        <div className="card-body">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h3 className="text-heading-4 mb-2">{poll.question}</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
                <div className="flex items-center gap-2">
                  <Avatar address={poll.creator} size={20} />
                  <span>
                    {poll.creator.slice(0, 6)}...{poll.creator.slice(-4)}
                  </span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />
                  <span>{formatTimeAgo(poll.createdAt)}</span>
                </div>
                {isCreator && (
                  <>
                    <span>•</span>
                    <span className="badge badge-accent badge-sm">Your Poll</span>
                  </>
                )}
              </div>
            </div>

            {/* Status badge */}
            <div className={`badge ${poll.active ? "badge-success" : "badge-error"} gap-1`}>
              {poll.active ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-success-content animate-pulse-glow" />
                  Active
                </>
              ) : (
                "Closed"
              )}
            </div>
          </div>

          {/* Vote stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="stat bg-base-200 rounded-lg p-4">
              <div className="stat-title text-xs">Total Votes</div>
              <div className="stat-value text-2xl text-primary">{totalVotes}</div>
            </div>
            <div className="stat bg-base-200 rounded-lg p-4">
              <div className="stat-title text-xs">Poll ID</div>
              <div className="stat-value text-2xl text-secondary">#{pollId}</div>
            </div>
          </div>

          {/* Vote results */}
          <div className="space-y-4">
            {/* Yes votes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircleIcon className="w-5 h-5 text-success" />
                  <span>Yes</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base-content/60">{Number(poll.yesVotes)} votes</span>
                  <span className="font-bold text-success">{yesPercentage.toFixed(1)}%</span>
                </div>
              </div>
              <div className="relative w-full h-3 bg-base-300 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-success to-success/80 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${yesPercentage}%` }}
                >
                  {yesPercentage > 10 && <div className="absolute inset-0 animate-shimmer" />}
                </div>
              </div>
            </div>

            {/* No votes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 font-semibold">
                  <XCircleIcon className="w-5 h-5 text-error" />
                  <span>No</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base-content/60">{Number(poll.noVotes)} votes</span>
                  <span className="font-bold text-error">{noPercentage.toFixed(1)}%</span>
                </div>
              </div>
              <div className="relative w-full h-3 bg-base-300 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-error to-error/80 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${noPercentage}%` }}
                >
                  {noPercentage > 10 && <div className="absolute inset-0 animate-shimmer" />}
                </div>
              </div>
            </div>
          </div>

          {/* Voting buttons */}
          {connectedAddress && poll.active && !hasVoted && (
            <div className="card-actions justify-center mt-6 gap-3">
              <button onClick={() => handleVoteClick(true)} className="btn btn-success flex-1 gap-2">
                <CheckCircleIcon className="w-5 h-5" />
                Vote Yes
              </button>
              <button onClick={() => handleVoteClick(false)} className="btn btn-error flex-1 gap-2">
                <XCircleIcon className="w-5 h-5" />
                Vote No
              </button>
            </div>
          )}

          {/* Status messages */}
          {!connectedAddress && (
            <div className="alert alert-info mt-4">
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
              <span className="text-sm">Connect your wallet to vote</span>
            </div>
          )}

          {hasVoted && (
            <div className="alert alert-success mt-4">
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
              <span className="text-sm">You&apos;ve already voted on this poll</span>
            </div>
          )}

          {!poll.active && (
            <div className="alert alert-warning mt-4">
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="text-sm">This poll has been closed</span>
            </div>
          )}
        </div>
      </div>

      {/* Vote Modal */}
      {showVoteModal && selectedVote !== null && (
        <VoteModal
          isOpen={showVoteModal}
          onClose={() => {
            setShowVoteModal(false);
            setSelectedVote(null);
          }}
          pollId={pollId}
          vote={selectedVote}
          pollQuestion={poll.question}
          onSuccess={() => {
            onVoteSubmitted?.();
            setShowVoteModal(false);
            setSelectedVote(null);
          }}
        />
      )}
    </>
  );
};
