import { describe, it, expect } from "vitest";
import {
  generateProofHash,
  createIdentityProof,
  createFundingProof,
  createMilestoneProof,
  createScoreProof,
  generateMetadata,
  generateAbiEncodedHash,
} from "../src/proof-generator";
import {
  EventType,
  IdentityEvent,
  FundingEvent,
  MilestoneEvent,
  ScoreUpdateEvent,
} from "../src/types";

// =========================================================================
// Test Fixtures
// =========================================================================

const identityEvent: IdentityEvent = {
  type: EventType.IdentityVerification,
  telikaId: "TLK-001-ABCDE",
  timestamp: "2026-03-01T12:00:00Z",
  documentType: "National ID",
  issuingCountry: "KE",
  verified: true,
  verifiedBy: "Telika Platform",
};

const fundingEvent: FundingEvent = {
  type: EventType.FundingDisbursement,
  telikaId: "TLK-001-ABCDE",
  timestamp: "2026-03-05T10:00:00Z",
  amount: 50000,
  currency: "USD",
  funderId: "FND-001",
  funderName: "Africa Innovation Fund",
  fundingPurpose: "Series A",
};

const milestoneEvent: MilestoneEvent = {
  type: EventType.MilestoneConfirmation,
  telikaId: "TLK-002-FGHIJ",
  timestamp: "2026-03-10T15:00:00Z",
  milestoneName: "1000 Active Users",
  description: "Platform reached 1000 monthly active users",
  evidenceType: "analytics report",
  confirmed: true,
  confirmedBy: "Accelerator Program",
};

const scoreEvent: ScoreUpdateEvent = {
  type: EventType.ScoreUpdate,
  telikaId: "TLK-001-ABCDE",
  timestamp: "2026-03-15T08:00:00Z",
  previousScore: 72,
  newScore: 85,
  reason: "Improved traction metrics and team expansion",
  categoriesChanged: ["traction", "team"],
};

// =========================================================================
// Tests
// =========================================================================

describe("Proof Generator", () => {
  describe("generateProofHash", () => {
    it("should generate a valid keccak256 hash (0x-prefixed, 66 chars)", () => {
      const hash = generateProofHash(identityEvent);
      expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it("should be deterministic — same input always produces the same hash", () => {
      const hash1 = generateProofHash(identityEvent);
      const hash2 = generateProofHash(identityEvent);
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different events", () => {
      const hash1 = generateProofHash(identityEvent);
      const hash2 = generateProofHash(fundingEvent);
      expect(hash1).not.toBe(hash2);
    });

    it("should produce different hashes when any field changes", () => {
      const modified = { ...identityEvent, verified: false };
      const hash1 = generateProofHash(identityEvent);
      const hash2 = generateProofHash(modified);
      expect(hash1).not.toBe(hash2);
    });

    it("should not include optional 'notes' field in hash (notes are not part of proof)", () => {
      const withNotes = { ...identityEvent, notes: "Internal note: VIP founder" };
      const hash1 = generateProofHash(identityEvent);
      const hash2 = generateProofHash(withNotes);
      // The notes field is stripped during sanitization, so hashes should be equal
      expect(hash1).toBe(hash2);
    });
  });

  describe("createIdentityProof", () => {
    it("should return a valid proof hash", () => {
      const hash = createIdentityProof(identityEvent);
      expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it("should match the output of generateProofHash for the same event", () => {
      const hash1 = createIdentityProof(identityEvent);
      const hash2 = generateProofHash(identityEvent);
      expect(hash1).toBe(hash2);
    });
  });

  describe("createFundingProof", () => {
    it("should return a valid proof hash", () => {
      const hash = createFundingProof(fundingEvent);
      expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it("should produce different hash when amount changes", () => {
      const modified = { ...fundingEvent, amount: 100000 };
      const hash1 = createFundingProof(fundingEvent);
      const hash2 = createFundingProof(modified);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("createMilestoneProof", () => {
    it("should return a valid proof hash", () => {
      const hash = createMilestoneProof(milestoneEvent);
      expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });
  });

  describe("createScoreProof", () => {
    it("should return a valid proof hash", () => {
      const hash = createScoreProof(scoreEvent);
      expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it("should handle category arrays deterministically (sorted)", () => {
      const event1 = { ...scoreEvent, categoriesChanged: ["team", "traction"] };
      const event2 = { ...scoreEvent, categoriesChanged: ["traction", "team"] };
      const hash1 = createScoreProof(event1);
      const hash2 = createScoreProof(event2);
      // Arrays are sorted during canonical encoding, so order shouldn't matter
      expect(hash1).toBe(hash2);
    });
  });

  describe("generateMetadata", () => {
    it("should generate metadata with correct event description", () => {
      const metadata = generateMetadata(identityEvent);
      expect(metadata.eventDescription).toContain("Identity verification");
      expect(metadata.eventDescription).toContain("TLK-001-ABCDE");
    });

    it("should include proof version", () => {
      const metadata = generateMetadata(fundingEvent);
      expect(metadata.proofVersion).toBe("1.0.0");
    });

    it("should use custom generatedBy value", () => {
      const metadata = generateMetadata(milestoneEvent, "Partner System");
      expect(metadata.generatedBy).toBe("Partner System");
    });

    it("should default generatedBy to 'Telika Platform'", () => {
      const metadata = generateMetadata(scoreEvent);
      expect(metadata.generatedBy).toBe("Telika Platform");
    });
  });

  describe("generateAbiEncodedHash", () => {
    it("should generate a valid hash from ABI-encoded data", () => {
      const hash = generateAbiEncodedHash(
        ["string", "uint256"],
        ["TLK-001", 50000]
      );
      expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it("should be deterministic", () => {
      const hash1 = generateAbiEncodedHash(["string"], ["hello"]);
      const hash2 = generateAbiEncodedHash(["string"], ["hello"]);
      expect(hash1).toBe(hash2);
    });
  });
});
