const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
const config = {
    rpcUrl: 'http://localhost:8545',
    chainId: 31337,
    contractAddress: '0x5fbdb2315678afecb367f032d93f642f64180aa3',
    relayerPrivateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    batchSize: 10,
    batchInterval: 10000
};

// Middleware
app.use(cors({
    origin: ['http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

// Contract ABI (simplified)
const CONTRACT_ABI = [
    "function submitVotes(uint256[] memory _pollIds, bool[] memory _votes, uint256[] memory _nonces, bytes[] memory _signatures) external",
    "function recoverSigner(uint256 _pollId, bool _vote, uint256 _nonce, bytes memory _signature) public view returns (address)",
    "function getUserNonce(address _user) external view returns (uint256)",
    "function hasUserVoted(uint256 _pollId, address _user) external view returns (bool)"
];

// Initialize blockchain connection
let provider, wallet, contract;

try {
    provider = new ethers.JsonRpcProvider(config.rpcUrl);
    wallet = new ethers.Wallet(config.relayerPrivateKey, provider);
    contract = new ethers.Contract(config.contractAddress, CONTRACT_ABI, wallet);
    console.log('✅ Blockchain connection initialized');
    console.log('📍 Contract address:', config.contractAddress);
    console.log('👤 Relayer address:', wallet.address);
} catch (error) {
    console.error('❌ Failed to initialize blockchain connection:', error.message);
}

// In-memory storage for pending votes
let pendingVotes = [];

// Routes
app.get('/', (req, res) => {
    res.json({
        service: 'Gasless Poll Relayer (Simple)',
        version: '1.0.0',
        status: 'running',
        pendingVotes: pendingVotes.length,
        contractConnected: !!contract,
        contractAddress: config.contractAddress,
        relayerAddress: wallet?.address
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        pendingVotes: pendingVotes.length,
        contractConnected: !!contract,
        timestamp: new Date().toISOString()
    });
});

app.post('/submit-vote', async (req, res) => {
    try {
        const { pollId, vote, nonce, signature, voter } = req.body;

        console.log('📝 Received vote:', {
            pollId,
            vote: vote ? 'Yes' : 'No',
            voter: voter?.slice(0, 8) + '...',
            nonce
        });

        // Basic validation
        if (typeof pollId !== 'number' || typeof vote !== 'boolean' ||
            typeof nonce !== 'number' || typeof signature !== 'string' ||
            typeof voter !== 'string') {
            return res.status(400).json({
                error: 'Invalid request body'
            });
        }

        // For now, just add to queue without validation (for testing)
        pendingVotes.push({
            pollId,
            vote,
            nonce,
            signature,
            voter,
            timestamp: Date.now()
        });

        console.log('✅ Vote queued successfully');

        res.json({
            success: true,
            message: 'Vote submitted successfully',
            queuePosition: pendingVotes.length
        });

        // Auto-process if we have votes
        if (pendingVotes.length >= config.batchSize) {
            setTimeout(processPendingVotes, 1000);
        }

    } catch (error) {
        console.error('❌ Vote submission error:', error.message);
        res.status(500).json({
            error: error.message
        });
    }
});

app.get('/pending-votes', (req, res) => {
    res.json({
        count: pendingVotes.length,
        votes: pendingVotes.map(v => ({
            pollId: v.pollId,
            voter: v.voter,
            vote: v.vote,
            timestamp: v.timestamp
        }))
    });
});

app.post('/process-batch', async (req, res) => {
    try {
        await processPendingVotes();
        res.json({ success: true, message: 'Batch processed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Batch processing function
async function processPendingVotes() {
    if (pendingVotes.length === 0 || !contract) {
        console.log('ℹ️ No votes to process or contract not available');
        return;
    }

    console.log(`🔄 Processing ${pendingVotes.length} votes...`);

    try {
        const batchVotes = pendingVotes.splice(0, config.batchSize);

        const pollIds = batchVotes.map(v => v.pollId);
        const votes = batchVotes.map(v => v.vote);
        const nonces = batchVotes.map(v => v.nonce);
        const signatures = batchVotes.map(v => v.signature);

        console.log('📤 Submitting batch to contract...');

        const tx = await contract.submitVotes(pollIds, votes, nonces, signatures);
        console.log(`📤 Transaction sent: ${tx.hash}`);

        const receipt = await tx.wait();
        console.log(`✅ Batch confirmed in block ${receipt.blockNumber}`);
        console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);

    } catch (error) {
        console.error('❌ Batch processing failed:', error.message);
        // Put votes back in queue on failure
        pendingVotes.unshift(...batchVotes);
    }
}

// Auto-process votes periodically
setInterval(() => {
    if (pendingVotes.length > 0) {
        processPendingVotes();
    }
}, config.batchInterval);

app.listen(PORT, () => {
    console.log(`🚀 Simple Gasless Poll Relayer running on port ${PORT}`);
    console.log(`🔗 Contract: ${config.contractAddress}`);
    console.log(`⚡ RPC: ${config.rpcUrl}`);
});

module.exports = app;


