export type Poll = {
  id: bigint;
  question: string;
  yesVotes: bigint;
  noVotes: bigint;
  active: boolean;
  creator: string;
  createdAt: bigint;
};
