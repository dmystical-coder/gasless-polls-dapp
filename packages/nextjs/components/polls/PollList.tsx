"use client";

import React, { useEffect, useState } from "react";
import { StatsSection } from "../StatsSection";
import { CreatePollModal } from "./CreatePollModal";
import { EmptyState } from "./EmptyState";
import { PollCard } from "./PollCard";
import { PollSkeleton } from "./PollSkeleton";
import { useAccount } from "wagmi";
import { ArrowPathIcon, PlusIcon, UserIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const PollList = () => {
  const { address: connectedAddress } = useAccount();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "closed">("all");
  const [viewMode, setViewMode] = useState<"all" | "mine">("all");

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
        durations: pollsData[7] || [],
      }
    : null;

  // Filter polls based on view mode and status
  const filteredPolls = polls
    ? polls.pollIds.filter((_, index) => {
        // View mode filter (all or mine)
        const viewMatch =
          viewMode === "all" ||
          (connectedAddress && polls.creators[index].toLowerCase() === connectedAddress.toLowerCase());

        // Status filter (all, active, or closed)
        const statusMatch =
          filterStatus === "all" || (filterStatus === "active" ? polls.active[index] : !polls.active[index]);

        return viewMatch && statusMatch;
      })
    : [];

  // Calculate stats based on current view
  const totalPolls = polls
    ? polls.pollIds.filter((_, index) => {
        return (
          viewMode === "all" ||
          (connectedAddress && polls.creators[index].toLowerCase() === connectedAddress.toLowerCase())
        );
      }).length
    : 0;

  const activePolls = polls
    ? polls.pollIds.filter((_, index) => {
        const viewMatch =
          viewMode === "all" ||
          (connectedAddress && polls.creators[index].toLowerCase() === connectedAddress.toLowerCase());
        return viewMatch && polls.active[index];
      }).length
    : 0;

  const closedPolls = totalPolls - activePolls;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Stats Section */}
      <StatsSection total={totalPolls} active={activePolls} closed={closedPolls} />

      {/* Main Content */}
      <div className="flex-1 px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header with actions */}
          <div className="flex flex-col gap-6 mb-8">
            {/* Enhanced View mode tabs */}
            <div className="relative bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 p-1.5 rounded-2xl shadow-lg w-fit animate-pulse-glow">
              <div className="flex gap-2 bg-base-100 rounded-xl p-1">
                <button
                  className={`relative px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                    viewMode === "all"
                      ? "bg-gradient-to-r from-primary to-secondary text-primary-content shadow-xl scale-105"
                      : "text-base-content/70 hover:bg-base-200"
                  }`}
                  onClick={() => {
                    setViewMode("all");
                    setFilterStatus("all");
                  }}
                >
                  <span className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                      />
                    </svg>
                    All Polls
                  </span>
                  {viewMode === "all" && (
                    <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary to-secondary opacity-50 blur-sm animate-pulse" />
                  )}
                </button>
                <button
                  className={`relative px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                    viewMode === "mine"
                      ? "bg-gradient-to-r from-accent to-secondary text-accent-content shadow-xl scale-105"
                      : "text-base-content/70 hover:bg-base-200"
                  } ${!connectedAddress ? "opacity-40 cursor-not-allowed" : ""}`}
                  onClick={() => {
                    setViewMode("mine");
                    setFilterStatus("all");
                  }}
                  disabled={!connectedAddress}
                >
                  <span className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5" />
                    My Polls
                    {connectedAddress && totalPolls > 0 && viewMode === "mine" && (
                      <span className="badge badge-xs bg-white/20">
                        {
                          polls?.pollIds.filter(
                            (_, index) =>
                              connectedAddress &&
                              polls.creators[index].toLowerCase() === connectedAddress.toLowerCase(),
                          ).length
                        }
                      </span>
                    )}
                  </span>
                  {viewMode === "mine" && (
                    <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-accent to-secondary opacity-50 blur-sm animate-pulse" />
                  )}
                </button>
              </div>
            </div>

            {/* Filters and actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-heading-3 mb-1">{viewMode === "mine" ? "My Polls" : "All Polls"}</h2>
                <p className="text-body-sm text-base-content/60">
                  {filteredPolls.length} {filterStatus !== "all" ? filterStatus : ""} poll
                  {filteredPolls.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                {/* Filter buttons */}
                <div className="join">
                  <button
                    className={`btn btn-sm join-item ${filterStatus === "all" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setFilterStatus("all")}
                  >
                    All
                  </button>
                  <button
                    className={`btn btn-sm join-item ${filterStatus === "active" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setFilterStatus("active")}
                  >
                    Active
                  </button>
                  <button
                    className={`btn btn-sm join-item ${filterStatus === "closed" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setFilterStatus("closed")}
                  >
                    Closed
                  </button>
                </div>

                {/* Refresh button */}
                <button className="btn btn-ghost btn-sm gap-2" onClick={() => refetchPolls()} disabled={pollsLoading}>
                  <ArrowPathIcon className={`w-4 h-4 ${pollsLoading ? "animate-spin" : ""}`} />
                  Refresh
                </button>

                {/* Create poll button */}
                <button
                  className="btn btn-primary btn-sm gap-2"
                  onClick={() => setShowCreateModal(true)}
                  disabled={!connectedAddress}
                >
                  <PlusIcon className="w-4 h-4" />
                  Create Poll
                </button>
              </div>
            </div>
          </div>

          {/* Polls Grid */}

          {pollsLoading && (
            <div className="grid gap-6 md:grid-cols-2">
              <PollSkeleton />
              <PollSkeleton />
              <PollSkeleton />
              <PollSkeleton />
            </div>
          )}

          {!pollsLoading && polls && polls.pollIds.length === 0 && (
            <EmptyState onCreateClick={() => setShowCreateModal(true)} isConnected={!!connectedAddress} />
          )}

          {!pollsLoading && polls && polls.pollIds.length > 0 && filteredPolls.length === 0 && (
            <div className="text-center py-12 animate-fade-in">
              <div className="text-6xl mb-4">{viewMode === "mine" ? "📝" : "🔍"}</div>
              <h3 className="text-heading-3 mb-2">
                {viewMode === "mine" ? "You haven't created any polls yet" : `No ${filterStatus} polls found`}
              </h3>
              <p className="text-body text-base-content/60">
                {viewMode === "mine"
                  ? "Create your first poll to get started!"
                  : "Try changing the filter to see more polls"}
              </p>
              {viewMode === "mine" && (
                <button className="btn btn-primary mt-4 gap-2" onClick={() => setShowCreateModal(true)}>
                  <PlusIcon className="w-4 h-4" />
                  Create Your First Poll
                </button>
              )}
            </div>
          )}

          {!pollsLoading && polls && filteredPolls.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 animate-fade-in">
              {filteredPolls.map((pollId: bigint) => {
                const index = polls.pollIds.indexOf(pollId);
                const pollData = {
                  id: pollId,
                  question: polls.questions[index] || "",
                  yesVotes: polls.yesVotes[index] || BigInt(0),
                  noVotes: polls.noVotes[index] || BigInt(0),
                  active: polls.active[index] || false,
                  creator: polls.creators[index] || "",
                  createdAt: polls.createdAts[index] || BigInt(0),
                  duration: polls.durations[index] || BigInt(0),
                };

                return (
                  <PollCard
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
      </div>

      {/* Create Poll Modal */}
      <CreatePollModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setRefreshTrigger(prev => prev + 1);
          refetchPolls();
        }}
      />
    </div>
  );
};

export default PollList;
