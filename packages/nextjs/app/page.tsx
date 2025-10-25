"use client";

import type { NextPage } from "next";
import { Hero } from "~~/components/Hero";
import PollList from "~~/components/polls/PollList";

const Home: NextPage = () => {
  return (
    <div className="flex flex-col">
      <Hero />
      <PollList />
    </div>
  );
};

export default Home;
