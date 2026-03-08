# @telika/sdk

TypeScript SDK for the Telika blockchain-anchored verification system on Polygon.

## Installation

```bash
npm install @telika/sdk
```

## Quick Start

```typescript
import { ProofGenerator, BlockchainClient } from '@telika/sdk';

// Generate a proof for an identity verification event
const proof = ProofGenerator.createIdentityProof({
  telikaId: 'TLK-001',
  verificationMethod: 'document-check',
  verifiedAt: Date.now(),
  verifierAddress: '0x...',
});

// Anchor it on Polygon
const client = new BlockchainClient({
  contractAddress: '0x...',
  rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY',
  privateKey: '0x...',
});

const tx = await client.anchorProof(
  proof.hash,
  0, // EventType.IdentityVerification
  'TLK-001',
  JSON.stringify(proof.metadata)
);
```

## Event Types

| Type | Value | Description |
|------|-------|-------------|
| `IdentityVerification` | `0` | Founder identity verified |
| `FundingDisbursement` | `1` | Funding sent to founder |
| `MilestoneConfirmation` | `2` | Milestone achieved |
| `ScoreUpdate` | `3` | Telika score recalculated |

## API

### ProofGenerator

- `generateProofHash(eventData)` — Generate a keccak256 proof hash
- `createIdentityProof(data)` — Create an identity verification proof
- `createFundingProof(data)` — Create a funding disbursement proof
- `createMilestoneProof(data)` — Create a milestone confirmation proof
- `createScoreProof(data)` — Create a score update proof
- `generateMetadata(eventType, options)` — Generate proof metadata

### BlockchainClient

- `anchorProof(hash, eventType, telikaId, metadata)` — Anchor a proof on-chain
- `verifyProof(proofHash)` — Verify a proof exists on-chain
- `getProofsByTelikaId(telikaId)` — Get all proofs for a Telika ID
- `listenForProofs(callback)` — Listen for new proof events

## License

MIT — [Telika Africa](https://telika.ai)
