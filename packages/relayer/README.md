# Gasless Poll Relayer Service

A Node.js/Express service that collects signed votes from users and submits them in batches to the GaslessPoll smart contract.

## Features

- **Vote Collection**: Receives EIP-712 signed votes via REST API
- **Signature Verification**: Validates votes before queuing
- **Batch Processing**: Submits multiple votes in single transactions
- **Automatic Processing**: Processes batches at regular intervals
- **Health Monitoring**: Provides health check and status endpoints
- **Security**: Input validation, rate limiting, CORS protection

## Setup

1. Install dependencies:

```bash
cd packages/relayer
npm install
```

2. Configure environment:

```bash
cp env.example .env
# Edit .env with your configuration
```

3. Start the service:

```bash
npm run dev  # Development with auto-reload
npm start    # Production
```

## Configuration

Edit `.env` file with your settings:

- `PORT`: Service port (default: 3001)
- `RPC_URL`: Blockchain RPC endpoint
- `CONTRACT_ADDRESS`: Deployed GaslessPoll contract address
- `RELAYER_PRIVATE_KEY`: Private key for the relayer wallet
- `BATCH_SIZE`: Number of votes per batch (default: 10)
- `BATCH_INTERVAL`: Time between batch processing in ms (default: 10000)

## API Endpoints

### POST /submit-vote

Submit a signed vote for processing.

**Request Body:**

```json
{
  "pollId": 0,
  "vote": true,
  "nonce": 0,
  "signature": "0x...",
  "voter": "0x..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Vote submitted successfully",
  "queuePosition": 1,
  "estimatedProcessingTime": 10000
}
```

### GET /health

Health check endpoint.

### GET /pending-votes

View pending votes in the queue.

### POST /process-batch

Manually trigger batch processing (for testing).

## How It Works

1. **Vote Reception**: Users submit EIP-712 signed votes via `/submit-vote`
2. **Validation**: Service validates signature, nonce, and poll status
3. **Queuing**: Valid votes are added to the pending queue
4. **Batch Processing**: Every `BATCH_INTERVAL`, pending votes are submitted to the contract
5. **Gas Optimization**: Single transaction processes multiple votes

## Security Features

- EIP-712 signature verification
- Nonce-based replay protection
- Duplicate vote detection
- Input validation and sanitization
- CORS and security headers
- Rate limiting protection

## Monitoring

The service provides several monitoring endpoints:

- `GET /`: Service status and statistics
- `GET /health`: Health check for load balancers
- `GET /pending-votes`: View current queue status

## Production Deployment

For production deployment:

1. Use environment variables for all configuration
2. Set up proper logging (consider Winston or similar)
3. Implement Redis or database for vote storage
4. Add rate limiting middleware
5. Set up monitoring and alerting
6. Use PM2 or similar for process management
7. Configure reverse proxy (nginx)
8. Set up SSL/TLS certificates

## Development

```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Run tests
npm test
```


