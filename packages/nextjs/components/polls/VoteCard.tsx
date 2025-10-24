"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId, useSignTypedData } from "wagmi";
import { useDeployedContractInfo, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { Poll } from "~~/types/poll";
import { notification } from "~~/utils/scaffold-eth";

interface VoteCardProps {
  pollId: number;
  poll: Poll;
  onVoteSubmitted?: () => void;
}

export const VoteCard = ({ pollId, poll, onVoteSubmitted }: VoteCardProps) => {
  const { address: connectedAddress } = useAccount();
  const [isVoting, setIsVoting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { signTypedDataAsync } = useSignTypedData();
  const chainId = useChainId();

  // Get deployed contract info
  const { data: deployedContractData } = useDeployedContractInfo("GaslessPoll");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get user's current nonce
  const { data: userNonce } = useScaffoldReadContract({
    contractName: "GaslessPoll",
    functionName: "getUserNonce",
    args: [connectedAddress],
  });

  // Check if user has already voted
  const { data: hasVoted } = useScaffoldReadContract({
    contractName: "GaslessPoll",
    functionName: "hasUserVoted",
    args: [BigInt(pollId), connectedAddress],
  });

  const totalVotes = Number(poll.yesVotes) + Number(poll.noVotes);
  const yesPercentage = totalVotes > 0 ? (Number(poll.yesVotes) / totalVotes) * 100 : 0;
  const noPercentage = totalVotes > 0 ? (Number(poll.noVotes) / totalVotes) * 100 : 0;

  const handleVote = async (vote: boolean) => {
    if (!connectedAddress) {
      notification.error("Please connect your wallet");
      return;
    }

    if (hasVoted) {
      notification.error("You have already voted on this poll");
      return;
    }

    if (!poll.active) {
      notification.error("This poll is no longer active");
      return;
    }

    setIsVoting(true);

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

      // Submit to relayer
      const response = await fetch("http://localhost:3001/submit-vote", {
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
        notification.success(`Vote submitted successfully! ${vote ? "Yes" : "No"} vote queued for processing.`);
        onVoteSubmitted?.();
      } else {
        throw new Error(result.error || "Failed to submit vote");
      }
    } catch (error: any) {
      console.error("Vote submission error:", error);
      notification.error(error.message || "Failed to submit vote");
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl border">
      <div className="card-body">
        <h2 className="card-title text-lg font-bold">{poll.question}</h2>

        {/* Poll Stats */}
        <div className="stats stats-horizontal shadow mb-4">
          <div className="stat">
            <div className="stat-title">Total Votes</div>
            <div className="stat-value text-2xl">{totalVotes}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Status</div>
            <div className={`stat-value text-lg ${poll.active ? "text-success" : "text-error"}`}>
              {poll.active ? "Active" : "Closed"}
            </div>
          </div>
        </div>

        {/* Vote Results */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-medium">Yes ({Number(poll.yesVotes)} votes)</span>
            <span className="text-sm text-gray-500">{yesPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-success h-3 rounded-full transition-all duration-300"
              style={{ width: `${yesPercentage}%` }}
            ></div>
          </div>

          <div className="flex justify-between items-center">
            <span className="font-medium">No ({Number(poll.noVotes)} votes)</span>
            <span className="text-sm text-gray-500">{noPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-error h-3 rounded-full transition-all duration-300"
              style={{ width: `${noPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Voting Buttons */}
        {isMounted && connectedAddress && poll.active && !hasVoted && (
          <div className="card-actions justify-center mt-6">
            <button className="btn btn-success btn-wide" onClick={() => handleVote(true)} disabled={isVoting}>
              {isVoting ? <span className="loading loading-spinner" /> : "Vote Yes"}
            </button>
            <button className="btn btn-error btn-wide" onClick={() => handleVote(false)} disabled={isVoting}>
              {isVoting ? <span className="loading loading-spinner" /> : "Vote No"}
            </button>
          </div>
        )}

        {/* Status Messages */}
        {isMounted && !connectedAddress && (
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
              ></path>
            </svg>
            <span>Connect your wallet to vote on this poll</span>
          </div>
        )}

        {isMounted && hasVoted && (
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
            <span>You have already voted on this poll</span>
          </div>
        )}

        {isMounted && !poll.active && (
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <span>This poll has been closed</span>
          </div>
        )}

        {/* Poll Info */}
        <div className="text-xs text-gray-500 mt-4">
          <div>
            Created by: {poll.creator.slice(0, 6)}...{poll.creator.slice(-4)}
          </div>
          <div>Created: {new Date(Number(poll.createdAt) * 1000).toLocaleString()}</div>
          <div>Poll ID: {pollId}</div>
        </div>
      </div>
    </div>
  );
};
