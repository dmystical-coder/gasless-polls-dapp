import { PlusIcon } from "@heroicons/react/24/outline";

interface EmptyStateProps {
  onCreateClick: () => void;
  isConnected: boolean;
}

export const EmptyState = ({ onCreateClick, isConnected }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 animate-fade-in">
      <div className="w-32 h-32 rounded-full bg-base-200 flex items-center justify-center mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-16 h-16 text-base-content/30"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
          />
        </svg>
      </div>

      <h3 className="text-heading-3 mb-3">No Polls Yet</h3>
      <p className="text-body text-base-content/60 text-center max-w-md mb-8">
        Be the first to create a poll and start gathering opinions from the community!
      </p>

      {isConnected ? (
        <button onClick={onCreateClick} className="btn btn-primary btn-lg gap-2">
          <PlusIcon className="w-5 h-5" />
          Create Your First Poll
        </button>
      ) : (
        <div className="alert alert-info max-w-md">
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
          <span>Connect your wallet to create polls</span>
        </div>
      )}
    </div>
  );
};
