/**
 * Telika SDK Type Definitions
 *
 * Core types for the proof generation and blockchain interaction modules.
 * These types define the data structures for verification events, proof records,
 * and configuration used throughout the SDK.
 */

// =========================================================================
// Event Types (mirrors the Solidity enum)
// =========================================================================

/**
 * Types of verification events that can be anchored on-chain.
 * Values correspond to the Solidity enum in TelikaVerification.sol.
 */
export enum EventType {
  IdentityVerification = 0,
  FundingDisbursement = 1,
  MilestoneConfirmation = 2,
  ScoreUpdate = 3,
}

/** Human-readable labels for event types */
export const EventTypeLabels: Record<EventType, string> = {
  [EventType.IdentityVerification]: "Identity Verification",
  [EventType.FundingDisbursement]: "Funding Disbursement",
  [EventType.MilestoneConfirmation]: "Milestone Confirmation",
  [EventType.ScoreUpdate]: "Score Update",
};

// =========================================================================
// Verification Event Data (input to proof generation)
// =========================================================================

/** Base fields shared by all verification events */
export interface BaseEvent {
  /** Unique Telika identifier for the founder/venture */
  telikaId: string;
  /** ISO-8601 timestamp of the event */
  timestamp: string;
  /** Additional context about the event */
  notes?: string;
}

/** Identity verification event data */
export interface IdentityEvent extends BaseEvent {
  type: EventType.IdentityVerification;
  /** Name of the identity document used (e.g., "National ID", "Passport") */
  documentType: string;
  /** Country of issuance */
  issuingCountry: string;
  /** Whether the identity was confirmed as valid */
  verified: boolean;
  /** Name of the verifying authority or agent */
  verifiedBy: string;
}

/** Funding disbursement event data */
export interface FundingEvent extends BaseEvent {
  type: EventType.FundingDisbursement;
  /** Amount disbursed (in USD or local currency) */
  amount: number;
  /** Currency code (e.g., "USD", "KES", "NGN") */
  currency: string;
  /** Unique identifier for the funder */
  funderId: string;
  /** Name of the funder organization */
  funderName: string;
  /** Purpose or category of the funding */
  fundingPurpose: string;
}

/** Milestone confirmation event data */
export interface MilestoneEvent extends BaseEvent {
  type: EventType.MilestoneConfirmation;
  /** Name or title of the milestone */
  milestoneName: string;
  /** Description of what was achieved */
  description: string;
  /** Supporting evidence type (e.g., "revenue report", "user growth metrics") */
  evidenceType: string;
  /** Whether the milestone was confirmed as completed */
  confirmed: boolean;
  /** Name of the confirming authority */
  confirmedBy: string;
}

/** Score update event data */
export interface ScoreUpdateEvent extends BaseEvent {
  type: EventType.ScoreUpdate;
  /** Previous score value (0-100) */
  previousScore: number;
  /** New score value (0-100) */
  newScore: number;
  /** Reason for the score change */
  reason: string;
  /** Categories that changed (e.g., "team", "traction", "market") */
  categoriesChanged: string[];
}

/** Union type of all verification events */
export type VerificationEvent =
  | IdentityEvent
  | FundingEvent
  | MilestoneEvent
  | ScoreUpdateEvent;

// =========================================================================
// On-Chain Proof Records (output from blockchain queries)
// =========================================================================

/** Proof record as stored on-chain */
export interface ProofRecord {
  /** Keccak256 hash of the verification event data */
  proofHash: string;
  /** Type of the verification event */
  eventType: EventType;
  /** Unique Telika identifier */
  telikaId: string;
  /** Block timestamp when the proof was anchored */
  timestamp: number;
  /** Additional non-sensitive metadata (JSON string) */
  metadata: string;
  /** Address that anchored this proof */
  anchoredBy: string;
}

/** Result of a proof verification query */
export interface VerificationResult {
  /** Whether the proof exists on-chain */
  exists: boolean;
  /** The proof record (undefined if not found) */
  record?: ProofRecord;
}

// =========================================================================
// SDK Configuration
// =========================================================================

/** Configuration for the TelikaBlockchainClient */
export interface TelikaClientConfig {
  /** RPC URL for the Polygon network */
  rpcUrl: string;
  /** Address of the deployed TelikaVerification contract */
  contractAddress: string;
  /** Private key for signing transactions (required for write operations) */
  privateKey?: string;
  /** Chain ID (defaults to 80002 for Polygon Amoy) */
  chainId?: number;
}

/** Metadata attached to an anchored proof */
export interface ProofMetadata {
  /** Human-readable description of the event */
  eventDescription: string;
  /** Who or what system generated this proof */
  generatedBy: string;
  /** Version of the proof generation algorithm */
  proofVersion: string;
  /** Any additional key-value pairs */
  [key: string]: string;
}
