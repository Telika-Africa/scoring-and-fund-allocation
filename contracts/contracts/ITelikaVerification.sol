// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ITelikaVerification
 * @notice Interface for the Telika Verification contract
 * @dev Defines the public API for anchoring and verifying cryptographic proofs
 *      of verification events on the Polygon blockchain.
 */
interface ITelikaVerification {
    /// @notice Types of verification events that can be anchored
    enum EventType {
        IdentityVerification,   // Founder identity has been verified
        FundingDisbursement,    // Funding has been disbursed to a venture
        MilestoneConfirmation,  // A venture milestone has been confirmed
        ScoreUpdate             // Founder/venture score has been updated
    }

    /// @notice Structure representing an on-chain proof record
    struct ProofRecord {
        bytes32 proofHash;      // Keccak256 hash of the verification event data
        EventType eventType;    // Type of the verification event
        string telikaId;        // Unique Telika identifier for the founder/venture
        uint256 timestamp;      // Block timestamp when the proof was anchored
        string metadata;        // Additional non-sensitive metadata (JSON string)
        address anchoredBy;     // Address that anchored this proof
    }

    /// @notice Emitted when a new proof is anchored on-chain
    event ProofAnchored(
        bytes32 indexed proofHash,
        EventType indexed eventType,
        string telikaId,
        uint256 timestamp,
        address anchoredBy
    );

    /**
     * @notice Anchor a cryptographic proof on-chain
     * @param proofHash The keccak256 hash of the verification event data
     * @param eventType The type of verification event
     * @param telikaId The unique Telika identifier
     * @param metadata Additional non-sensitive metadata as a JSON string
     */
    function anchorProof(
        bytes32 proofHash,
        EventType eventType,
        string calldata telikaId,
        string calldata metadata
    ) external;

    /**
     * @notice Verify whether a proof exists on-chain
     * @param proofHash The proof hash to verify
     * @return exists Whether the proof exists
     * @return record The full proof record (empty if not found)
     */
    function verifyProof(bytes32 proofHash)
        external
        view
        returns (bool exists, ProofRecord memory record);

    /**
     * @notice Get all proof hashes associated with a Telika ID
     * @param telikaId The unique Telika identifier
     * @return proofHashes Array of proof hashes for the given Telika ID
     */
    function getProofsByTelikaId(string calldata telikaId)
        external
        view
        returns (bytes32[] memory proofHashes);

    /**
     * @notice Get the count of proofs for a Telika ID
     * @param telikaId The unique Telika identifier
     * @return count The number of proofs anchored for this ID
     */
    function getProofCount(string calldata telikaId)
        external
        view
        returns (uint256 count);
}
