//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "hardhat/console.sol";

/**
 * @title GaslessPoll
 * @dev A gasless polling system using EIP-712 signatures for off-chain voting
 * @author BuidlGuidl
 */
contract GaslessPoll {
    // Domain separator for EIP-712
    bytes32 private constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    // Vote typehash for EIP-712
    bytes32 private constant VOTE_TYPEHASH = keccak256("Vote(uint256 pollId,bool vote,uint256 nonce)");

    // State Variables
    address public immutable owner; // The relayer address
    uint256 public pollCount = 0;

    // Constants for poll duration limits
    uint256 public constant MIN_POLL_DURATION = 1 hours;
    uint256 public constant MAX_POLL_DURATION = 30 days;
    uint256 public constant MAX_QUESTION_LENGTH = 500;

    // Poll structure
    struct Poll {
        string question;
        uint256 yesVotes;
        uint256 noVotes;
        address creator;
        uint256 createdAt;
        uint256 duration; // Duration in seconds
    }

    // Storage mappings
    mapping(uint256 => Poll) public polls;
    mapping(address => uint256) public nonces; // Prevent replay attacks
    mapping(uint256 => mapping(address => bool)) public hasVoted; // Track if user voted on poll

    // Events
    event PollCreated(
        uint256 indexed pollId,
        string question,
        address indexed creator,
        uint256 duration,
        uint256 expiresAt
    );
    event VoteSubmitted(uint256 indexed pollId, address indexed voter, bool vote);
    event BatchVotesProcessed(uint256 indexed pollId, uint256 yesCount, uint256 noCount);

    // Constructor
    constructor(address _owner) {
        owner = _owner;
    }

    // Modifier to restrict functions to owner (relayer)
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    /**
     * @dev Checks if a poll is still active based on time
     * @param _pollId The poll ID
     * @return bool True if poll is still active
     */
    function isPollActive(uint256 _pollId) public view returns (bool) {
        require(_pollId < pollCount, "Poll does not exist");
        Poll memory poll = polls[_pollId];
        return block.timestamp < poll.createdAt + poll.duration;
    }

    /**
     * @dev Creates a new poll with configurable duration
     * @param _question The poll question
     * @param _duration Duration in seconds (must be between MIN and MAX)
     */
    function createPoll(string memory _question, uint256 _duration) external returns (uint256) {
        require(bytes(_question).length > 0, "Question cannot be empty");
        require(bytes(_question).length <= MAX_QUESTION_LENGTH, "Question too long");
        require(_duration >= MIN_POLL_DURATION, "Duration below minimum");
        require(_duration <= MAX_POLL_DURATION, "Duration above maximum");

        uint256 pollId = pollCount++;
        uint256 expiresAt = block.timestamp + _duration;

        polls[pollId] = Poll({
            question: _question,
            yesVotes: 0,
            noVotes: 0,
            creator: msg.sender,
            createdAt: block.timestamp,
            duration: _duration
        });

        emit PollCreated(pollId, _question, msg.sender, _duration, expiresAt);
        return pollId;
    }

    /**
     * @dev Gets the domain separator for EIP-712
     */
    function getDomainSeparator() public view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    DOMAIN_TYPEHASH,
                    keccak256(bytes("GaslessPoll")),
                    keccak256(bytes("1")),
                    block.chainid,
                    address(this)
                )
            );
    }

    /**
     * @dev Constructs the hash that users need to sign for voting
     * @param _pollId The poll ID
     * @param _vote The vote (true for yes, false for no)
     * @param _nonce The user's current nonce
     */
    function getVoteHash(uint256 _pollId, bool _vote, uint256 _nonce) external view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(VOTE_TYPEHASH, _pollId, _vote, _nonce));

        return keccak256(abi.encodePacked("\x19\x01", getDomainSeparator(), structHash));
    }

    /**
     * @dev Recovers the signer address from a signature
     * @param _pollId The poll ID
     * @param _vote The vote
     * @param _nonce The nonce used
     * @param _signature The signature bytes
     */
    function recoverSigner(
        uint256 _pollId,
        bool _vote,
        uint256 _nonce,
        bytes memory _signature
    ) public view returns (address) {
        bytes32 hash = this.getVoteHash(_pollId, _vote, _nonce);

        // Extract r, s, v from signature
        require(_signature.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := byte(0, mload(add(_signature, 96)))
        }

        return ecrecover(hash, v, r, s);
    }

    /**
     * @dev Submits a batch of votes (only callable by owner/relayer)
     * @param _pollIds Array of poll IDs
     * @param _votes Array of votes (true for yes, false for no)
     * @param _nonces Array of nonces
     * @param _signatures Array of signatures
     */
    function submitVotes(
        uint256[] memory _pollIds,
        bool[] memory _votes,
        uint256[] memory _nonces,
        bytes[] memory _signatures
    ) external onlyOwner {
        require(_pollIds.length > 0, "Cannot submit empty batch");
        require(
            _pollIds.length == _votes.length && _votes.length == _nonces.length && _nonces.length == _signatures.length,
            "Array lengths must match"
        );

        for (uint256 i = 0; i < _pollIds.length; i++) {
            uint256 pollId = _pollIds[i];
            bool vote = _votes[i];
            uint256 nonce = _nonces[i];
            bytes memory signature = _signatures[i];

            // Verify poll exists and is active
            require(pollId < pollCount, "Poll does not exist");
            require(isPollActive(pollId), "Poll has expired");

            // Recover signer address
            address signer = recoverSigner(pollId, vote, nonce, signature);
            require(signer != address(0), "Invalid signature");

            // Check nonce to prevent replay attacks
            require(nonces[signer] == nonce, "Invalid nonce");

            // Check if user already voted on this poll
            require(!hasVoted[pollId][signer], "User already voted");

            // Update nonce and voting status
            nonces[signer]++;
            hasVoted[pollId][signer] = true;

            // Update vote count
            if (vote) {
                polls[pollId].yesVotes++;
            } else {
                polls[pollId].noVotes++;
            }

            emit VoteSubmitted(pollId, signer, vote);
        }

        // Emit batch processing event for the last poll processed
        if (_pollIds.length > 0) {
            uint256 lastPollId = _pollIds[_pollIds.length - 1];
            emit BatchVotesProcessed(lastPollId, polls[lastPollId].yesVotes, polls[lastPollId].noVotes);
        }
    }

    /**
     * @dev Gets poll information
     * @param _pollId The poll ID
     */
    function getPoll(
        uint256 _pollId
    )
        external
        view
        returns (
            string memory question,
            uint256 yesVotes,
            uint256 noVotes,
            bool active,
            address creator,
            uint256 createdAt,
            uint256 duration
        )
    {
        require(_pollId < pollCount, "Poll does not exist");
        Poll memory poll = polls[_pollId];
        bool active = isPollActive(_pollId);
        return (poll.question, poll.yesVotes, poll.noVotes, active, poll.creator, poll.createdAt, poll.duration);
    }

    /**
     * @dev Gets user's current nonce
     * @param _user The user address
     */
    function getUserNonce(address _user) external view returns (uint256) {
        return nonces[_user];
    }

    /**
     * @dev Checks if user has voted on a poll
     * @param _pollId The poll ID
     * @param _user The user address
     */
    function hasUserVoted(uint256 _pollId, address _user) external view returns (bool) {
        return hasVoted[_pollId][_user];
    }

    /**
     * @dev Gets all polls (view function for frontend)
     */
    function getAllPolls()
        external
        view
        returns (
            uint256[] memory pollIds,
            string[] memory questions,
            uint256[] memory yesVotes,
            uint256[] memory noVotes,
            bool[] memory active,
            address[] memory creators,
            uint256[] memory createdAts,
            uint256[] memory durations
        )
    {
        pollIds = new uint256[](pollCount);
        questions = new string[](pollCount);
        yesVotes = new uint256[](pollCount);
        noVotes = new uint256[](pollCount);
        active = new bool[](pollCount);
        creators = new address[](pollCount);
        createdAts = new uint256[](pollCount);
        durations = new uint256[](pollCount);

        for (uint256 i = 0; i < pollCount; i++) {
            Poll memory poll = polls[i];
            pollIds[i] = i;
            questions[i] = poll.question;
            yesVotes[i] = poll.yesVotes;
            noVotes[i] = poll.noVotes;
            active[i] = isPollActive(i);
            creators[i] = poll.creator;
            createdAts[i] = poll.createdAt;
            durations[i] = poll.duration;
        }
    }

    /**
     * @dev Gets the number of active polls
     */
    function getActivePollCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < pollCount; i++) {
            if (isPollActive(i)) {
                count++;
            }
        }
        return count;
    }

    /**
     * @dev Gets the expiry timestamp of a poll
     * @param _pollId The poll ID
     * @return expiryTime Unix timestamp when poll expires
     */
    function getPollExpiryTime(uint256 _pollId) external view returns (uint256 expiryTime) {
        require(_pollId < pollCount, "Poll does not exist");
        Poll memory poll = polls[_pollId];
        return poll.createdAt + poll.duration;
    }

    /**
     * @dev Gets remaining time until poll expires (in seconds)
     * @param _pollId The poll ID
     * @return remainingTime Time in seconds (0 if poll has expired)
     */
    function getTimeUntilExpiry(uint256 _pollId) external view returns (uint256 remainingTime) {
        require(_pollId < pollCount, "Poll does not exist");
        Poll memory poll = polls[_pollId];

        uint256 expiryTime = poll.createdAt + poll.duration;
        if (block.timestamp >= expiryTime) {
            return 0;
        }

        return expiryTime - block.timestamp;
    }

    /**
     * @dev Gets all polls created by a specific address
     * @param _creator The creator address
     */
    function getPollsByCreator(address _creator) external view returns (uint256[] memory) {
        // First, count how many polls the creator has
        uint256 count = 0;
        for (uint256 i = 0; i < pollCount; i++) {
            if (polls[i].creator == _creator) {
                count++;
            }
        }

        // Create array and populate
        uint256[] memory creatorPolls = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < pollCount; i++) {
            if (polls[i].creator == _creator) {
                creatorPolls[index] = i;
                index++;
            }
        }

        return creatorPolls;
    }
}
