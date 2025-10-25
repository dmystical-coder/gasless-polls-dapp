import React from "react";

interface StatsSectionProps {
  total: number;
  active: number;
  closed: number;
}

/**
 * Displays platform-wide statistics in three modern cards.
 * Tailwind + daisyUI classes are used so it picks theme colors automatically.
 */
export const StatsSection: React.FC<StatsSectionProps> = ({ total, active, closed }) => {
  return (
    <div className="bg-base-100 border-b border-base-300 py-8 px-4 animate-fade-in">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat bg-base-200 rounded-2xl p-6 border border-base-300">
          <div className="stat-title text-sm">Total Polls</div>
          <div className="stat-value text-4xl text-primary">{total}</div>
          <div className="stat-desc">All time</div>
        </div>
        <div className="stat bg-base-200 rounded-2xl p-6 border border-base-300">
          <div className="stat-title text-sm">Active Polls</div>
          <div className="stat-value text-4xl text-success">{active}</div>
          <div className="stat-desc">Currently open</div>
        </div>
        <div className="stat bg-base-200 rounded-2xl p-6 border border-base-300">
          <div className="stat-title text-sm">Closed Polls</div>
          <div className="stat-value text-4xl text-base-content/40">{closed}</div>
          <div className="stat-desc">Voting ended</div>
        </div>
      </div>
    </div>
  );
};
