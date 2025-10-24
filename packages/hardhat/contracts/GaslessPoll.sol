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

    // Poll structure
    struct Poll {
        string question;
        uint256 yesVotes;
        uint256 noVotes;
        bool active;
        address creator;
        uint256 createdAt;
    }

    // Storage mappings
    mapping(uint256 => Poll) public polls;
    mapping(address => uint256) public nonces; // Prevent replay attacks
    mapping(uint256 => mapping(address => bool)) public hasVoted; // Track if user voted on poll

    // Events
    event PollCreated(uint256 indexed pollId, string question, address indexed creator);
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
     * @dev Creates a new poll
     * @param _question The poll question
     */
    function createPoll(string memory _question) external returns (uint256) {
        require(bytes(_question).length > 0, "Question cannot be empty");

        uint256 pollId = pollCount++;
        polls[pollId] = Poll({
            question: _question,
            yesVotes: 0,
            noVotes: 0,
            active: true,
            creator: msg.sender,
            createdAt: block.timestamp
        });

        emit PollCreated(pollId, _question, msg.sender);
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
            require(polls[pollId].active, "Poll is not active");

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
     * @dev Closes a poll (only creator can close)
     * @param _pollId The poll ID to close
     */
    function closePoll(uint256 _pollId) external {
        require(_pollId < pollCount, "Poll does not exist");
        require(polls[_pollId].creator == msg.sender, "Only creator can close poll");
        require(polls[_pollId].active, "Poll already closed");

        polls[_pollId].active = false;
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
            uint256 createdAt
        )
    {
        require(_pollId < pollCount, "Poll does not exist");
        Poll memory poll = polls[_pollId];
        return (poll.question, poll.yesVotes, poll.noVotes, poll.active, poll.creator, poll.createdAt);
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
            uint256[] memory createdAts
        )
    {
        pollIds = new uint256[](pollCount);
        questions = new string[](pollCount);
        yesVotes = new uint256[](pollCount);
        noVotes = new uint256[](pollCount);
        active = new bool[](pollCount);
        creators = new address[](pollCount);
        createdAts = new uint256[](pollCount);

        for (uint256 i = 0; i < pollCount; i++) {
            Poll memory poll = polls[i];
            pollIds[i] = i;
            questions[i] = poll.question;
            yesVotes[i] = poll.yesVotes;
            noVotes[i] = poll.noVotes;
            active[i] = poll.active;
            creators[i] = poll.creator;
            createdAts[i] = poll.createdAt;
        }
    }
}
