/**
 * Telika SDK
 *
 * Public API for the Telika verification system.
 * Provides proof generation and blockchain interaction capabilities.
 *
 * @example
 * ```typescript
 * import {
 *   generateProofHash,
 *   createIdentityProof,
 *   TelikaBlockchainClient,
 *   EventType,
 * } from "@telika/sdk";
 *
 * // Generate a proof hash
 * const proofHash = createIdentityProof({
 *   type: EventType.IdentityVerification,
 *   telikaId: "TLK-001",
 *   timestamp: new Date().toISOString(),
 *   documentType: "National ID",
 *   issuingCountry: "KE",
 *   verified: true,
 *   verifiedBy: "Telika Platform",
 * });
 *
 * // Anchor it on-chain
 * const client = new TelikaBlockchainClient({
 *   rpcUrl: "https://polygon-amoy.g.alchemy.com/v2/KEY",
 *   contractAddress: "0x...",
 *   privateKey: "0x...",
 * });
 *
 * await client.anchorProofAndWait(
 *   proofHash,
 *   EventType.IdentityVerification,
 *   "TLK-001",
 *   { eventDescription: "Identity verified", generatedBy: "Telika", proofVersion: "1.0.0" }
 * );
 * ```
 */

// Types
export {
  EventType,
  EventTypeLabels,
  type BaseEvent,
  type IdentityEvent,
  type FundingEvent,
  type MilestoneEvent,
  type ScoreUpdateEvent,
  type VerificationEvent,
  type ProofRecord,
  type VerificationResult,
  type TelikaClientConfig,
  type ProofMetadata,
} from "./types";

// Proof Generation
export {
  generateProofHash,
  createIdentityProof,
  createFundingProof,
  createMilestoneProof,
  createScoreProof,
  generateMetadata,
  generateAbiEncodedHash,
} from "./proof-generator";

// Blockchain Client
export { TelikaBlockchainClient } from "./blockchain-client";

// Contract ABI
export { TELIKA_VERIFICATION_ABI } from "./abi";
