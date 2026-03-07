/**
 * Telika Proof Generator
 *
 * Generates cryptographic proof hashes (keccak256) from verification event data.
 * The proof generator ensures that:
 * 1. Sensitive fields are STRIPPED before hashing (e.g., bank details, personal documents)
 * 2. Proof hashes are deterministic (same input always produces the same hash)
 * 3. Only non-sensitive, non-identifying data is included in the proof
 */

import { keccak256, toUtf8Bytes, AbiCoder } from "ethers";
import {
  VerificationEvent,
  IdentityEvent,
  FundingEvent,
  MilestoneEvent,
  ScoreUpdateEvent,
  EventType,
  ProofMetadata,
} from "./types";

// =========================================================================
// Core Proof Generation
// =========================================================================

/**
 * Generate a keccak256 proof hash from any verification event.
 * Automatically routes to the appropriate event-specific generator
 * and strips sensitive data before hashing.
 *
 * @param event - The verification event data
 * @returns The keccak256 hash of the sanitized event data (0x-prefixed)
 */
export function generateProofHash(event: VerificationEvent): string {
  const sanitizedData = sanitizeEventData(event);
  const encoded = canonicalEncode(sanitizedData);
  return keccak256(toUtf8Bytes(encoded));
}

/**
 * Create a proof hash specifically for an identity verification event.
 *
 * Included in proof: telikaId, timestamp, documentType, issuingCountry, verified, verifiedBy
 * Excluded (sensitive): actual document numbers, personal details, photos
 *
 * @param event - Identity verification event data
 * @returns The keccak256 proof hash
 */
export function createIdentityProof(event: IdentityEvent): string {
  return generateProofHash(event);
}

/**
 * Create a proof hash specifically for a funding disbursement event.
 *
 * Included in proof: telikaId, timestamp, amount, currency, funderId, funderName, fundingPurpose
 * Excluded (sensitive): bank account numbers, routing numbers, transaction IDs
 *
 * @param event - Funding disbursement event data
 * @returns The keccak256 proof hash
 */
export function createFundingProof(event: FundingEvent): string {
  return generateProofHash(event);
}

/**
 * Create a proof hash specifically for a milestone confirmation event.
 *
 * Included in proof: telikaId, timestamp, milestoneName, description, evidenceType, confirmed, confirmedBy
 * Excluded (sensitive): detailed financial reports, user data
 *
 * @param event - Milestone confirmation event data
 * @returns The keccak256 proof hash
 */
export function createMilestoneProof(event: MilestoneEvent): string {
  return generateProofHash(event);
}

/**
 * Create a proof hash specifically for a score update event.
 *
 * Included in proof: telikaId, timestamp, previousScore, newScore, reason, categoriesChanged
 * Excluded (sensitive): detailed scoring breakdown, proprietary AI model outputs
 *
 * @param event - Score update event data
 * @returns The keccak256 proof hash
 */
export function createScoreProof(event: ScoreUpdateEvent): string {
  return generateProofHash(event);
}

// =========================================================================
// Metadata Generation
// =========================================================================

/**
 * Generate non-sensitive metadata JSON for an event.
 * This metadata is stored on-chain alongside the proof hash.
 *
 * @param event - The verification event
 * @param generatedBy - Who/what generated this proof
 * @returns ProofMetadata object
 */
export function generateMetadata(
  event: VerificationEvent,
  generatedBy: string = "Telika Platform"
): ProofMetadata {
  const descriptions: Record<EventType, string> = {
    [EventType.IdentityVerification]: `Identity verification for ${event.telikaId}`,
    [EventType.FundingDisbursement]: `Funding disbursement for ${event.telikaId}`,
    [EventType.MilestoneConfirmation]: `Milestone confirmation for ${event.telikaId}`,
    [EventType.ScoreUpdate]: `Score update for ${event.telikaId}`,
  };

  return {
    eventDescription: descriptions[event.type],
    generatedBy,
    proofVersion: "1.0.0",
  };
}

// =========================================================================
// Internal Helpers
// =========================================================================

/**
 * Sanitize event data by removing sensitive fields.
 * Returns a clean object with only the fields that should be included in the proof hash.
 */
function sanitizeEventData(event: VerificationEvent): Record<string, unknown> {
  // Base fields always included
  const base = {
    telikaId: event.telikaId,
    timestamp: event.timestamp,
    type: event.type,
  };

  switch (event.type) {
    case EventType.IdentityVerification:
      return {
        ...base,
        documentType: event.documentType,
        issuingCountry: event.issuingCountry,
        verified: event.verified,
        verifiedBy: event.verifiedBy,
      };

    case EventType.FundingDisbursement:
      return {
        ...base,
        amount: event.amount,
        currency: event.currency,
        funderId: event.funderId,
        funderName: event.funderName,
        fundingPurpose: event.fundingPurpose,
      };

    case EventType.MilestoneConfirmation:
      return {
        ...base,
        milestoneName: event.milestoneName,
        description: event.description,
        evidenceType: event.evidenceType,
        confirmed: event.confirmed,
        confirmedBy: event.confirmedBy,
      };

    case EventType.ScoreUpdate:
      return {
        ...base,
        previousScore: event.previousScore,
        newScore: event.newScore,
        reason: event.reason,
        categoriesChanged: event.categoriesChanged,
      };

    default:
      return base;
  }
}

/**
 * Canonically encode an object to a deterministic string.
 * Keys are sorted alphabetically to ensure the same data always produces the same encoding.
 */
function canonicalEncode(data: Record<string, unknown>): string {
  const sortedKeys = Object.keys(data).sort();
  const entries = sortedKeys.map((key) => {
    const value = data[key];
    if (Array.isArray(value)) {
      return `${key}:${JSON.stringify(value.sort())}`;
    }
    return `${key}:${JSON.stringify(value)}`;
  });
  return entries.join("|");
}

/**
 * Generate a proof hash from raw ABI-encoded data.
 * Useful for verifying proofs against the smart contract directly.
 *
 * @param types - Solidity ABI types
 * @param values - Values corresponding to the types
 * @returns keccak256 hash of ABI-encoded data
 */
export function generateAbiEncodedHash(types: string[], values: unknown[]): string {
  const abiCoder = AbiCoder.defaultAbiCoder();
  const encoded = abiCoder.encode(types, values);
  return keccak256(encoded);
}
