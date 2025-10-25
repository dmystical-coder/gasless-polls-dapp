### **Project Primer: The Gasless Poll dApp**

#### **1. Project Objective**

We are building a "Gasless Poll" decentralized application (dApp). The primary goal is to create a fully functional polling system where users can vote without paying any gas fees, thereby eliminating a major friction point in dApp user experience. This project has been funded by a BuidlGuidl grant and must be completed within a 2-week timeframe.

#### **2. Core Architecture & User Flow**

The system separates the act of voting from the on-chain settlement to achieve its gasless nature for the end-user. The flow is as follows:

1.  **Poll Creation:** The project admin creates a poll by calling a function on the smart contract.
2.  **Voting (Off-Chain):** A user decides to vote. The frontend constructs a structured, typed message according to the **EIP-712** standard. The user signs this message with their wallet (e.g., MetaMask). This action is completely **free** and does not require a transaction.
3.  **Signature Relay:** The user's signed message is sent via an HTTP request to a backend service called the **Relayer**.
4.  **Batching:** The Relayer collects multiple signed messages from various users.
5.  **Settlement (On-Chain):** The Relayer periodically calls a function on the smart contract, submitting a batch of the collected signatures in a **single transaction**. The Relayer pays the gas fee for this one transaction.
6.  **Verification:** The smart contract verifies each signature cryptographically to confirm its authenticity and the signer's address. It also uses a nonce system to prevent replay attacks (a user voting twice with the same signature).
7.  **Tallying:** After verification, the smart contract updates the final vote counts for the poll.

#### **3. Tech Stack**

* **Framework:** **Scaffold-ETH 2** (provides the Hardhat and Next.js foundation)
* **Smart Contract:** Solidity
* **Frontend:** Next.js / React, wagmi hooks, viem
* **Relayer:** Node.js with Express.js

#### **4. Key Components to Build**

**A. Smart Contract (`GaslessPoll.sol`)**
* **State Variables:**
    * `address private owner`: The address of the relayer.
    * `mapping(uint256 => Poll) private polls`: Stores poll data.
    * `mapping(address => uint256) private nonces`: Tracks user nonces to prevent replay attacks.
* **Struct `Poll`:**
    * `string question`
    * `uint256 yesVotes`
    * `uint256 noVotes`
* **Core Functions:**
    * `createPoll(string memory _question)`: Creates a new poll.
    * `getVoteHash(uint256 _pollId, bool _vote)`: An external view function that constructs the precise EIP-712 hash that users need to sign.
    * `submitVotes(bytes[] memory signatures, ...)`: A function restricted to the `owner` (the Relayer) that takes an array of signatures, verifies them using `ecrecover`, and updates the vote counts.

**B. Relayer (`server.js`)**
* A simple Node.js/Express server.
* A single API endpoint, e.g., `POST /submit-vote`, to receive and temporarily store signed messages from the frontend.
* A script or function to call the `submitVotes` function on the smart contract with the collected signatures.

**C. Frontend (React Components)**
* `PollList.tsx`: Displays a list of all created polls and their current results.
* `VoteCard.tsx`: A component for a single poll that contains the voting buttons. When a button is clicked, it should:
    1.  Get the user's current nonce from the contract.
    2.  Construct the EIP-712 typed data object.
    3.  Prompt the user to sign the data using `signTypedData`.
    4.  Send the resulting signature to the Relayer's API endpoint.

#### **5. Final Deliverables**

* A deployed dApp on the Sepolia testnet.
* A well-documented `README.md` file in the GitHub repository.
* A 2-3 minute demo video showcasing the user flow.