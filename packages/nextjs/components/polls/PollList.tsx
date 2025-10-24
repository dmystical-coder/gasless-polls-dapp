"use client";

import { useEffect, useState } from "react";
import { VoteCard } from "./VoteCard";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const PollList = () => {
  const { address: connectedAddress } = useAccount();
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get all polls from the contract
  const {
    data: pollsData,
    isLoading: pollsLoading,
    refetch: refetchPolls,
  } = useScaffoldReadContract({
    contractName: "GaslessPoll",
    functionName: "getAllPolls",
    watch: isMounted,
  });

  // Get poll count
  const { data: pollCount } = useScaffoldReadContract({
    contractName: "GaslessPoll",
    functionName: "pollCount",
    watch: isMounted,
  });

  const { writeContractAsync: writeGaslessPollAsync } = useScaffoldWriteContract("GaslessPoll");

  const handleCreatePoll = async () => {
    if (!connectedAddress) {
      notification.error("Please connect your wallet");
      return;
    }

    if (!newPollQuestion.trim()) {
      notification.error("Please enter a poll question");
      return;
    }

    setIsCreatingPoll(true);

    try {
      await writeGaslessPollAsync({
        functionName: "createPoll",
        args: [newPollQuestion.trim()],
      });

      notification.success("Poll created successfully!");
      setNewPollQuestion("");
      refetchPolls();
    } catch (error: any) {
      console.error("Error creating poll:", error);
      notification.error(error.message || "Failed to create poll");
    } finally {
      setIsCreatingPoll(false);
    }
  };

  const handleVoteSubmitted = () => {
    // Trigger a refresh of the polls data
    setRefreshTrigger(prev => prev + 1);
    refetchPolls();
  };

  // Parse polls data
  const polls = pollsData
    ? {
        pollIds: pollsData[0] || [],
        questions: pollsData[1] || [],
        yesVotes: pollsData[2] || [],
        noVotes: pollsData[3] || [],
        active: pollsData[4] || [],
        creators: pollsData[5] || [],
        createdAts: pollsData[6] || [],
      }
    : null;

  const totalPolls = Number(pollCount || 0);

  return (
    <div className="flex items-center flex-col flex-grow pt-10 px-4">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-4xl font-bold mb-4">🗳️ Gasless Polls</h1>
        <p className="text-lg text-center max-w-2xl mb-6">
          Vote on polls without paying gas fees! Your votes are signed off-chain and submitted in batches by our relayer
          service.
        </p>

        {/* Stats */}
        <div className="stats shadow mb-6">
          <div className="stat">
            <div className="stat-figure text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="inline-block w-8 h-8 stroke-current"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                ></path>
              </svg>
            </div>
            <div className="stat-title">Total Polls</div>
            <div className="stat-value text-primary">{totalPolls}</div>
            <div className="stat-desc">Gasless voting system</div>
          </div>
        </div>
      </div>

      {/* Create Poll Section */}
      <div className="card bg-base-200 shadow-xl w-full max-w-2xl mb-8">
        <div className="card-body">
          <h2 className="card-title">Create New Poll</h2>
          <input
            type="text"
            placeholder="Enter your poll question..."
            className="input input-bordered w-full"
            value={newPollQuestion}
            onChange={e => setNewPollQuestion(e.target.value)}
            disabled={!connectedAddress || isCreatingPoll}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={handleCreatePoll}
            disabled={isCreatingPoll || !connectedAddress || !newPollQuestion.trim()}
          >
            {isCreatingPoll ? (
              <>
                <span className="loading loading-spinner" />
                Creating...
              </>
            ) : (
              "Create Poll"
            )}
          </button>
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
              <span>Connect your wallet to create polls</span>
            </div>
          )}
        </div>
      </div>

      {/* Polls List */}
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">All Polls</h2>
          <button className="btn btn-outline btn-sm" onClick={() => refetchPolls()} disabled={pollsLoading}>
            {pollsLoading ? (
              <span className="loading loading-spinner" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
            Refresh
          </button>
        </div>

        {pollsLoading && (
          <div className="flex justify-center items-center py-12">
            <span className="loading loading-spinner loading-lg" />
            <span className="ml-2">Loading polls...</span>
          </div>
        )}

        {!pollsLoading && polls && polls.pollIds.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">No polls yet</h3>
            <p className="text-gray-500">Be the first to create a poll!</p>
          </div>
        )}

        {!pollsLoading && polls && polls.pollIds.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
            {polls.pollIds.map((pollId: bigint, index: number) => {
              const pollData = {
                id: pollId,
                question: polls.questions[index] || "",
                yesVotes: polls.yesVotes[index] || BigInt(0),
                noVotes: polls.noVotes[index] || BigInt(0),
                active: polls.active[index] || false,
                creator: polls.creators[index] || "",
                createdAt: polls.createdAts[index] || BigInt(0),
              };

              return (
                <VoteCard
                  key={`${Number(pollId)}-${refreshTrigger}`}
                  pollId={Number(pollId)}
                  poll={pollData}
                  onVoteSubmitted={handleVoteSubmitted}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="card bg-base-300 shadow-xl w-full max-w-4xl mt-8">
        <div className="card-body">
          <h2 className="card-title">How Gasless Voting Works</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl mb-2">✍️</div>
              <h3 className="font-bold">1. Sign Your Vote</h3>
              <p className="text-sm">Sign your vote using your wallet - no gas required!</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">📡</div>
              <h3 className="font-bold">2. Relayer Collects</h3>
              <p className="text-sm">Our relayer service collects signed votes from all users</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="font-bold">3. Batch Submit</h3>
              <p className="text-sm">Votes are submitted in batches to save gas costs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PollList;
