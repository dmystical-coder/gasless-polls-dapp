const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Configuration
const config = {
    rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
    chainId: parseInt(process.env.CHAIN_ID) || 31337,
    contractAddress: process.env.CONTRACT_ADDRESS,
    relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY,
    batchSize: parseInt(process.env.BATCH_SIZE) || 10,
    batchInterval: parseInt(process.env.BATCH_INTERVAL) || 10000, // 10 seconds
    maxPendingVotes: parseInt(process.env.MAX_PENDING_VOTES) || 100
};

// Contract ABI (simplified for the functions we need)
const CONTRACT_ABI = [
    "function submitVotes(uint256[] memory _pollIds, bool[] memory _votes, uint256[] memory _nonces, bytes[] memory _signatures) external",
    "function recoverSigner(uint256 _pollId, bool _vote, uint256 _nonce, bytes memory _signature) public view returns (address)",
    "function getUserNonce(address _user) external view returns (uint256)",
    "function hasUserVoted(uint256 _pollId, address _user) external view returns (bool)",
    "function getPoll(uint256 _pollId) external view returns (string memory question, uint256 yesVotes, uint256 noVotes, bool active, address creator, uint256 createdAt)"
];

// Initialize blockchain connection
let provider, wallet, contract;

try {
    provider = new ethers.JsonRpcProvider(config.rpcUrl);
    if (config.relayerPrivateKey) {
        wallet = new ethers.Wallet(config.relayerPrivateKey, provider);
        if (config.contractAddress) {
            contract = new ethers.Contract(config.contractAddress, CONTRACT_ABI, wallet);
        }
    }
} catch (error) {
    console.error('❌ Failed to initialize blockchain connection:', error.message);
}

// In-memory storage for pending votes (in production, use Redis or database)
let pendingVotes = [];
let processingBatch = false;

// Vote validation function
async function validateVote(voteData) {
    const { pollId, vote, nonce, signature, voter } = voteData;

    try {
        // Check if contract is available
        if (!contract) {
            throw new Error('Contract not initialized');
        }

        // Verify poll exists and is active
        const pollInfo = await contract.getPoll(pollId);
        if (!pollInfo.active) {
            throw new Error('Poll is not active');
        }

        // Check if user already voted
        const hasVoted = await contract.hasUserVoted(pollId, voter);
        if (hasVoted) {
            throw new Error('User has already voted on this poll');
        }

        // Verify nonce
        const expectedNonce = await contract.getUserNonce(voter);
        if (expectedNonce.toString() !== nonce.toString()) {
            throw new Error(`Invalid nonce. Expected: ${expectedNonce}, got: ${nonce}`);
        }

        // Verify signature
        const recoveredSigner = await contract.recoverSigner(pollId, vote, nonce, signature);
        if (recoveredSigner.toLowerCase() !== voter.toLowerCase()) {
            throw new Error('Invalid signature');
        }

        return true;
    } catch (error) {
        console.error('Vote validation failed:', error.message);
        throw error;
    }
}

// Batch processing function
async function processPendingVotes() {
    if (processingBatch || pendingVotes.length === 0 || !contract) {
        return;
    }

    processingBatch = true;
    console.log(`🔄 Processing batch of ${Math.min(pendingVotes.length, config.batchSize)} votes...`);

    try {
        // Take a batch of votes
        const batchVotes = pendingVotes.splice(0, config.batchSize);

        // Prepare arrays for contract call
        const pollIds = batchVotes.map(v => v.pollId);
        const votes = batchVotes.map(v => v.vote);
        const nonces = batchVotes.map(v => v.nonce);
        const signatures = batchVotes.map(v => v.signature);

        // Submit to contract
        const tx = await contract.submitVotes(pollIds, votes, nonces, signatures);
        console.log(`📤 Batch submitted! Transaction hash: ${tx.hash}`);

        // Wait for confirmation
        const receipt = await tx.wait();
        console.log(`✅ Batch confirmed in block ${receipt.blockNumber}`);
        console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);

    } catch (error) {
        console.error('❌ Batch processing failed:', error.message);
        // In production, implement retry logic or dead letter queue
    } finally {
        processingBatch = false;
    }
}

// Start batch processing timer
if (contract) {
    setInterval(processPendingVotes, config.batchInterval);
    console.log(`⏰ Batch processing scheduled every ${config.batchInterval}ms`);
}

// Routes
app.get('/', (req, res) => {
    res.json({
        service: 'Gasless Poll Relayer',
        version: '1.0.0',
        status: 'running',
        pendingVotes: pendingVotes.length,
        maxPendingVotes: config.maxPendingVotes,
        batchSize: config.batchSize,
        contractConnected: !!contract
    });
});

app.get('/health', (req, res) => {
    const isHealthy = !!contract && pendingVotes.length < config.maxPendingVotes;
    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        pendingVotes: pendingVotes.length,
        maxPendingVotes: config.maxPendingVotes,
        contractConnected: !!contract,
        timestamp: new Date().toISOString()
    });
});

app.post('/submit-vote', async (req, res) => {
    try {
        const { pollId, vote, nonce, signature, voter } = req.body;

        // Basic validation
        if (typeof pollId !== 'number' || typeof vote !== 'boolean' ||
            typeof nonce !== 'number' || typeof signature !== 'string' ||
            typeof voter !== 'string') {
            return res.status(400).json({
                error: 'Invalid request body. Required: pollId (number), vote (boolean), nonce (number), signature (string), voter (string)'
            });
        }

        // Check if we're at capacity
        if (pendingVotes.length >= config.maxPendingVotes) {
            return res.status(503).json({
                error: 'Relayer is at capacity. Please try again later.'
            });
        }

        // Check for duplicate vote in pending queue
        const isDuplicate = pendingVotes.some(v =>
            v.pollId === pollId && v.voter.toLowerCase() === voter.toLowerCase()
        );

        if (isDuplicate) {
            return res.status(409).json({
                error: 'Vote already pending for this poll and voter'
            });
        }

        // Validate vote
        await validateVote({ pollId, vote, nonce, signature, voter });

        // Add to pending queue
        pendingVotes.push({
            pollId,
            vote,
            nonce,
            signature,
            voter,
            timestamp: Date.now()
        });

        console.log(`📝 Vote queued: Poll ${pollId}, Voter ${voter.slice(0, 8)}..., Vote: ${vote ? 'Yes' : 'No'}`);

        res.json({
            success: true,
            message: 'Vote submitted successfully',
            queuePosition: pendingVotes.length,
            estimatedProcessingTime: Math.ceil(pendingVotes.length / config.batchSize) * config.batchInterval
        });

        // Process immediately if we have a full batch
        if (pendingVotes.length >= config.batchSize) {
            setImmediate(processPendingVotes);
        }

    } catch (error) {
        console.error('Vote submission error:', error.message);
        res.status(400).json({
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

// Force batch processing (for testing)
app.post('/process-batch', async (req, res) => {
    if (processingBatch) {
        return res.status(409).json({ error: 'Batch processing already in progress' });
    }

    try {
        await processPendingVotes();
        res.json({ success: true, message: 'Batch processing completed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');

    // Process any remaining votes
    if (pendingVotes.length > 0) {
        console.log(`📤 Processing ${pendingVotes.length} remaining votes...`);
        processPendingVotes().finally(() => {
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`🚀 Gasless Poll Relayer running on port ${PORT}`);
    console.log(`🔗 Contract: ${config.contractAddress || 'Not configured'}`);
    console.log(`⚡ RPC: ${config.rpcUrl}`);
    console.log(`📦 Batch size: ${config.batchSize}`);
    console.log(`⏱️  Batch interval: ${config.batchInterval}ms`);
});

module.exports = app;


