"use client";

import { BoltIcon, ShieldCheckIcon, SparklesIcon } from "@heroicons/react/24/outline";

export const Hero = () => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 py-20 px-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto">
        <div className="text-center space-y-8 animate-slide-up">
          {/* Main heading */}
          <h1 className="text-heading-1 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Vote Without Limits
          </h1>

          {/* Subheading */}
          <p className="text-body-lg text-base-content/70 max-w-2xl mx-auto">
            Create and participate in polls without paying gas fees. Your votes are signed off-chain and submitted in
            batches by our relayer service.
          </p>

          {/* Feature highlights */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-8">
            <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-base-100/70 backdrop-blur-sm border border-base-300/50">
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                <BoltIcon className="w-6 h-6 text-success" />
              </div>
              <h3 className="text-heading-4 text-sm">Instant Voting</h3>
              <p className="text-body-sm text-base-content/60 text-center">
                Sign your vote instantly without waiting for blockchain confirmation
              </p>
            </div>

            <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-base-100/70 backdrop-blur-sm border border-base-300/50">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldCheckIcon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-heading-4 text-sm">Secure & Verified</h3>
              <p className="text-body-sm text-base-content/60 text-center">
                EIP-712 signatures ensure your vote is cryptographically secure
              </p>
            </div>

            <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-base-100/70 backdrop-blur-sm border border-base-300/50">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-heading-4 text-sm">Batch Processing</h3>
              <p className="text-body-sm text-base-content/60 text-center">
                Votes are collected and submitted in batches to optimize gas costs
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
