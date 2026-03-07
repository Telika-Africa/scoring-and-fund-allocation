import { expect } from "chai";
import { ethers } from "hardhat";
import { TelikaVerification } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("TelikaVerification", () => {
  let contract: TelikaVerification;
  let owner: HardhatEthersSigner;
  let authorizedAnchor: HardhatEthersSigner;
  let unauthorized: HardhatEthersSigner;
  let viewer: HardhatEthersSigner;

  // Test constants
  const TELIKA_ID = "TLK-001-ABCDE";
  const TELIKA_ID_2 = "TLK-002-FGHIJ";
  const SAMPLE_METADATA = JSON.stringify({
    eventDescription: "Initial identity verification",
    verifiedBy: "Telika Platform",
  });

  // Event type enum values
  const EventType = {
    IdentityVerification: 0,
    FundingDisbursement: 1,
    MilestoneConfirmation: 2,
    ScoreUpdate: 3,
  };

  /**
   * Helper to generate a deterministic proof hash from event data
   */
  function generateProofHash(data: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(data));
  }

  beforeEach(async () => {
    [owner, authorizedAnchor, unauthorized, viewer] = await ethers.getSigners();

    const TelikaVerificationFactory = await ethers.getContractFactory("TelikaVerification");
    contract = await TelikaVerificationFactory.deploy();
    await contract.waitForDeployment();

    // Grant ANCHOR_ROLE to authorizedAnchor
    const ANCHOR_ROLE = await contract.ANCHOR_ROLE();
    await contract.grantRole(ANCHOR_ROLE, authorizedAnchor.address);
  });

  // =========================================================================
  // Deployment & Role Setup
  // =========================================================================

  describe("Deployment", () => {
    it("should deploy with correct initial state", async () => {
      expect(await contract.totalProofs()).to.equal(0);
    });

    it("should grant DEFAULT_ADMIN_ROLE to deployer", async () => {
      const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
      expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("should grant ANCHOR_ROLE to deployer", async () => {
      const ANCHOR_ROLE = await contract.ANCHOR_ROLE();
      expect(await contract.hasRole(ANCHOR_ROLE, owner.address)).to.be.true;
    });

    it("should allow admin to grant ANCHOR_ROLE to other addresses", async () => {
      const ANCHOR_ROLE = await contract.ANCHOR_ROLE();
      expect(await contract.hasRole(ANCHOR_ROLE, authorizedAnchor.address)).to.be.true;
    });
  });

  // =========================================================================
  // Proof Anchoring
  // =========================================================================

  describe("anchorProof", () => {
    it("should anchor a proof successfully", async () => {
      const proofHash = generateProofHash("identity-verification-data-001");

      await expect(
        contract.anchorProof(
          proofHash,
          EventType.IdentityVerification,
          TELIKA_ID,
          SAMPLE_METADATA
        )
      ).to.not.be.reverted;

      expect(await contract.totalProofs()).to.equal(1);
    });

    it("should store the correct proof record", async () => {
      const proofHash = generateProofHash("funding-event-data-001");

      await contract.anchorProof(
        proofHash,
        EventType.FundingDisbursement,
        TELIKA_ID,
        SAMPLE_METADATA
      );

      const [exists, record] = await contract.verifyProof(proofHash);
      expect(exists).to.be.true;
      expect(record.proofHash).to.equal(proofHash);
      expect(record.eventType).to.equal(EventType.FundingDisbursement);
      expect(record.telikaId).to.equal(TELIKA_ID);
      expect(record.metadata).to.equal(SAMPLE_METADATA);
      expect(record.anchoredBy).to.equal(owner.address);
    });

    it("should emit ProofAnchored event with correct data", async () => {
      const proofHash = generateProofHash("milestone-data-001");

      await expect(
        contract.anchorProof(
          proofHash,
          EventType.MilestoneConfirmation,
          TELIKA_ID,
          SAMPLE_METADATA
        )
      )
        .to.emit(contract, "ProofAnchored")
        .withArgs(
          proofHash,
          EventType.MilestoneConfirmation,
          TELIKA_ID,
          (timestamp: bigint) => timestamp > 0n, // any positive timestamp
          owner.address
        );
    });

    it("should allow authorized anchor to submit proofs", async () => {
      const proofHash = generateProofHash("authorized-anchor-proof");

      await expect(
        contract.connect(authorizedAnchor).anchorProof(
          proofHash,
          EventType.ScoreUpdate,
          TELIKA_ID,
          SAMPLE_METADATA
        )
      ).to.not.be.reverted;

      const [exists, record] = await contract.verifyProof(proofHash);
      expect(exists).to.be.true;
      expect(record.anchoredBy).to.equal(authorizedAnchor.address);
    });

    it("should reject proof from unauthorized address", async () => {
      const proofHash = generateProofHash("unauthorized-proof");

      await expect(
        contract.connect(unauthorized).anchorProof(
          proofHash,
          EventType.IdentityVerification,
          TELIKA_ID,
          SAMPLE_METADATA
        )
      ).to.be.reverted;
    });

    it("should reject duplicate proof hash", async () => {
      const proofHash = generateProofHash("duplicate-proof");

      await contract.anchorProof(
        proofHash,
        EventType.IdentityVerification,
        TELIKA_ID,
        SAMPLE_METADATA
      );

      await expect(
        contract.anchorProof(
          proofHash,
          EventType.IdentityVerification,
          TELIKA_ID,
          SAMPLE_METADATA
        )
      ).to.be.revertedWithCustomError(contract, "ProofAlreadyAnchored");
    });

    it("should reject zero proof hash", async () => {
      await expect(
        contract.anchorProof(
          ethers.ZeroHash,
          EventType.IdentityVerification,
          TELIKA_ID,
          SAMPLE_METADATA
        )
      ).to.be.revertedWithCustomError(contract, "InvalidProofHash");
    });

    it("should reject empty Telika ID", async () => {
      const proofHash = generateProofHash("empty-telika-id");

      await expect(
        contract.anchorProof(
          proofHash,
          EventType.IdentityVerification,
          "",
          SAMPLE_METADATA
        )
      ).to.be.revertedWithCustomError(contract, "InvalidTelikaId");
    });

    it("should anchor multiple proofs for the same Telika ID", async () => {
      const proofHash1 = generateProofHash("multi-proof-1");
      const proofHash2 = generateProofHash("multi-proof-2");
      const proofHash3 = generateProofHash("multi-proof-3");

      await contract.anchorProof(proofHash1, EventType.IdentityVerification, TELIKA_ID, "{}");
      await contract.anchorProof(proofHash2, EventType.FundingDisbursement, TELIKA_ID, "{}");
      await contract.anchorProof(proofHash3, EventType.MilestoneConfirmation, TELIKA_ID, "{}");

      expect(await contract.totalProofs()).to.equal(3);
      expect(await contract.getProofCount(TELIKA_ID)).to.equal(3);
    });
  });

  // =========================================================================
  // Proof Verification
  // =========================================================================

  describe("verifyProof", () => {
    it("should return true and record for existing proof", async () => {
      const proofHash = generateProofHash("verify-existing");

      await contract.anchorProof(
        proofHash,
        EventType.IdentityVerification,
        TELIKA_ID,
        SAMPLE_METADATA
      );

      const [exists, record] = await contract.verifyProof(proofHash);
      expect(exists).to.be.true;
      expect(record.proofHash).to.equal(proofHash);
    });

    it("should return false for non-existing proof", async () => {
      const proofHash = generateProofHash("non-existing");

      const [exists] = await contract.verifyProof(proofHash);
      expect(exists).to.be.false;
    });

    it("should be callable by any address (no access control)", async () => {
      const proofHash = generateProofHash("public-verify");

      await contract.anchorProof(
        proofHash,
        EventType.FundingDisbursement,
        TELIKA_ID,
        SAMPLE_METADATA
      );

      // Even unauthorized addresses should be able to verify
      const [exists] = await contract.connect(viewer).verifyProof(proofHash);
      expect(exists).to.be.true;
    });
  });

  // =========================================================================
  // Querying Proofs by Telika ID
  // =========================================================================

  describe("getProofsByTelikaId", () => {
    it("should return all proof hashes for a Telika ID", async () => {
      const proof1 = generateProofHash("query-1");
      const proof2 = generateProofHash("query-2");

      await contract.anchorProof(proof1, EventType.IdentityVerification, TELIKA_ID, "{}");
      await contract.anchorProof(proof2, EventType.FundingDisbursement, TELIKA_ID, "{}");

      const proofs = await contract.getProofsByTelikaId(TELIKA_ID);
      expect(proofs.length).to.equal(2);
      expect(proofs[0]).to.equal(proof1);
      expect(proofs[1]).to.equal(proof2);
    });

    it("should return empty array for unknown Telika ID", async () => {
      const proofs = await contract.getProofsByTelikaId("UNKNOWN-ID");
      expect(proofs.length).to.equal(0);
    });

    it("should isolate proofs between different Telika IDs", async () => {
      const proof1 = generateProofHash("isolate-1");
      const proof2 = generateProofHash("isolate-2");

      await contract.anchorProof(proof1, EventType.IdentityVerification, TELIKA_ID, "{}");
      await contract.anchorProof(proof2, EventType.IdentityVerification, TELIKA_ID_2, "{}");

      const proofs1 = await contract.getProofsByTelikaId(TELIKA_ID);
      const proofs2 = await contract.getProofsByTelikaId(TELIKA_ID_2);

      expect(proofs1.length).to.equal(1);
      expect(proofs2.length).to.equal(1);
      expect(proofs1[0]).to.equal(proof1);
      expect(proofs2[0]).to.equal(proof2);
    });
  });

  // =========================================================================
  // Pagination
  // =========================================================================

  describe("getProofsByTelikaIdPaginated", () => {
    beforeEach(async () => {
      // Anchor 5 proofs for testing pagination
      for (let i = 0; i < 5; i++) {
        const proofHash = generateProofHash(`paginate-${i}`);
        await contract.anchorProof(proofHash, EventType.IdentityVerification, TELIKA_ID, "{}");
      }
    });

    it("should return paginated results", async () => {
      const page1 = await contract.getProofsByTelikaIdPaginated(TELIKA_ID, 0, 2);
      expect(page1.length).to.equal(2);

      const page2 = await contract.getProofsByTelikaIdPaginated(TELIKA_ID, 2, 2);
      expect(page2.length).to.equal(2);

      const page3 = await contract.getProofsByTelikaIdPaginated(TELIKA_ID, 4, 2);
      expect(page3.length).to.equal(1); // Only 1 remaining
    });

    it("should return empty array when offset exceeds total", async () => {
      const result = await contract.getProofsByTelikaIdPaginated(TELIKA_ID, 10, 2);
      expect(result.length).to.equal(0);
    });
  });

  // =========================================================================
  // Proof Count
  // =========================================================================

  describe("getProofCount", () => {
    it("should return 0 for unknown Telika ID", async () => {
      expect(await contract.getProofCount("UNKNOWN")).to.equal(0);
    });

    it("should return correct count after multiple anchors", async () => {
      for (let i = 0; i < 3; i++) {
        await contract.anchorProof(
          generateProofHash(`count-${i}`),
          EventType.IdentityVerification,
          TELIKA_ID,
          "{}"
        );
      }
      expect(await contract.getProofCount(TELIKA_ID)).to.equal(3);
    });
  });

  // =========================================================================
  // getProof
  // =========================================================================

  describe("getProof", () => {
    it("should return the proof record", async () => {
      const proofHash = generateProofHash("get-proof-test");
      await contract.anchorProof(proofHash, EventType.ScoreUpdate, TELIKA_ID, SAMPLE_METADATA);

      const record = await contract.getProof(proofHash);
      expect(record.proofHash).to.equal(proofHash);
      expect(record.eventType).to.equal(EventType.ScoreUpdate);
      expect(record.telikaId).to.equal(TELIKA_ID);
    });

    it("should revert for non-existing proof", async () => {
      const proofHash = generateProofHash("nonexistent");
      await expect(contract.getProof(proofHash)).to.be.revertedWith("Proof does not exist");
    });
  });
});
