// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Simple admin-controled voter registration and candiadte voting system.
contract Voting {

    error Unauthorized();
    error InvalidAddress();
    error AlreadyRegistered();
    error NotRegistered();
    error AlreadyVoted();
    error InvalidCandidate();
    error NameRequired();
    error NoCandidates();


    event VoterRegistered(address indexed voter);
    event CandidateAdded(uint256 indexed candidateId, string name);
    event Voted(address indexed voter, uint256 indexed candidateId);

    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

 
    struct StoredCandidate {
        string name;
        uint256 voteCount;
    }


    address public immutable admin;

    // Voter registation and vote tracking (bit-packed flags per voter)
    // bit 0: registered, bit 1: voted
    mapping(address => uint8) private voterFlags;
    uint8 private constant FLAG_REGISTERED = 1;
    uint8 private constant FLAG_VOTED = 2;

    // Candiate registry stored by 1-based id (stored without redundent id)
    mapping(uint256 => StoredCandidate) private idToCandidate;
    uint256 public candidateCount;

    modifier onlyAdmin() {
        if (msg.sender != admin) revert Unauthorized();
        _;
    }

    /// @notice Initilizes contract and sets deployer as admin.
    constructor() {
        admin = msg.sender;
    }

    /// @notice Regsiters a voter. Only admin can call.
    /// @param voter Adress to register.
    function registerVoter(address voter) external onlyAdmin {
        if (voter == address(0)) revert InvalidAddress();
        if ((voterFlags[voter] & FLAG_REGISTERED) != 0) revert AlreadyRegistered();

        unchecked {
            voterFlags[voter] |= FLAG_REGISTERED;
        }
        emit VoterRegistered(voter);
    }

    /// @notice Adds a candiate. Only admin can call.
    /// @param name Candiate display name.
    function addCandidate(string calldata name) external onlyAdmin {
        if (bytes(name).length == 0) revert NameRequired();

        unchecked {
            // canddiate ids are 1-based
            candidateCount += 1;
        }

        idToCandidate[candidateCount] = StoredCandidate({name: name, voteCount: 0});
        emit CandidateAdded(candidateCount, name);
    }

    /// @notice Cast a vote for a candiate. Only registred voters may vote, once.
    /// @param candidateId The candiate id (1-based).
    function vote(uint256 candidateId) external {
        uint8 flags = voterFlags[msg.sender];
        if ((flags & FLAG_REGISTERED) == 0) revert NotRegistered();
        if ((flags & FLAG_VOTED) != 0) revert AlreadyVoted();
        if (candidateId == 0 || candidateId > candidateCount) revert InvalidCandidate();

        unchecked {
            idToCandidate[candidateId].voteCount += 1;
        }
        unchecked {
            voterFlags[msg.sender] = flags | FLAG_VOTED;
        }

        emit Voted(msg.sender, candidateId);
    }

    /// @notice Get candiate details by id.
    /// @param candidateId The candidate id (1-based).
    /// @return id The candidate id.
    /// @return name The candidate name.
    /// @return voteCount The candidate vote coutn.
    function getCandidate(uint256 candidateId)
        external
        view
        returns (uint256 id, string memory name, uint256 voteCount)
    {
        if (candidateId == 0 || candidateId > candidateCount) revert InvalidCandidate();
        StoredCandidate storage s = idToCandidate[candidateId];
        return (candidateId, s.name, s.voteCount);
    }

    /// @notice Get all canddiates.
    /// @return candidates Array of all candidates.
    function getAllCandidates() external view returns (Candidate[] memory candidates) {
        candidates = new Candidate[](candidateCount);
        for (uint256 i = 1; i <= candidateCount; ) {
            StoredCandidate storage s = idToCandidate[i];
            candidates[i - 1] = Candidate({id: i, name: s.name, voteCount: s.voteCount});
            unchecked { i++; }
        }
    }

    /// @notice Get the current wining candidate (higest votes). If tie, returns the first with max votes.
    /// @return id The candidate id.
    /// @return name The candidate name.
    /// @return voteCount The candidate vote count.
    function getWinningCandidate()
        external
        view
        returns (uint256 id, string memory name, uint256 voteCount)
    {
        if (candidateCount == 0) revert NoCandidates();

        uint256 winningId = 1;
        uint256 highestVotes = idToCandidate[1].voteCount;

        for (uint256 i = 2; i <= candidateCount; ) {
            uint256 votes = idToCandidate[i].voteCount;
            if (votes > highestVotes) {
                highestVotes = votes;
                winningId = i;
            }
            unchecked { i++; }
        }

        StoredCandidate storage s = idToCandidate[winningId];
        return (winningId, s.name, s.voteCount);
    }

    /// @notice Returns whether an adress is registered.
    function isRegistered(address account) external view returns (bool) {
        return (voterFlags[account] & FLAG_REGISTERED) != 0;
    }

    /// @notice Returns whether an adress has voted.
    function hasVoted(address account) external view returns (bool) {
        return (voterFlags[account] & FLAG_VOTED) != 0;
    }
}


