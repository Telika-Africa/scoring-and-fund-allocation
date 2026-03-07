/**
 * Telika Blockchain Client
 *
 * Provides a high-level API for interacting with the TelikaVerification smart contract
 * on the Polygon network. Handles transaction signing, gas estimation, event monitoring,
 * and read/write operations.
 *
 * Usage:
 *   // Read-only client (no private key needed)
 *   const reader = new TelikaBlockchainClient({
 *     rpcUrl: "https://polygon-amoy.g.alchemy.com/v2/KEY",
 *     contractAddress: "0x...",
 *   });
 *
 *   // Read-write client (private key required for anchoring)
 *   const writer = new TelikaBlockchainClient({
 *     rpcUrl: "https://polygon-amoy.g.alchemy.com/v2/KEY",
 *     contractAddress: "0x...",
 *     privateKey: "0x...",
 *   });
 */

import {
  JsonRpcProvider,
  Wallet,
  Contract,
  ContractTransactionResponse,
  EventLog,
  formatUnits,
} from "ethers";
import { TELIKA_VERIFICATION_ABI } from "./abi";
import {
  TelikaClientConfig,
  EventType,
  ProofRecord,
  VerificationResult,
  ProofMetadata,
} from "./types";

// =========================================================================
// Client Class
// =========================================================================

export class TelikaBlockchainClient {
  private provider: JsonRpcProvider;
  private contract: Contract;
  private signer?: Wallet;
  private config: TelikaClientConfig;

  constructor(config: TelikaClientConfig) {
    this.config = config;
    this.provider = new JsonRpcProvider(config.rpcUrl);

    if (config.privateKey) {
      this.signer = new Wallet(config.privateKey, this.provider);
      this.contract = new Contract(
        config.contractAddress,
        TELIKA_VERIFICATION_ABI,
        this.signer
      );
    } else {
      this.contract = new Contract(
        config.contractAddress,
        TELIKA_VERIFICATION_ABI,
        this.provider
      );
    }
  }

  // =========================================================================
  // Write Operations (require signer)
  // =========================================================================

  /**
   * Anchor a cryptographic proof on-chain.
   *
   * @param proofHash - The keccak256 hash of the verification event data (from proof-generator)
   * @param eventType - The type of verification event
   * @param telikaId - The unique Telika identifier
   * @param metadata - Non-sensitive metadata to store alongside the proof
   * @returns Transaction response with hash and wait() method
   * @throws Error if no signer is configured
   */
  async anchorProof(
    proofHash: string,
    eventType: EventType,
    telikaId: string,
    metadata: ProofMetadata | string
  ): Promise<ContractTransactionResponse> {
    this.requireSigner();

    const metadataStr =
      typeof metadata === "string" ? metadata : JSON.stringify(metadata);

    const tx = await this.contract.anchorProof(
      proofHash,
      eventType,
      telikaId,
      metadataStr
    );

    return tx;
  }

  /**
   * Anchor a proof and wait for transaction confirmation.
   * Convenience wrapper around anchorProof() that waits for the receipt.
   *
   * @param proofHash - The keccak256 proof hash
   * @param eventType - The event type
   * @param telikaId - The Telika ID
   * @param metadata - Proof metadata
   * @param confirmations - Number of confirmations to wait for (default: 1)
   * @returns Object with transaction hash and block number
   */
  async anchorProofAndWait(
    proofHash: string,
    eventType: EventType,
    telikaId: string,
    metadata: ProofMetadata | string,
    confirmations: number = 1
  ): Promise<{ txHash: string; blockNumber: number }> {
    const tx = await this.anchorProof(proofHash, eventType, telikaId, metadata);
    const receipt = await tx.wait(confirmations);

    if (!receipt) {
      throw new Error("Transaction receipt is null — transaction may have been dropped");
    }

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  // =========================================================================
  // Read Operations (no signer needed)
  // =========================================================================

  /**
   * Verify whether a proof exists on-chain and retrieve its record.
   *
   * @param proofHash - The proof hash to verify
   * @returns Verification result with existence flag and proof record
   */
  async verifyProof(proofHash: string): Promise<VerificationResult> {
    const [exists, rawRecord] = await this.contract.verifyProof(proofHash);

    if (!exists) {
      return { exists: false };
    }

    return {
      exists: true,
      record: this.parseProofRecord(rawRecord),
    };
  }

  /**
   * Get all proof hashes associated with a Telika ID.
   *
   * @param telikaId - The unique Telika identifier
   * @returns Array of proof hash strings
   */
  async getProofsByTelikaId(telikaId: string): Promise<string[]> {
    const hashes = await this.contract.getProofsByTelikaId(telikaId);
    return Array.from(hashes) as string[];
  }

  /**
   * Get all proof records for a Telika ID (fetches each proof's full record).
   *
   * @param telikaId - The unique Telika identifier
   * @returns Array of full proof records
   */
  async getFullProofsByTelikaId(telikaId: string): Promise<ProofRecord[]> {
    const hashes = await this.getProofsByTelikaId(telikaId);
    const records = await Promise.all(
      hashes.map(async (hash) => {
        const rawRecord = await this.contract.getProof(hash);
        return this.parseProofRecord(rawRecord);
      })
    );
    return records;
  }

  /**
   * Get the count of proofs for a Telika ID.
   *
   * @param telikaId - The unique Telika identifier
   * @returns Number of proofs anchored for this ID
   */
  async getProofCount(telikaId: string): Promise<number> {
    const count = await this.contract.getProofCount(telikaId);
    return Number(count);
  }

  /**
   * Get the total number of proofs anchored across all Telika IDs.
   */
  async getTotalProofs(): Promise<number> {
    const total = await this.contract.totalProofs();
    return Number(total);
  }

  /**
   * Get paginated proof hashes for a Telika ID.
   *
   * @param telikaId - The Telika ID to query
   * @param offset - Starting index
   * @param limit - Maximum number of results
   * @returns Array of proof hashes
   */
  async getProofsPaginated(
    telikaId: string,
    offset: number,
    limit: number
  ): Promise<string[]> {
    const hashes = await this.contract.getProofsByTelikaIdPaginated(
      telikaId,
      offset,
      limit
    );
    return Array.from(hashes) as string[];
  }

  // =========================================================================
  // Event Monitoring
  // =========================================================================

  /**
   * Listen for new ProofAnchored events.
   *
   * @param callback - Function called when a new proof is anchored
   * @returns Cleanup function to stop listening
   */
  onProofAnchored(
    callback: (event: {
      proofHash: string;
      eventType: EventType;
      telikaId: string;
      timestamp: number;
      anchoredBy: string;
    }) => void
  ): () => void {
    const listener = (
      proofHash: string,
      eventType: bigint,
      telikaId: string,
      timestamp: bigint,
      anchoredBy: string
    ) => {
      callback({
        proofHash,
        eventType: Number(eventType) as EventType,
        telikaId,
        timestamp: Number(timestamp),
        anchoredBy,
      });
    };

    this.contract.on("ProofAnchored", listener);

    return () => {
      this.contract.off("ProofAnchored", listener);
    };
  }

  /**
   * Query historical ProofAnchored events.
   *
   * @param fromBlock - Starting block number (default: last 10000 blocks)
   * @param toBlock - Ending block number (default: latest)
   * @returns Array of proof anchored events
   */
  async queryProofEvents(
    fromBlock?: number,
    toBlock?: number
  ): Promise<
    Array<{
      proofHash: string;
      eventType: EventType;
      telikaId: string;
      timestamp: number;
      anchoredBy: string;
      blockNumber: number;
      transactionHash: string;
    }>
  > {
    const currentBlock = await this.provider.getBlockNumber();
    const from = fromBlock ?? Math.max(0, currentBlock - 10000);
    const to = toBlock ?? currentBlock;

    const filter = this.contract.filters.ProofAnchored();
    const events = await this.contract.queryFilter(filter, from, to);

    return events
      .filter((e): e is EventLog => e instanceof EventLog)
      .map((event) => ({
        proofHash: event.args[0] as string,
        eventType: Number(event.args[1]) as EventType,
        telikaId: event.args[2] as string,
        timestamp: Number(event.args[3]),
        anchoredBy: event.args[4] as string,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      }));
  }

  // =========================================================================
  // Access Control
  // =========================================================================

  /**
   * Check if an address has the ANCHOR_ROLE.
   *
   * @param address - The address to check
   * @returns Whether the address can anchor proofs
   */
  async hasAnchorRole(address: string): Promise<boolean> {
    const role = await this.contract.ANCHOR_ROLE();
    return this.contract.hasRole(role, address);
  }

  /**
   * Grant ANCHOR_ROLE to an address (requires admin role).
   *
   * @param address - The address to grant the role to
   * @returns Transaction response
   */
  async grantAnchorRole(address: string): Promise<ContractTransactionResponse> {
    this.requireSigner();
    const role = await this.contract.ANCHOR_ROLE();
    return this.contract.grantRole(role, address);
  }

  /**
   * Revoke ANCHOR_ROLE from an address (requires admin role).
   *
   * @param address - The address to revoke the role from
   * @returns Transaction response
   */
  async revokeAnchorRole(address: string): Promise<ContractTransactionResponse> {
    this.requireSigner();
    const role = await this.contract.ANCHOR_ROLE();
    return this.contract.revokeRole(role, address);
  }

  // =========================================================================
  // Utility
  // =========================================================================

  /**
   * Get the contract address.
   */
  getContractAddress(): string {
    return this.config.contractAddress;
  }

  /**
   * Get the current signer address (if configured).
   */
  async getSignerAddress(): Promise<string | undefined> {
    return this.signer?.getAddress();
  }

  /**
   * Get the current block number.
   */
  async getBlockNumber(): Promise<number> {
    return this.provider.getBlockNumber();
  }

  /**
   * Get the balance of the signer (in MATIC/ETH).
   */
  async getSignerBalance(): Promise<string> {
    this.requireSigner();
    const balance = await this.provider.getBalance(this.signer!.address);
    return formatUnits(balance, 18);
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  private requireSigner(): void {
    if (!this.signer) {
      throw new Error(
        "This operation requires a signer. Initialize TelikaBlockchainClient with a privateKey."
      );
    }
  }

  private parseProofRecord(raw: Record<string, unknown>): ProofRecord {
    return {
      proofHash: raw.proofHash as string ?? raw[0] as string,
      eventType: Number(raw.eventType ?? raw[1]) as EventType,
      telikaId: raw.telikaId as string ?? raw[2] as string,
      timestamp: Number(raw.timestamp ?? raw[3]),
      metadata: raw.metadata as string ?? raw[4] as string,
      anchoredBy: raw.anchoredBy as string ?? raw[5] as string,
    };
  }
}
