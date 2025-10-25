"use client";

import React, { useEffect, useState } from "react";
import { StatsSection } from "../StatsSection";
import { CreatePollModal } from "./CreatePollModal";
import { EmptyState } from "./EmptyState";
import { PollCard } from "./PollCard";
import { PollSkeleton } from "./PollSkeleton";
import { useAccount } from "wagmi";
import { ArrowPathIcon, MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const PollList = () => {
  const { address: connectedAddress } = useAccount();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "closed">("all");
  const [keyword, setKeyword] = useState("");

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
  const activePolls = polls ? polls.active.filter(Boolean).length : 0;
  const closedPolls = totalPolls - activePolls;

  // Filter polls based on status
  const filteredPolls = polls
    ? polls.pollIds.filter((_, index) => {
        // status filter
        const statusMatch =
          filterStatus === "all" || (filterStatus === "active" ? polls.active[index] : !polls.active[index]);
        // keyword filter
        const textMatch = polls.questions[index].toLowerCase().includes(keyword.toLowerCase());
        return statusMatch && textMatch;
      })
    : [];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Stats Section */}
      <StatsSection total={totalPolls} active={activePolls} closed={closedPolls} />

      {/* Main Content */}
      <div className="flex-1 px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header with actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h2 className="text-heading-2 mb-2">All Polls</h2>
              <p className="text-body-sm text-base-content/60">
                {filteredPolls.length} {filterStatus !== "all" ? filterStatus : ""} poll
                {filteredPolls.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative md:w-64 w-full">
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                <input
                  type="text"
                  placeholder="Search polls..."
                  className="input input-bordered w-full pl-10 input-sm"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                />
              </div>
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
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-heading-3 mb-2">No {filterStatus} polls found</h3>
              <p className="text-body text-base-content/60">Try changing the filter to see more polls</p>
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
