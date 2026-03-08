/**
 * Telika Verification App — Main Entry Point
 *
 * SPA logic for verifying blockchain-anchored proofs on the Polygon network.
 * Uses ethers.js v6 for read-only blockchain queries (no wallet needed).
 */

import {
  JsonRpcProvider,
  Contract,
  EventLog,
} from "ethers";

// =========================================================================
// Contract ABI (minimal read-only subset)
// =========================================================================
const ABI = [
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
    name: "totalProofs",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
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
];

// =========================================================================
// Event type labels and badge classes
// =========================================================================
const EVENT_LABELS: Record<number, string> = {
  0: "Identity Verification",
  1: "Funding Disbursement",
  2: "Milestone Confirmation",
  3: "Score Update",
};

const EVENT_BADGE_CLASS: Record<number, string> = {
  0: "event-badge--identity",
  1: "event-badge--funding",
  2: "event-badge--milestone",
  3: "event-badge--score",
};

const EVENT_ICONS: Record<number, string> = {
  0: "🪪",
  1: "💰",
  2: "🎯",
  3: "📊",
};

// =========================================================================
// State
// =========================================================================
let currentPage = "verify";
let rpcUrl = "";
let contractAddress = "";

// =========================================================================
// DOM Elements
// =========================================================================
const $ = (id: string) => document.getElementById(id)!;

function init() {
  // Load saved config
  rpcUrl = localStorage.getItem("telika_rpc_url") || "";
  contractAddress = localStorage.getItem("telika_contract_address") || "";

  // Populate config fields
  const rpcInput = $("rpc-url-input") as HTMLInputElement;
  const addrInput = $("contract-address-input") as HTMLInputElement;
  if (rpcUrl) rpcInput.value = rpcUrl;
  if (contractAddress) addrInput.value = contractAddress;

  // Navigation
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = (btn as HTMLElement).dataset.page!;
      navigateTo(page);
    });
  });

  // Search tabs
  document.querySelectorAll(".search-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const searchType = (tab as HTMLElement).dataset.search!;
      switchSearchTab(searchType);
    });
  });

  // Verify button
  $("verify-btn").addEventListener("click", handleVerifyProof);
  $("proof-hash-input").addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") handleVerifyProof();
  });

  // Lookup button
  $("lookup-btn").addEventListener("click", handleLookupTelikaId);
  $("telika-id-input").addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") handleLookupTelikaId();
  });

  // Connect button
  $("connect-btn").addEventListener("click", handleConnect);
}

// =========================================================================
// Navigation
// =========================================================================
function navigateTo(page: string) {
  currentPage = page;

  // Update nav buttons
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", (btn as HTMLElement).dataset.page === page);
  });

  // Update pages
  document.querySelectorAll(".page").forEach((p) => {
    p.classList.toggle("page--active", p.id === `page-${page}`);
  });
}

function switchSearchTab(type: string) {
  document.querySelectorAll(".search-tab").forEach((tab) => {
    tab.classList.toggle("active", (tab as HTMLElement).dataset.search === type);
  });

  $("search-group-hash").classList.toggle("hidden", type !== "hash");
  $("search-group-telika-id").classList.toggle("hidden", type !== "telika-id");
}

// =========================================================================
// Blockchain Interaction
// =========================================================================
function getContract(): Contract | null {
  if (!rpcUrl || !contractAddress) {
    showError("Please configure RPC URL and Contract Address in the Explorer tab first.");
    return null;
  }

  try {
    const provider = new JsonRpcProvider(rpcUrl);
    return new Contract(contractAddress, ABI, provider);
  } catch (err) {
    showError(`Connection error: ${(err as Error).message}`);
    return null;
  }
}

// =========================================================================
// Verify Proof Handler
// =========================================================================
async function handleVerifyProof() {
  const input = ($("proof-hash-input") as HTMLInputElement).value.trim();
  const resultsArea = $("results-area");

  if (!input) {
    showError("Please enter a proof hash.");
    return;
  }

  if (!/^0x[a-fA-F0-9]{64}$/.test(input)) {
    showError("Invalid proof hash format. Expected a 66-character hex string (0x + 64 hex chars).");
    return;
  }

  const contract = getContract();
  if (!contract) return;

  showLoading(resultsArea, "Querying Polygon blockchain...");

  try {
    const [exists, record] = await contract.verifyProof(input);

    if (!exists) {
      resultsArea.innerHTML = renderNotFoundCard(input);
      return;
    }

    resultsArea.innerHTML = renderProofCard({
      proofHash: record.proofHash,
      eventType: Number(record.eventType),
      telikaId: record.telikaId,
      timestamp: Number(record.timestamp),
      metadata: record.metadata,
      anchoredBy: record.anchoredBy,
    });
  } catch (err) {
    showError(`Verification failed: ${(err as Error).message}`);
  }
}

// =========================================================================
// Telika ID Lookup Handler
// =========================================================================
async function handleLookupTelikaId() {
  const input = ($("telika-id-input") as HTMLInputElement).value.trim();
  const resultsArea = $("results-area");

  if (!input) {
    showError("Please enter a Telika ID.");
    return;
  }

  const contract = getContract();
  if (!contract) return;

  showLoading(resultsArea, "Looking up proofs on Polygon...");

  try {
    const proofHashes: string[] = Array.from(await contract.getProofsByTelikaId(input));

    if (proofHashes.length === 0) {
      resultsArea.innerHTML = `
        <div class="result-card result-card--error">
          <div class="result-header">
            <div class="result-icon result-icon--error">🔍</div>
            <div>
              <div class="result-title">No Proofs Found</div>
              <div class="result-subtitle">No verification events found for Telika ID: ${escapeHtml(input)}</div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // Fetch all proof records
    const records = await Promise.all(
      proofHashes.map(async (hash) => {
        const record = await contract.getProof(hash);
        return {
          proofHash: record.proofHash as string,
          eventType: Number(record.eventType),
          telikaId: record.telikaId as string,
          timestamp: Number(record.timestamp),
          metadata: record.metadata as string,
          anchoredBy: record.anchoredBy as string,
        };
      })
    );

    resultsArea.innerHTML = `
      <div class="result-card result-card--success">
        <div class="result-header">
          <div class="result-icon result-icon--success">✅</div>
          <div>
            <div class="result-title">${proofHashes.length} Proof${proofHashes.length !== 1 ? "s" : ""} Found</div>
            <div class="result-subtitle">Telika ID: ${escapeHtml(input)}</div>
          </div>
        </div>
      </div>
      ${records.map((r) => renderProofCard(r)).join("")}
    `;
  } catch (err) {
    showError(`Lookup failed: ${(err as Error).message}`);
  }
}

// =========================================================================
// Explorer Connect Handler
// =========================================================================
async function handleConnect() {
  const rpcInput = ($("rpc-url-input") as HTMLInputElement).value.trim();
  const addrInput = ($("contract-address-input") as HTMLInputElement).value.trim();
  const explorerResults = $("explorer-results");

  if (!rpcInput || !addrInput) {
    explorerResults.innerHTML = renderErrorCard("Please fill in both RPC URL and Contract Address.");
    return;
  }

  rpcUrl = rpcInput;
  contractAddress = addrInput;

  // Save to localStorage
  localStorage.setItem("telika_rpc_url", rpcUrl);
  localStorage.setItem("telika_contract_address", contractAddress);

  showLoading(explorerResults, "Connecting to Polygon and fetching events...");

  try {
    const provider = new JsonRpcProvider(rpcUrl);
    const contract = new Contract(contractAddress, ABI, provider);

    const totalProofs = Number(await contract.totalProofs());
    const currentBlock = await provider.getBlockNumber();

    // Paginate event queries in small chunks (Alchemy free tier = 10 blocks max)
    const CHUNK_SIZE = 10;
    const TOTAL_RANGE = 500; // scan last 500 blocks
    const fromBlock = Math.max(0, currentBlock - TOTAL_RANGE);

    const allEvents: EventLog[] = [];
    for (let start = fromBlock; start <= currentBlock; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE - 1, currentBlock);
      try {
        const filter = contract.filters.ProofAnchored();
        const chunk = await contract.queryFilter(filter, start, end);
        allEvents.push(...chunk.filter((e): e is EventLog => e instanceof EventLog));
      } catch {
        // Skip chunks that fail
      }
    }

    const parsedEvents = allEvents
      .map((event) => ({
        proofHash: event.args[0] as string,
        eventType: Number(event.args[1]),
        telikaId: event.args[2] as string,
        timestamp: Number(event.args[3]),
        anchoredBy: event.args[4] as string,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
      }))
      .reverse(); // Most recent first

    explorerResults.innerHTML = `
      <div class="result-card">
        <div class="result-header">
          <div class="result-icon result-icon--info">📊</div>
          <div>
            <div class="result-title">Connected Successfully</div>
            <div class="result-subtitle">Total proofs on chain: ${totalProofs} · Showing last ${parsedEvents.length} events</div>
          </div>
        </div>
      </div>
      ${parsedEvents.length === 0
        ? '<div class="empty-state"><div class="empty-state__icon">📭</div><div class="empty-state__text">No recent events found in the last 500 blocks.</div></div>'
        : parsedEvents.map((e) => `
          <div class="result-card" style="animation-delay: ${parsedEvents.indexOf(e) * 0.05}s">
            <div class="result-header">
              <div class="result-icon result-icon--info">${EVENT_ICONS[e.eventType] || "📋"}</div>
              <div>
                <div class="result-title">${EVENT_LABELS[e.eventType] || "Unknown"}</div>
                <div class="result-subtitle">Block #${e.blockNumber}</div>
              </div>
            </div>
            <div class="result-grid">
              <div class="result-field result-field--full">
                <div class="result-field__label">Proof Hash</div>
                <div class="result-field__value result-field__value--mono">${e.proofHash}</div>
              </div>
              <div class="result-field">
                <div class="result-field__label">Telika ID</div>
                <div class="result-field__value result-field__value--highlight">${escapeHtml(e.telikaId)}</div>
              </div>
              <div class="result-field">
                <div class="result-field__label">Timestamp</div>
                <div class="result-field__value">${formatTimestamp(e.timestamp)}</div>
              </div>
              <div class="result-field result-field--full">
                <div class="result-field__label">Anchored By</div>
                <div class="result-field__value result-field__value--mono">${e.anchoredBy}</div>
              </div>
            </div>
          </div>
        `).join("")
      }
    `;
  } catch (err) {
    explorerResults.innerHTML = renderErrorCard(`Connection failed: ${(err as Error).message}`);
  }
}

// =========================================================================
// Render Functions
// =========================================================================
interface ProofData {
  proofHash: string;
  eventType: number;
  telikaId: string;
  timestamp: number;
  metadata: string;
  anchoredBy: string;
}

function renderProofCard(proof: ProofData): string {
  let parsedMetadata = "";
  try {
    const meta = JSON.parse(proof.metadata);
    parsedMetadata = Object.entries(meta)
      .map(([k, v]) => `<div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</div>`)
      .join("");
  } catch {
    parsedMetadata = escapeHtml(proof.metadata);
  }

  return `
    <div class="result-card result-card--success">
      <div class="result-header">
        <div class="result-icon result-icon--success">✅</div>
        <div>
          <div class="result-title">Proof Verified</div>
          <div class="result-subtitle">This proof exists on the Polygon blockchain</div>
        </div>
      </div>
      <div class="result-grid">
        <div class="result-field result-field--full">
          <div class="result-field__label">Proof Hash</div>
          <div class="result-field__value result-field__value--mono">${proof.proofHash}</div>
        </div>
        <div class="result-field">
          <div class="result-field__label">Event Type</div>
          <div class="result-field__value">
            <span class="event-badge ${EVENT_BADGE_CLASS[proof.eventType] || ""}">
              ${EVENT_ICONS[proof.eventType] || "📋"} ${EVENT_LABELS[proof.eventType] || "Unknown"}
            </span>
          </div>
        </div>
        <div class="result-field">
          <div class="result-field__label">Telika ID</div>
          <div class="result-field__value result-field__value--highlight">${escapeHtml(proof.telikaId)}</div>
        </div>
        <div class="result-field">
          <div class="result-field__label">Timestamp</div>
          <div class="result-field__value">${formatTimestamp(proof.timestamp)}</div>
        </div>
        <div class="result-field">
          <div class="result-field__label">Anchored By</div>
          <div class="result-field__value result-field__value--mono" style="font-size: 11px;">${proof.anchoredBy}</div>
        </div>
        ${parsedMetadata ? `
          <div class="result-field result-field--full">
            <div class="result-field__label">Metadata</div>
            <div class="result-field__value" style="font-size: 13px; line-height: 1.6;">${parsedMetadata}</div>
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

function renderNotFoundCard(hash: string): string {
  return `
    <div class="result-card result-card--error">
      <div class="result-header">
        <div class="result-icon result-icon--error">❌</div>
        <div>
          <div class="result-title">Proof Not Found</div>
          <div class="result-subtitle">This proof hash does not exist on the Polygon blockchain</div>
        </div>
      </div>
      <div class="result-grid">
        <div class="result-field result-field--full">
          <div class="result-field__label">Queried Hash</div>
          <div class="result-field__value result-field__value--mono">${hash}</div>
        </div>
      </div>
    </div>
  `;
}

function renderErrorCard(message: string): string {
  return `
    <div class="result-card result-card--error">
      <div class="result-header">
        <div class="result-icon result-icon--error">⚠️</div>
        <div>
          <div class="result-title">Error</div>
          <div class="result-subtitle">${escapeHtml(message)}</div>
        </div>
      </div>
    </div>
  `;
}

// =========================================================================
// Helpers
// =========================================================================
function showLoading(container: HTMLElement, text: string) {
  container.innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      <div class="loading-text">${escapeHtml(text)}</div>
    </div>
  `;
}

function showError(message: string) {
  $("results-area").innerHTML = renderErrorCard(message);
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatTimestamp(ts: number): string {
  if (ts === 0) return "N/A";
  const date = new Date(ts * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// =========================================================================
// Initialize
// =========================================================================
document.addEventListener("DOMContentLoaded", init);
