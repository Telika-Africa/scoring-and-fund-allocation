/**
 * TelikaVerification Contract ABI
 *
 * Minimal ABI containing only the functions and events needed by the SDK.
 * This avoids requiring the full contract artifacts as a dependency.
 */

export const TELIKA_VERIFICATION_ABI = [
  // =========================================================================
  // Write Functions
  // =========================================================================
  {
    name: "anchorProof",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proofHash", type: "bytes32" },
      { name: "eventType", type: "uint8" },
      { name: "telikaId", type: "string" },
      { name: "metadata", type: "string" },
    ],
    outputs: [],
  },

  // =========================================================================
  // Read Functions
  // =========================================================================
  {
    name: "verifyProof",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "proofHash", type: "bytes32" }],
    outputs: [
      { name: "exists", type: "bool" },
      {
        name: "record",
        type: "tuple",
        components: [
          { name: "proofHash", type: "bytes32" },
          { name: "eventType", type: "uint8" },
          { name: "telikaId", type: "string" },
          { name: "timestamp", type: "uint256" },
          { name: "metadata", type: "string" },
          { name: "anchoredBy", type: "address" },
        ],
      },
    ],
  },
  {
    name: "getProofsByTelikaId",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "telikaId", type: "string" }],
    outputs: [{ name: "proofHashes", type: "bytes32[]" }],
  },
  {
    name: "getProofCount",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "telikaId", type: "string" }],
    outputs: [{ name: "count", type: "uint256" }],
  },
  {
    name: "getProof",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "proofHash", type: "bytes32" }],
    outputs: [
      {
        name: "record",
        type: "tuple",
        components: [
          { name: "proofHash", type: "bytes32" },
          { name: "eventType", type: "uint8" },
          { name: "telikaId", type: "string" },
          { name: "timestamp", type: "uint256" },
          { name: "metadata", type: "string" },
          { name: "anchoredBy", type: "address" },
        ],
      },
    ],
  },
  {
    name: "getProofsByTelikaIdPaginated",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "telikaId", type: "string" },
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [{ name: "proofHashes", type: "bytes32[]" }],
  },
  {
    name: "totalProofs",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },

  // =========================================================================
  // Access Control
  // =========================================================================
  {
    name: "ANCHOR_ROLE",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    name: "hasRole",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "grantRole",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "revokeRole",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [],
  },

  // =========================================================================
  // Events
  // =========================================================================
  {
    name: "ProofAnchored",
    type: "event",
    inputs: [
      { name: "proofHash", type: "bytes32", indexed: true },
      { name: "eventType", type: "uint8", indexed: true },
      { name: "telikaId", type: "string", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
      { name: "anchoredBy", type: "address", indexed: false },
    ],
  },
] as const;
