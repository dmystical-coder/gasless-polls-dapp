# 🗳️ Gasless Polls

A decentralized polling application where users can vote **without paying gas fees** using EIP-712 signatures and a relayer service for batch transaction submission.

⚙️ Built using NextJS, RainbowKit, Hardhat, Wagmi, Viem, Typescript, and Express.

## 🌟 Features

- ✅ **Gasless Voting** - Sign votes off-chain, no gas fees for voters
- ✅ **EIP-712 Signatures** - Cryptographically secure typed data signing
- ✅ **Batch Processing** - Relayer submits votes in batches for efficiency
- ✅ **Modern UI** - Beautiful, responsive interface with dark mode
- ✅ **Real-time Updates** - Live poll results and status
- ✅ **Nonce-based Security** - Prevents replay attacks
- ✅ **Creator Controls** - Poll creators can close their polls

- ✅ **Contract Hot Reload**: Your frontend auto-adapts to your smart contract as you edit it.
- 🪝 **[Custom hooks](https://docs.scaffoldeth.io/hooks/)**: Collection of React hooks wrapper around [wagmi](https://wagmi.sh/) to simplify interactions with smart contracts with typescript autocompletion.
- 🧱 [**Components**](https://docs.scaffoldeth.io/components/): Collection of common web3 components to quickly build your frontend.
- 🔥 **Burner Wallet & Local Faucet**: Quickly test your application with a burner wallet and local faucet.
- 🔐 **Integration with Wallet Providers**: Connect to different wallet providers and interact with the Ethereum network.

![Debug Contracts tab](https://github.com/scaffold-eth/scaffold-eth-2/assets/55535804/b237af0c-5027-4849-a5c1-2e31495cccb1)

## Requirements

Before you begin, you need to install the following tools:

- [Node (>= v20.18.3)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

## 🚀 Quickstart

### Prerequisites

- Node.js >= v20.18.3
- Yarn v1 or v2+
- Git

### 1. Install Dependencies

```bash
yarn install
```

### 2. Start Local Blockchain

In terminal 1:

```bash
yarn chain
```

This starts a local Hardhat network on `http://127.0.0.1:8545`

### 3. Deploy Smart Contract

In terminal 2:

```bash
yarn deploy
```

This deploys the `GaslessPoll` contract and saves the address to `packages/nextjs/contracts/deployedContracts.ts`

### 4. Configure Relayer

In terminal 3:

```bash
cd packages/relayer
cp env.example .env
```

Edit `.env` and add:

- `DEPLOYER_PRIVATE_KEY` - Get from `yarn chain` output (Account #0 private key)
- `GASLESS_POLL_CONTRACT_ADDRESS` - Copied from deploy output or `deployedContracts.ts`

```bash
yarn dev
```

Relayer will run on `http://localhost:3001`

### 5. Start Frontend

In terminal 4:

```bash
yarn start
```

Visit `http://localhost:3000` to use the dApp!

## 📝 How It Works

1. **Create Poll** - Anyone can create a poll (requires gas for creation)
2. **Vote (Gasless)** - Users sign votes with their wallet (no gas!)
3. **Relayer Batches** - Signed votes are queued every 30 seconds
4. **On-chain Submission** - Relayer pays gas to submit batch of votes
5. **Results Update** - Vote counts update in real-time

## 🧪 Testing

```bash
cd packages/hardhat
yarn hardhat test
```

## 🛠️ Project Structure

```
gasless-polls/
├── packages/
│   ├── hardhat/          # Smart contracts
│   │   ├── contracts/    # GaslessPoll.sol
│   │   ├── deploy/       # Deployment scripts
│   │   └── test/         # Contract tests
│   ├── nextjs/           # Frontend dApp
│   │   ├── app/          # Next.js pages
│   │   ├── components/   # React components
│   │   └── hooks/        # Custom hooks
│   └── relayer/          # Backend relayer service
│       └── src/          # Express server
```

## Documentation

Visit our [docs](https://docs.scaffoldeth.io) to learn how to start building with Scaffold-ETH 2.

To know more about its features, check out our [website](https://scaffoldeth.io).

## Contributing to Scaffold-ETH 2

We welcome contributions to Scaffold-ETH 2!

Please see [CONTRIBUTING.MD](https://github.com/scaffold-eth/scaffold-eth-2/blob/main/CONTRIBUTING.md) for more information and guidelines for contributing to Scaffold-ETH 2.
