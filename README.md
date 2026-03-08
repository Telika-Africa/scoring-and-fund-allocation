# Telika Open-Source: Blockchain-Anchored Verification System

> Transparent, tamper-proof audit trails for founder verification events on the Polygon blockchain.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![npm](https://img.shields.io/npm/v/@telika/sdk)](https://www.npmjs.com/package/@telika/sdk)
[![Polygon](https://img.shields.io/badge/Blockchain-Polygon-8247E5)](https://polygon.technology/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636)](https://soliditylang.org/)
[![Vercel](https://img.shields.io/badge/Verify-Live-00C244?logo=vercel)](https://telika-verify.vercel.app)

## Overview

Telika is an AI-powered platform for vetting and scoring African startups. This open-source component anchors **cryptographic proofs** of key verification events on the **Polygon blockchain**, creating tamper-proof audit trails while keeping sensitive data private.

### Key Features

- 🔐 **Privacy-Preserving** — Only keccak256 hashes are stored on-chain; sensitive data stays off-chain
- 🔗 **Blockchain-Anchored** — Immutable proofs on Polygon (Ethereum L2) for cost-efficient verification
- 🔍 **Independently Verifiable** — Anyone can verify proofs via the public verification interface
- 🧩 **Modular SDK** — TypeScript SDK for easy integration with any platform
- 🛡️ **Role-Based Access** — OpenZeppelin AccessControl for authorized proof anchoring

### Supported Event Types

| Event | Description |
|-------|------------|
| 🪪 Identity Verification | Founder identity has been verified |
| 💰 Funding Disbursement | Funding has been disbursed to a venture |
| 🎯 Milestone Confirmation | A venture milestone has been confirmed |
| 📊 Score Update | Founder/venture score has been updated |

## Project Structure

```
├── contracts/          # Solidity smart contracts (Hardhat)
│   ├── contracts/      # TelikaVerification.sol + interface
│   ├── test/           # Comprehensive test suite
│   └── scripts/        # Deployment scripts
├── sdk/                # TypeScript SDK
│   ├── src/
│   │   ├── types.ts            # Type definitions
│   │   ├── proof-generator.ts  # Proof hash generation
│   │   ├── blockchain-client.ts # Contract interaction
│   │   └── abi.ts              # Contract ABI
│   └── test/           # Unit tests (Vitest)
├── verification-app/   # Public verification web interface (Vite)
│   └── src/
│       ├── main.ts     # SPA logic
│       └── styles.css  # Premium dark theme
├── turbo.json          # Turborepo configuration
└── package.json        # Root monorepo config
```

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### 1. Install Dependencies

```bash
# Install root deps (Turborepo)
npm install

# Install each package
cd contracts && npm install && cd ..
cd sdk && npm install && cd ..
cd verification-app && npm install && cd ..
```

### 2. Compile Smart Contracts

```bash
cd contracts
npx hardhat compile
```

### 3. Run Tests

```bash
# Smart contract tests
cd contracts && npx hardhat test

# SDK unit tests
cd sdk && npx vitest run
```

### 4. Run Verification App

```bash
cd verification-app
npm run dev
# Visit http://localhost:5173
```

## Smart Contract

**`TelikaVerification.sol`** — Deployed on Polygon

### Key Functions

| Function | Access | Description |
|----------|--------|-------------|
| `anchorProof(hash, type, id, metadata)` | ANCHOR_ROLE | Store a proof on-chain |
| `verifyProof(hash)` | Public | Check if a proof exists |
| `getProofsByTelikaId(id)` | Public | Get all proofs for a founder |
| `getProofCount(id)` | Public | Count proofs for a founder |

### Deployment

```bash
# Copy and fill in your env vars
cp .env.example .env

# Deploy to local Hardhat node
cd contracts
npx hardhat node                          # Terminal 1
npx hardhat run scripts/deploy.ts --network localhost  # Terminal 2

# Deploy to Polygon Amoy testnet
npx hardhat run scripts/deploy.ts --network polygonAmoy
```

## SDK Usage

```typescript
import {
  createIdentityProof,
  generateMetadata,
  TelikaBlockchainClient,
  EventType,
} from "@telika/sdk";

// 1. Generate a proof hash
const proofHash = createIdentityProof({
  type: EventType.IdentityVerification,
  telikaId: "TLK-001-ABCDE",
  timestamp: new Date().toISOString(),
  documentType: "National ID",
  issuingCountry: "KE",
  verified: true,
  verifiedBy: "Telika Platform",
});

// 2. Create metadata
const metadata = generateMetadata(event, "Telika Platform");

// 3. Anchor on-chain
const client = new TelikaBlockchainClient({
  rpcUrl: "https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY",
  contractAddress: "0x...",
  privateKey: "0x...", // Required for write operations
});

const { txHash, blockNumber } = await client.anchorProofAndWait(
  proofHash,
  EventType.IdentityVerification,
  "TLK-001-ABCDE",
  metadata
);

// 4. Verify (read-only, no private key needed)
const reader = new TelikaBlockchainClient({
  rpcUrl: "https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY",
  contractAddress: "0x...",
});

const result = await reader.verifyProof(proofHash);
console.log(result.exists); // true
```

## Data Flow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌──────────┐
│   Event      │     │  Proof Generator │     │  Blockchain     │     │ Polygon  │
│   Occurs     │────▶│  (SDK)           │────▶│  Client (SDK)   │────▶│ Contract │
│              │     │  keccak256 hash  │     │  ethers.js v6   │     │          │
└─────────────┘     └──────────────────┘     └─────────────────┘     └──────────┘
                                                                           │
                    ┌──────────────────┐     ┌─────────────────┐          │
                    │  Verification    │◀────│  Query Contract │◀─────────┘
                    │  Interface       │     │  (read-only)    │
                    └──────────────────┘     └─────────────────┘
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `POLYGON_AMOY_RPC_URL` | Polygon Amoy testnet RPC URL (Alchemy/Infura) |
| `POLYGON_MAINNET_RPC_URL` | Polygon mainnet RPC URL |
| `DEPLOYER_PRIVATE_KEY` | Wallet private key for deployment |
| `POLYGONSCAN_API_KEY` | API key for contract verification on Polygonscan |
| `CONTRACT_ADDRESS` | Deployed contract address |

## Contributing

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## About Telika

Telika is an AI-powered platform dedicated to vetting and scoring African startups, facilitating transparent due diligence, and tracking venture milestones. Learn more at [telika.ai](https://telika.ai).
