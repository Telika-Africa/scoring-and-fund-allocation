// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./ITelikaVerification.sol";

/**
 * @title TelikaVerification
 * @author Telika Africa
 * @notice Anchors cryptographic proofs of verification events on the Polygon blockchain
 * @dev This contract stores tamper-proof audit trails of key verification events
 *      (founder identity, funding disbursements, milestone confirmations) while
 *      keeping sensitive data off-chain. Only authorized addresses with the
 *      ANCHOR_ROLE can write proofs to the chain.
 *
 *      Architecture:
 *      - Sensitive founder/venture data stays in the Telika platform (off-chain)
 *      - Only keccak256 hashes of non-sensitive event data are stored on-chain
 *      - External stakeholders can independently verify proofs via this contract
 */
contract TelikaVerification is ITelikaVerification, AccessControl {
    // =========================================================================
    // State
    // =========================================================================

    /// @notice Role identifier for addresses authorized to anchor proofs
    bytes32 public constant ANCHOR_ROLE = keccak256("ANCHOR_ROLE");

    /// @notice Mapping from proof hash to its on-chain record
    mapping(bytes32 => ProofRecord) private _proofs;

    /// @notice Mapping from Telika ID to array of associated proof hashes
    mapping(string => bytes32[]) private _telikaIdToProofs;

    /// @notice Tracks whether a proof hash has been anchored (for existence checks)
    mapping(bytes32 => bool) private _proofExists;

    /// @notice Total number of proofs anchored across all Telika IDs
    uint256 public totalProofs;

    // =========================================================================
    // Errors
    // =========================================================================

    /// @notice Thrown when attempting to anchor a proof that already exists
    error ProofAlreadyAnchored(bytes32 proofHash);

    /// @notice Thrown when a proof hash is the zero hash
    error InvalidProofHash();

    /// @notice Thrown when a Telika ID is empty
    error InvalidTelikaId();

    // =========================================================================
    // Constructor
    // =========================================================================

    /**
     * @notice Initializes the contract and grants admin + anchor roles to deployer
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ANCHOR_ROLE, msg.sender);
    }

    // =========================================================================
    // Write Functions
    // =========================================================================

    /**
     * @notice Anchor a cryptographic proof of a verification event on-chain
     * @dev Only callable by addresses with ANCHOR_ROLE. Each proof hash can only
     *      be anchored once to prevent duplicates.
     * @param proofHash The keccak256 hash of the verification event data
     * @param eventType The type of verification event
     * @param telikaId The unique Telika identifier for the founder/venture
     * @param metadata Additional non-sensitive metadata (JSON string)
     */
    function anchorProof(
        bytes32 proofHash,
        EventType eventType,
        string calldata telikaId,
        string calldata metadata
    ) external onlyRole(ANCHOR_ROLE) {
        // Validate inputs
        if (proofHash == bytes32(0)) revert InvalidProofHash();
        if (bytes(telikaId).length == 0) revert InvalidTelikaId();
        if (_proofExists[proofHash]) revert ProofAlreadyAnchored(proofHash);

        // Store the proof record
        _proofs[proofHash] = ProofRecord({
            proofHash: proofHash,
            eventType: eventType,
            telikaId: telikaId,
            timestamp: block.timestamp,
            metadata: metadata,
            anchoredBy: msg.sender
        });

        // Index by Telika ID for lookup
        _telikaIdToProofs[telikaId].push(proofHash);

        // Mark as existing
        _proofExists[proofHash] = true;

        // Increment counter
        unchecked {
            totalProofs++;
        }

        // Emit event for off-chain indexing
        emit ProofAnchored(
            proofHash,
            eventType,
            telikaId,
            block.timestamp,
            msg.sender
        );
    }

    // =========================================================================
    // Read Functions
    // =========================================================================

    /**
     * @notice Verify whether a proof exists on-chain and retrieve its record
     * @param proofHash The proof hash to verify
     * @return exists Whether the proof exists on-chain
     * @return record The full proof record (zeroed out if not found)
     */
    function verifyProof(bytes32 proofHash)
        external
        view
        returns (bool exists, ProofRecord memory record)
    {
        exists = _proofExists[proofHash];
        if (exists) {
            record = _proofs[proofHash];
        }
    }

    /**
     * @notice Get all proof hashes associated with a Telika ID
     * @param telikaId The unique Telika identifier
     * @return proofHashes Array of proof hashes for the given Telika ID
     */
    function getProofsByTelikaId(string calldata telikaId)
        external
        view
        returns (bytes32[] memory proofHashes)
    {
        return _telikaIdToProofs[telikaId];
    }

    /**
     * @notice Get the count of proofs anchored for a specific Telika ID
     * @param telikaId The unique Telika identifier
     * @return count The number of proofs for this ID
     */
    function getProofCount(string calldata telikaId)
        external
        view
        returns (uint256 count)
    {
        return _telikaIdToProofs[telikaId].length;
    }

    /**
     * @notice Get a specific proof record by its hash
     * @param proofHash The proof hash to look up
     * @return record The proof record
     */
    function getProof(bytes32 proofHash)
        external
        view
        returns (ProofRecord memory record)
    {
        require(_proofExists[proofHash], "Proof does not exist");
        return _proofs[proofHash];
    }

    /**
     * @notice Get a paginated list of proof hashes for a Telika ID
     * @param telikaId The unique Telika identifier
     * @param offset Starting index
     * @param limit Maximum number of proofs to return
     * @return proofHashes Array of proof hashes
     */
    function getProofsByTelikaIdPaginated(
        string calldata telikaId,
        uint256 offset,
        uint256 limit
    ) external view returns (bytes32[] memory proofHashes) {
        bytes32[] storage allProofs = _telikaIdToProofs[telikaId];
        uint256 totalCount = allProofs.length;

        if (offset >= totalCount) {
            return new bytes32[](0);
        }

        uint256 end = offset + limit;
        if (end > totalCount) {
            end = totalCount;
        }

        uint256 resultLength = end - offset;
        proofHashes = new bytes32[](resultLength);

        for (uint256 i = 0; i < resultLength;) {
            proofHashes[i] = allProofs[offset + i];
            unchecked { i++; }
        }
    }
}
