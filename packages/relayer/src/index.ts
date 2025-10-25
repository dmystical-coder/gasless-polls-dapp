import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as string;
const CONTRACT_ADDRESS = process.env.GASLESS_POLL_CONTRACT_ADDRESS as string;

if (!PRIVATE_KEY || !CONTRACT_ADDRESS) {
    console.error("Missing DEPLOYER_PRIVATE_KEY or GASLESS_POLL_CONTRACT_ADDRESS in .env file");
    process.exit(1);
}

// GaslessPoll Contract ABI (minimal functions needed for relayer)
const GASLESS_POLL_ABI = [
    "function submitVotes(uint256[] memory _pollIds, bool[] memory _votes, uint256[] memory _nonces, bytes[] memory _signatures) external",
    "function polls(uint256) view returns (string question, uint256 yesVotes, uint256 noVotes, bool active, address creator, uint256 createdAt)",
];

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || "http://127.0.0.1:8545");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, GASLESS_POLL_ABI, wallet);

// In-memory storage for vote signatures
let voteQueue: any[] = [];

app.post("/submit-vote", (req, res) => {
    const { pollId, vote, nonce, signature, voter } = req.body;

    if (
        pollId === undefined ||
        vote === undefined ||
        nonce === undefined ||
        !signature ||
        !voter
    ) {
        return res.status(400).json({ error: "Invalid vote submission" });
    }

    console.log(`Received vote from ${voter} for poll ${pollId}`);

    voteQueue.push({ pollId, vote, nonce, signature, voter });

    res.status(200).json({ message: "Vote received and queued for processing" });
});

// Process the vote queue every 30 seconds
setInterval(async () => {
    if (voteQueue.length === 0) {
        return;
    }

    console.log(`Processing ${voteQueue.length} votes...`);

    const votesToProcess = [...voteQueue];
    voteQueue = [];

    // Filter out votes for inactive polls
    const validVotes: any[] = [];
    for (const vote of votesToProcess) {
        try {
            const pollData = await contract.polls(vote.pollId);
            if (pollData.active) {
                validVotes.push(vote);
            } else {
                console.log(`Discarding vote for inactive poll ${vote.pollId} from ${vote.voter}`);
            }
        } catch (err) {
            console.error(`Error checking poll ${vote.pollId}:`, err);
            // If we can't check, keep it for next batch
            validVotes.push(vote);
        }
    }

    if (validVotes.length === 0) {
        console.log("No valid votes to process");
        return;
    }

    const pollIds = validVotes.map(v => v.pollId);
    const votes = validVotes.map(v => v.vote);
    const nonces = validVotes.map(v => v.nonce);
    const signatures = validVotes.map(v => v.signature);

    try {
        const tx = await contract.submitVotes(pollIds, votes, nonces, signatures);
        console.log(`Transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log("Transaction confirmed!");
    } catch (error) {
        console.error("Error submitting votes:", error);
        // Add votes back to the queue if the transaction fails
        voteQueue.unshift(...validVotes);
    }
}, 30000);

app.listen(PORT, () => {
    console.log(`Relayer server running on port ${PORT}`);
});
