# StableBirr SDK Documentation

**Complete TypeScript SDK for Ethiopian Birr Stablecoin**

[![npm version](https://img.shields.io/npm/v/@tolbel/sbirr.svg)](https://www.npmjs.com/package/@tolbel/sbirr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📚 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Installation](#installation)
  - [Node.js](#nodejs)
  - [Bun](#bun)
  - [Deno](#deno)
  - [Browser](#browser)
- [Core Concepts](#core-concepts)
  - [What is StableBirr?](#what-is-stablebirr)
  - [Architecture Overview](#architecture-overview)
  - [Transaction Flow](#transaction-flow)
  - [Gas and Transaction Options](#gas-and-transaction-options)
- [Configuration](#configuration)
  - [Network Selection](#network-selection)
  - [RPC Providers](#rpc-providers)
  - [Signer Setup](#signer-setup)
- [Contract Operations](#contract-operations)
  - [Minting](#minting)
  - [Burning](#burning)
  - [Transfers](#transfers)
  - [Compliance Controls](#compliance-controls)
  - [Governance](#governance)
- [Advanced Topics](#advanced-topics)
  - [Transaction Options Deep Dive](#transaction-options-deep-dive)
  - [Error Handling](#error-handling)
  - [Event Listening](#event-listening)
  - [Batch Operations](#batch-operations)
- [Runtime-Specific Guides](#runtime-specific-guides)
  - [Node.js Examples](#nodejs-examples)
  - [Bun Examples](#bun-examples)
  - [Deno Examples](#deno-examples)
  - [Browser Examples](#browser-examples)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)
- [Examples](#examples)

---

## Overview

The StableBirr SDK provides a production-ready TypeScript interface for interacting with the StableBirr smart contract ecosystem. StableBirr (SBirr) is an Ethiopian Birr-pegged stablecoin built on Polygon, designed for regulated treasury operations with comprehensive compliance controls.

### Key Features

✅ **Fully Typed** - Complete TypeScript support with TypeChain-generated contract types  
✅ **Schema Validation** - Zod-based input validation catches errors before blockchain submission  
✅ **Multi-Runtime** - Works in Node.js, Bun, Deno, and browsers  
✅ **Transaction Control** - Fine-grained gas management for production operations  
✅ **Compliance Ready** - Built-in blacklist, freeze, and regulatory controls  
✅ **Error Handling** - Structured errors differentiate client vs blockchain issues

---

## Quick Start

The `network` parameter selects which blockchain (polygon, amoy testnet, or local). The `rpcUrl` is your node endpoint. The `privateKey` signs transactions.

**Mint tokens:**

```typescript
const tx = await sbirr.contract.mint({
  to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  amount: "15400",
  usdAmount: "100",
  rate: 154,
});
```

This validates inputs, checks the oracle rate, and submits a transaction to create 15,400 SBirr (backed by $100 at 154 ETB/USD).

> **Note**: Examples use the current USD/ETB exchange rate of **154 ETB per USD** (National Bank of Ethiopia official rate as of November 2025). The actual rate fluctuates daily and is fetched from Chainlink oracles during minting.

**Wait for confirmation:**

```typescript
await tx.wait();
console.log("Minted!", tx.hash);
```

`tx.wait()` blocks until the transaction is confirmed (2-5 seconds on Polygon).

**Check balance:**

```typescript
const balance = await sbirr.contract.getBalance(
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
);
console.log("Balance:", balance, "SBirr");
```

This reads the balance from the blockchain. It's a free read operation (no gas cost).

**Complete example:**

```typescript
import StableBirr from "@tolbel/sbirr";

// Initialize SDK
const sbirr = new StableBirr({
  network: "polygon",
  rpcUrl: process.env.POLYGON_RPC_URL,
  privateKey: process.env.PRIVATE_KEY,
});

// Mint tokens
const tx = await sbirr.contract.mint({
  to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  amount: "15400", // 15,400 SBirr
  usdAmount: "100", // $100 USD deposited
  rate: 154, // 1 USD = 154 ETB
});

await tx.wait();
console.log("Minted!", tx.hash);

// Check balance
const balance = await sbirr.contract.getBalance(
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
);
console.log("Balance:", balance, "SBirr");
```

---

## Installation

Install the SDK using your preferred package manager:

```bash
# npm
npm install @tolbel/sbirr

# pnpm
pnpm add @tolbel/sbirr

# yarn
yarn add @tolbel/sbirr

# bun
bun add @tolbel/sbirr
```

For Deno, import directly from npm:

```typescript
import StableBirr from "npm:@tolbel/sbirr";
```

**Example Usage**:

```typescript

import StableBirr, { ethers, parseUnits, formatUnits } from "@tolbel/sbirr";

const sbirr = new StableBirr({ ... });
const amount = parseUnits("100", 18);
```

---

## Understanding SDK Utilities

The SDK includes all the ethers utilities you'll need, so you don't have to install it separately. Here's how to work with blockchain numbers, addresses, and other common tasks.

### Working with Numbers

Blockchains don't understand decimals. When you want to send "100 SBirr", the blockchain actually stores it as `100000000000000000000` (100 followed by 18 zeros). This format is called "wei".

**Converting to blockchain format:**

```typescript
import { parseUnits } from "@tolbel/sbirr";

// Convert 100 SBirr to blockchain format
const amount = parseUnits("100", 18);
// Result: 100000000000000000000n

// For gas prices (gwei = 9 decimals)
const gasPrice = parseUnits("50", "gwei");
// Result: 50000000000n
```

Use `parseUnits` before sending any amount to a contract function.

**Converting back to readable format:**

```typescript
import { formatUnits } from "@tolbel/sbirr";

// Balance from blockchain: 100000000000000000000n
const balance = await sbirr.contract.getBalance("0x...");

// Convert to human-readable
const readable = formatUnits(balance, 18);
// Result: "100.0"

console.log(`You have ${readable} SBirr`);
```

**Shortcuts for 18-decimal tokens:**

Most tokens (SBirr, MATIC, USDC) use 18 decimals, so there are shortcuts:

```typescript
import { parseEther, formatEther } from "@tolbel/sbirr";

const amount = parseEther("100"); // Same as parseUnits("100", 18)
const readable = formatEther(balance); // Same as formatUnits(balance, 18)
```

---

### Working with Addresses

Ethereum addresses look like `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`. Before using an address from user input, you should validate it:

```typescript
import { isAddress } from "@tolbel/sbirr";

const userInput = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";

if (isAddress(userInput)) {
  // Safe to use
  await sbirr.contract.transfer({ to: userInput, amount: "100" });
} else {
  console.error("Invalid address - check for typos!");
}
```

This prevents wasting gas on transactions to invalid addresses.

**Normalizing addresses:**

Addresses can be written in lowercase, uppercase, or mixed case. The mixed case version (called "checksummed") helps catch typos:

```typescript
import { getAddress } from "@tolbel/sbirr";

const lowercase = "0x742d35cc6634c0532925a3b844bc9e7595f0beb";
const checksummed = getAddress(lowercase);
// Result: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"

// Use this when comparing addresses
if (getAddress(addr1) === getAddress(addr2)) {
  console.log("Same address");
}
```

Always use `getAddress` when storing addresses in your database or comparing them.

---

### Creating Unique IDs

Sometimes you need to generate a unique identifier for a transaction or record. Ethereum uses Keccak-256 hashing:

```typescript
import { keccak256, toUtf8Bytes } from "@tolbel/sbirr";

// Hash a string
const hash = keccak256(toUtf8Bytes("Hello, StableBirr"));
// Result: "0x..." (32-byte hash)

// Create a unique transaction ID
const txId = keccak256(toUtf8Bytes(`${userAddress}-${timestamp}-${amount}`));
```

This creates a deterministic ID - the same input always produces the same hash.

---

### Useful Constants

**Unlimited allowances:**

When configuring minters, you might want to grant unlimited permission:

```typescript
import { MaxUint256 } from "@tolbel/sbirr";

await sbirr.contract.configureMinter({
  minter: "0x...",
  allowance: MaxUint256.toString(), // Unlimited
  canBurn: true,
});
```

`MaxUint256` is the largest number Ethereum can handle (2^256 - 1). Use it carefully!

**The zero address:**

The address `0x0000000000000000000000000000000000000000` represents "no address" in Ethereum:

```typescript
import { ZeroAddress } from "@tolbel/sbirr";

// Prevent sending to nowhere
if (recipient === ZeroAddress) {
  throw new Error("Cannot send to zero address");
}
```

---

### TypeScript Types

For better type safety in your code, import these types:

```typescript
import type {
  TransactionResponse,
  TransactionReceipt,
  Provider,
  Signer,
} from "@tolbel/sbirr";

async function waitForTx(
  tx: TransactionResponse
): Promise<TransactionReceipt | null> {
  return await tx.wait();
}
```

This gives you autocomplete and catches type errors before runtime.

---

## Core Concepts

### What is StableBirr?

StableBirr (SBirr) is a **fiat-backed stablecoin** pegged 1:1 to the Ethiopian Birr (ETB). It operates on Polygon and is designed for:

- **Cross-border payments** - Fast, low-cost remittances to Ethiopia
- **Treasury operations** - Regulated mint/burn flows tied to fiat reserves
- **Compliance** - Built-in blacklist, freeze, and regulatory controls
- **Transparency** - On-chain audit trails for every mint and burn

#### How It Works

```
┌─────────────────┐
│  Fiat Deposit   │  User deposits USD to custody account
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Oracle Check   │  System fetches USD/ETB rate from oracle
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Mint SBirr     │  Smart contract mints equivalent SBirr
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  User Receives  │  SBirr appears in user's wallet
└─────────────────┘
```

**Key Properties**:

- **1 SBirr = 1 ETB** (Ethiopian Birr)
- **Fully collateralized** - Every SBirr backed by fiat in custody
- **ERC-20 compatible** - Works with all Ethereum wallets and DeFi
- **Upgradeable** - UUPS proxy pattern for future improvements

### Architecture Overview

The SDK interacts with multiple layers:

```
┌──────────────────────────────────────────┐
│           Your Application               │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│         StableBirr SDK                   │
│  ┌────────────┐  ┌──────────────┐       │
│  │  Contract  │  │     NBE      │       │
│  │  Resource  │  │   Resource   │       │
│  └─────┬──────┘  └──────┬───────┘       │
└────────┼─────────────────┼───────────────┘
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌──────────────┐
│  Polygon Network│  │  NBE API     │
│  (Blockchain)   │  │  (Off-chain) │
└─────────────────┘  └──────────────┘
```

**Contract Resource** - Handles all blockchain interactions:

- Minting and burning tokens
- Transfers and approvals
- Compliance controls (blacklist, freeze)
- Governance operations (oracle updates, supply caps)

**NBE Resource** - Interfaces with National Bank of Ethiopia APIs:

- Exchange rate fetching
- Compliance checks
- Transaction reporting

### Transaction Flow

Understanding how transactions work is crucial for production use:

#### 1. **Client-Side Validation**

```typescript
const params = {
  to: "0x123...",
  amount: "15400",
  usdAmount: "100",
  rate: 154,
};

// SDK validates with Zod schema
MintParamsSchema.parse(params); // Throws ValidationError if invalid
```

#### 2. **Transaction Construction**

```typescript
// User calls SDK method
const tx = await sbirr.contract.mint({
  to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  amount: "15400",
  usdAmount: "100",
  rate: 154,
  options: { gasLimit: 250000 },
});
```

The SDK handles all the complexity internally - parsing units, validating inputs, and constructing the transaction.

#### 3. **Blockchain Execution**

```
Transaction Object:
{
  to: "0xContractAddress",
  data: "0x40c10f19...",  // Encoded function call
  gasLimit: 200000,
  maxFeePerGas: "50 gwei",
  nonce: 42,
  chainId: 137
}
```

#### 4. **Confirmation**

```typescript
const receipt = await tx.wait();
if (receipt.status === 1) {
  console.log("Success!");
} else {
  console.log("Transaction failed");
}
```

### Gas and Transaction Options

**Critical Concept**: Transaction options control how your transaction is processed by the Polygon network, NOT by the Solidity contract.

#### What Are Transaction Options?

```typescript
type TransactionOptions = {
  gasLimit?: number; // Max gas units to use
  maxFeePerGas?: bigint; // Max total fee per gas (EIP-1559)
  maxPriorityFeePerGas?: bigint; // Tip to validator
  nonce?: number; // Transaction sequence number
};
```

#### How They Work

**Two Separate Layers**:

1. **Solidity Function** (Contract Layer):

```solidity
function pause(string calldata reason) external {
    // Only sees: reason parameter
    // Does NOT see: gas settings
}
```

2. **Transaction Envelope** (Network Layer):

```typescript
{
  to: "0xContract",
  data: encodedCall("Emergency"),  // ← Solidity sees this
  gasLimit: 100000,                // ← Network sees this
  maxFeePerGas: 50 gwei,           // ← Network sees this
  nonce: 42                        // ← Network sees this
}
```

#### Why Options Matter

**Without Options** (Auto Mode):

```typescript
await sbirr.contract.pause({ reason: "Emergency" });
// ✅ Works fine 95% of the time
// ❌ During congestion: transaction stuck
// ❌ Can't prioritize urgent operations
```

**With Options** (Manual Control):

```typescript
await sbirr.contract.pause({
  reason: "Emergency",
  options: {
    gasLimit: 150000,
    maxFeePerGas: ethers.parseUnits("100", "gwei"), // High priority
  },
});
// ✅ Fast execution during emergestion
// ✅ Predictable costs
// ✅ Full control
```

---

## Configuration

### Network Selection

The SDK supports three network types: production (Polygon mainnet), testing (Polygon Amoy testnet), and local development (Hardhat node).

**Production - Polygon Mainnet:**

```typescript
const sbirr = new StableBirr({
  network: "polygon",
  rpcUrl: "https://polygon-rpc.com",
  privateKey: process.env.PRIVATE_KEY,
});
```

This connects to the real Polygon blockchain where transactions cost actual MATIC and involve real money. Deploy here when you're ready for production.

**Testing - Polygon Amoy Testnet:**

```typescript
const sbirrTest = new StableBirr({
  network: "amoy",
  rpcUrl: "https://rpc-amoy.polygon.technology",
  privateKey: process.env.TEST_PRIVATE_KEY,
});
```

Amoy is Polygon's testnet. Transactions are free (get test MATIC from faucets) but the tokens have no value. Perfect for testing your integration before going live.

**Local Development - Hardhat:**

```typescript
const sbirrLocal = new StableBirr({
  network: "local",
  rpcUrl: "http://127.0.0.1:8545",
  privateKey:
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
});
```

Run `npx hardhat node` to spin up a local blockchain on your machine. Instant transactions, no gas costs, full control. The private key shown is Hardhat's default test account #0 - safe locally, never use on mainnet.

### RPC Providers

RPC (Remote Procedure Call) providers are the nodes you connect to for reading/writing blockchain data. Think of them like database servers.

**Public RPCs (Free but limited):**

```typescript
const sbirr = new StableBirr({
  network: "polygon",
  // Uses default public RPC
});
```

Public RPCs are free but have rate limits (requests per second). Fine for development, but production apps will hit limits quickly.

**Private RPCs (Recommended for production):**

Private RPC services give you dedicated bandwidth and higher rate limits. You need an API key.

**Alchemy:**

```typescript
const sbirr = new StableBirr({
  network: "polygon",
  rpcUrl: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
});
```

**Infura:**

```typescript
const sbirr = new StableBirr({
  network: "polygon",
  rpcUrl: `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
});
```

**QuickNode:**

```typescript
const sbirr = new StableBirr({
  network: "polygon",
  rpcUrl: process.env.QUICKNODE_URL,
});
```

All three are reliable. Alchemy has better analytics, Infura has more networks, QuickNode is fastest. Choose based on your needs.

### Signer Setup

A "signer" is what signs transactions with your private key. There are three ways to set this up depending on your environment.

#### Private Key (Server-Side)

For backend applications (Node.js, Bun), use a private key from environment variables:

```typescript
const sbirr = new StableBirr({
  network: "polygon",
  privateKey: process.env.PRIVATE_KEY, // Never hardcode!
});
```

The private key must start with `0x` and be 64 hex characters. Store it in `.env` file (add `.env` to `.gitignore`).

#### Read-Only (No Signer)

If you only need to read data (balances, supply, etc.), don't provide a private key:

```typescript
const sbirr = new StableBirr({
  network: "polygon",
  rpcUrl: "https://polygon-rpc.com",
  // No privateKey = read-only mode
});

// ✅ Works - reading is free
const balance = await sbirr.contract.getBalance("0x...");

// ❌ Throws ValidationError - writing needs a signer
await sbirr.contract.mint({ ... });
```

Read operations don't cost gas and don't need a signer.

#### Browser Wallet (Client-Side)

For web apps, connect to the user's MetaMask or other browser wallet:

```typescript
import { ethers } from "@tolbel/sbirr";

// Request wallet connection
const provider = new ethers.BrowserProvider(window.ethereum);
await provider.send("eth_requestAccounts", []);
const signer = await provider.getSigner();

// Initialize SDK with wallet
const sbirr = new StableBirr({
  network: "polygon",
  privateKey: await signer.getAddress(),
});
```

The user signs transactions through their wallet UI. You never see their private key.

---

## Contract Operations

### Minting

Minting creates new SBirr tokens backed by fiat deposits.

#### Basic Mint

```typescript
const tx = await sbirr.contract.mint({
  to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  amount: "15400", // 15,400 SBirr
  usdAmount: "100", // $100 USD deposited
  rate: 154, // 1 USD = 154 ETB
});

await tx.wait();
console.log("Minted 15,400 SBirr");
```

#### How Minting Works

**On-Chain Validation**:

1. **Oracle Check** - Fetches current USD/ETB rate from Chainlink oracle
2. **Rate Tolerance** - Ensures your `rate` is within ±1% of oracle rate
3. **Conversion Math** - Verifies `amount === usdAmount * rate`
4. **Supply Cap** - Ensures total supply doesn't exceed configured cap
5. **Allowance** - Consumes minter's allowance (if not unlimited)

**Solidity Logic** (for reference):

```solidity
function mint(
    address to,
    uint256 amount,
    uint256 usdAmount,
    uint256 rate
) external onlyAuthorizedMinter whenNotPaused {
    // Fetch oracle rate
    (uint256 oracleRate, ) = _fetchOracleRate();

    // Check rate tolerance
    if (!_withinRateTolerance(oracleRate, rate)) {
        revert RateToleranceExceeded(oracleRate, rate);
    }

    // Verify conversion math
    uint256 expectedAmount = usdAmount * oracleRate / 1e18;
    if (amount != expectedAmount) {
        revert AmountMismatch(expectedAmount, amount);
    }

    // Check supply cap
    if (supplyCap != 0 && totalSupply() + amount > supplyCap) {
        revert SupplyCapExceeded();
    }

    // Mint tokens
    _mint(to, amount);
    _consumeMintAllowance(msg.sender, amount);
}
```

When you call `mint()`, the contract first queries Chainlink for the current USD/ETB exchange rate. It then verifies your provided `rate` is within ±1% of the oracle rate (this tolerance is configurable by admin). This prevents minting at stale or manipulated rates. Next, it validates the math: `amount` must exactly equal `usdAmount × rate`. If you claim $100 was deposited at 154 ETB/USD, you must mint exactly 15,400 SBirr - not 15,399 or 15,401. The contract also checks that minting won't exceed the configured supply cap (if one is set) and that your minter account has sufficient allowance remaining. Only after all these validations pass does it mint the tokens and emit a `Minted` event with full audit details (recipient, amounts, rate, timestamp).

#### Advanced Mint with Options

```typescript
const tx = await sbirr.contract.mint({
  to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  amount: "15400",
  usdAmount: "100",
  rate: 154,
  options: {
    gasLimit: 250000,
    maxFeePerGas: ethers.parseUnits("100", "gwei"),
  },
});
```

#### Error Handling

```typescript
try {
  await sbirr.contract.mint({ to, amount, usdAmount, rate });
} catch (error) {
  if (error instanceof ValidationError) {
    // Client-side validation failed
    console.error("Invalid parameters:", error.details);
  } else if (error instanceof ContractError) {
    // On-chain validation failed
    if (error.message.includes("RateToleranceExceeded")) {
      console.error("Rate mismatch with oracle");
    } else if (error.message.includes("SupplyCapExceeded")) {
      console.error("Would exceed supply cap");
    }
  }
}
```

The SDK performs client-side validation before submitting transactions to the blockchain. This catches obvious errors like invalid addresses, negative amounts, or malformed parameters, saving you gas by preventing failed transactions. If client-side validation passes but the transaction reverts on-chain, you'll receive a `ContractError` containing the revert reason from the smart contract. Common on-chain failures include: rate tolerance exceeded (your rate differs too much from the oracle's current rate), supply cap exceeded (minting would push total supply over the configured limit), insufficient minter allowance (you've used up your minting quota), or the contract being paused.

### Burning

Burning destroys SBirr tokens during redemptions.

#### Basic Burn

```typescript
const tx = await sbirr.contract.burn({
  from: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  amount: "500",
  merchantId: "MERCHANT-001",
});

await tx.wait();
console.log("Burned 500 SBirr");
```

#### Burn with Merchant Tracking

```typescript
// Merchant payout
const tx = await sbirr.contract.burn({
  from: userAddress,
  amount: "15400",
  merchantId: `PAYOUT-${Date.now()}`,
  options: {
    gasLimit: 200000,
  },
});

// Record in database
await db.payouts.create({
  txHash: tx.hash,
  merchantId: `PAYOUT-${Date.now()}`,
  amount: "15400",
  timestamp: new Date(),
});
```

Burning removes SBirr tokens from circulation when users redeem them for fiat currency. The `merchantId` parameter is crucial for audit trails - it links the on-chain burn to your off-chain payment record. When a user cashes out, you burn their tokens and record the `merchantId` so you can later prove which blockchain transaction corresponds to which bank payout. The contract verifies the burner has sufficient balance and isn't frozen or blacklisted before destroying the tokens.

### Transfers

Standard ERC-20 transfers with compliance checks.

#### Basic Transfer

```typescript
const tx = await sbirr.contract.transfer({
  to: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
  amount: "100",
});

await tx.wait();
```

Transfers move SBirr between addresses. Before executing, the contract checks that neither sender nor recipient is blacklisted or frozen. This ensures compliance with regulatory requirements - you can't accidentally send tokens to a sanctioned address or receive from a frozen account.

#### Transfer with Gas Control

```typescript
// Low-priority transfer (save on gas)
const tx = await sbirr.contract.transfer({
  to: recipientAddress,
  amount: "100",
  options: {
    maxFeePerGas: ethers.parseUnits("30", "gwei"), // Low fee
  },
});
```

For non-urgent transfers, set a lower `maxFeePerGas` to save money. The transaction waits in the mempool until gas prices drop to your level, then gets confirmed. During off-peak hours, this saves costs on high-volume operations.

### Compliance Controls

#### Blacklist Management

**Blacklist an Address**:

```typescript
await sbirr.contract.blacklist({
  account: "0xSuspiciousAddress",
});

// Check status
const isBlacklisted = await sbirr.contract.isBlacklisted("0xSuspiciousAddress");
console.log("Blacklisted:", isBlacklisted); // true
```

**Remove from Blacklist**:

```typescript
await sbirr.contract.unblacklist({
  account: "0xSuspiciousAddress",
});
```

Blacklisting permanently blocks an address from all SBirr operations - they can't send, receive, mint, or burn. This is for addresses confirmed as malicious (scammers, sanctioned entities). Unlike freezing, blacklisting has no `reason` parameter because it's permanent and doesn't require case tracking.

#### Freeze Controls

**Freeze Account** (Compliance Hold):

```typescript
await sbirr.contract.freeze({
  account: "0xUnderInvestigation",
  reason: "AML-Investigation-Case-42",
});

// Verify frozen
const isFrozen = await sbirr.contract.isFrozen("0xUnderInvestigation");
console.log("Frozen:", isFrozen); // true
```

Freezing temporarily locks an account during investigations. The frozen address can't send or receive tokens, but the freeze is reversible. The `reason` parameter creates an audit trail - you must document why each freeze happened (e.g., "AML-Investigation-Case-42"). This is for compliance holds, suspicious activity investigations, or court orders. Unlike blacklisting, freezing is temporary and requires justification.

**Unfreeze Account**:

```typescript
await sbirr.contract.unfreeze({
  account: "0xUnderInvestigation",
  reason: "Case-42-Resolved-Cleared",
});
```

When unfreezing, provide a `reason` explaining the resolution. This completes the audit trail showing why the account was frozen and why it's now cleared.

**Wipe Frozen Balance** (Court Order):

```typescript
// Only works on frozen accounts
await sbirr.contract.wipeFrozenBalance({
  account: "0xFrozenAccount",
  caseId: "Court-Order-99",
});
```

Wiping destroys all tokens in a frozen account. This is irreversible and only works on accounts that are already frozen. It's used for court-ordered asset seizures or when tokens are confirmed as proceeds of crime. The `caseId` links the wipe to legal documentation.

### Governance

#### Pause/Unpause Contract

```typescript
// Emergency pause
await sbirr.contract.pause({
  reason: "Security-Incident-2024-11-25",
  options: {
    maxFeePerGas: ethers.parseUnits("200", "gwei"), // High priority
  },
});

// Resume operations
await sbirr.contract.unpause({
  reason: "Incident-Resolved-Systems-Normal",
});
```

Pausing halts all token operations (minting, burning, transfers) across the entire contract. This is an emergency kill switch for security incidents, oracle failures, or regulatory compliance issues. When pausing during an emergency, set high gas (`maxFeePerGas: 200 gwei`) to ensure the transaction confirms immediately - you can't afford to wait during a security breach. The `reason` parameter documents what triggered the pause for audit and incident response purposes.

#### Update Oracle

```typescript
await sbirr.contract.updateFxOracle({
  oracle: "0xNewChainlinkOracleAddress",
});
```

The oracle provides USD/ETB exchange rates for minting. If the current oracle becomes unreliable or Chainlink deploys a new version, you can switch to a different oracle address. This is a critical governance function - using a bad oracle could allow minting at incorrect rates.

#### Configure Minter

````typescript
// Grant minting rights
await sbirr.contract.configureMinter({
  minter: "0xTreasuryWallet",
  allowance: "1000000", // 1M SBirr allowance
  canBurn: true, // Can also burn
});

// Check allowance
const allowance = await sbirr.contract.minterAllowance("0xTreasuryWallet");
console.log("Remaining allowance:", allowance);

// Remove minter
await sbirr.contract.removeMinter({
  minter: "0xTreasuryWallet",
});

Minters are authorized addresses that can create new SBirr tokens. Each minter has an allowance (quota) limiting how many tokens they can mint. Setting `allowance: "1000000"` means this minter can create up to 1M SBirr before needing their allowance refreshed. The `canBurn` flag determines if the minter can also destroy tokens. Treasury wallets typically have both permissions, while third-party integrations might only be allowed to mint. Allowances prevent a compromised minter key from inflating the entire supply - even if an attacker gets the key, they can only mint up to the remaining allowance.

---

## Advanced Topics

### Transaction Options Deep Dive

#### Gas Limit

**What it is**: Maximum gas units your transaction can consume.

```typescript
// Auto-estimated (default)
await sbirr.contract.mint({ to, amount, usdAmount, rate });

// Manual override
await sbirr.contract.mint({
  to,
  amount,
  usdAmount,
  rate,
  options: { gasLimit: 300000 },
});
````

**When to set manually**:

- Complex operations that might fail estimation
- Want to ensure transaction doesn't run out of gas
- Testing gas consumption

**Risks**:

- Too low: Transaction fails mid-execution (you still pay gas!)
- Too high: No risk (you only pay for gas used)

The SDK auto-estimates gas by simulating the transaction. This works for most cases, but complex operations or edge cases might need manual overrides. If you set `gasLimit` too low, the transaction runs out of gas mid-execution and reverts - but you still pay for all the gas consumed up to the limit. If you set it too high, you only pay for the actual gas used, so there's no penalty for overestimating.

#### Gas Price (EIP-1559)

**What it is**: How much you pay per gas unit.

```typescript
await sbirr.contract.mint({
  to,
  amount,
  usdAmount,
  rate,
  options: {
    maxFeePerGas: ethers.parseUnits("100", "gwei"), // Total max
    maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"), // Tip to validator
  },
});
```

**Calculation**:

```
Total Fee = gasUsed × (baseFee + priorityFee)
           ↑          ↑         ↑
        Actual    Network   Your tip
         usage    demand
```

**When to adjust**:

- **High priority**: Emergency pause, urgent compliance action
- **Low priority**: Routine operations, can wait for low gas
- **Cost control**: Set max budget for transaction

Polygon uses EIP-1559 gas pricing. The `baseFee` is determined by network congestion and burns automatically. The `priorityFee` (tip) goes to validators and incentivizes them to include your transaction. Setting `maxFeePerGas: 100 gwei` means you'll pay up to 100 gwei per gas unit total (base + priority), but if the base fee is only 30 gwei, you'll pay 30 + your priority fee. The `maxPriorityFeePerGas` caps how much you're willing to tip validators - during congestion, higher tips get faster confirmation.

#### Nonce Management

**What it is**: Transaction sequence number for your account.

```typescript
// Auto-managed (default)
await sbirr.contract.transfer({ to, amount });

// Manual nonce (advanced)
const nonce = await sbirr.contract.provider.getTransactionCount(myAddress);
await sbirr.contract.transfer({
  to,
  amount,
  options: { nonce },
});
```

Nonces ensure transactions execute in order. Each transaction from your address must have a sequential nonce (0, 1, 2, 3...). The SDK auto-fetches the next nonce, which works for most cases. Manual nonce management is needed for: (1) sending multiple transactions in parallel without waiting for confirmations, (2) replacing stuck transactions by resubmitting with the same nonce but higher gas, or (3) canceling transactions by sending a zero-value transfer to yourself with the same nonce. If you mess up nonces, transactions will get stuck waiting for missing sequence numbers.

**When to set manually**:

- Replacing stuck transactions
- Batch operations requiring specific order
- Advanced transaction management

### Error Handling

#### Error Types

**1. ValidationError** - Client-side validation failed:

```typescript
try {
  await sbirr.contract.mint({
    to: "invalid-address", // ❌ Not a valid address
    amount: "15400",
    usdAmount: "100",
    rate: 154,
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error("Validation failed:", error.details);
    // Fix parameters and retry
  }
}
```

**2. ContractError** - Blockchain execution failed:

```typescript
try {
  await sbirr.contract.mint({ to, amount, usdAmount, rate });
} catch (error) {
  if (error instanceof ContractError) {
    // Parse revert reason
    if (error.message.includes("RateToleranceExceeded")) {
      console.error("Oracle rate mismatch");
    } else if (error.message.includes("NotAuthorizedMinter")) {
      console.error("No minting permission");
    }
  }
}
```

**3. NetworkError** - RPC/network issues:

```typescript
try {
  await sbirr.contract.getBalance(address);
} catch (error) {
  if (error.message.includes("network")) {
    console.error("RPC connection failed");
    // Retry with backoff
  }
}
```

#### Comprehensive Error Handling

```typescript
async function safeMint(params: MintParams) {
  let retries = 3;

  while (retries > 0) {
    try {
      const tx = await sbirr.contract.mint(params);
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        return { success: true, txHash: tx.hash };
      } else {
        return { success: false, error: "Transaction failed" };
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        // Don't retry validation errors
        return { success: false, error: error.message };
      } else if (error instanceof ContractError) {
        // Check if retryable
        if (error.message.includes("nonce")) {
          retries--;
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        return { success: false, error: error.message };
      } else {
        // Network error - retry
        retries--;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  return { success: false, error: "Max retries exceeded" };
}
```

### Event Listening

#### Listen for Mints

For event listening, you need to access the underlying ethers contract since the SDK doesn't wrap event listeners:

```typescript
// Access the raw ethers contract for events
const contract = sbirr.contract.contract;

// Listen for Minted events
contract.on("Minted", (to, amount, usdAmount, rate, timestamp, event) => {
  console.log("New mint detected!");
  console.log("Recipient:", to);
  console.log("Amount:", ethers.formatUnits(amount, 18), "SBirr");
  console.log("USD:", ethers.formatUnits(usdAmount, 18));
  console.log("Rate:", ethers.formatUnits(rate, 18));
  console.log("Tx:", event.log.transactionHash);
});

// Listen once
contract.once("Minted", (to, amount) => {
  console.log("First mint:", to, amount);
});

// Stop listening
contract.removeAllListeners("Minted");
```

#### Query Historical Events

```typescript
// Access raw contract for event queries
const contract = sbirr.contract.contract;

// Get all mints in last 1000 blocks
const filter = contract.filters.Minted();
const events = await contract.queryFilter(filter, -1000);

for (const event of events) {
  console.log("Mint:", {
    to: event.args.to,
    amount: ethers.formatUnits(event.args.amount, 18),
    block: event.blockNumber,
    tx: event.transactionHash,
  });
}
```

### Batch Operations

#### Multiple Transfers

```typescript
const recipients = [
  { to: "0xAddress1", amount: "100" },
  { to: "0xAddress2", amount: "200" },
  { to: "0xAddress3", amount: "300" },
];

// Sequential
for (const { to, amount } of recipients) {
  const tx = await sbirr.contract.transfer({ to, amount });
  await tx.wait();
  console.log("Transferred", amount, "to", to);
}

// Parallel (careful with nonce!)
const nonce = await sbirr.contract.provider.getTransactionCount(myAddress);
const txs = await Promise.all(
  recipients.map(({ to, amount }, i) =>
    sbirr.contract.transfer({
      to,
      amount,
      options: { nonce: nonce + i },
    })
  )
);

// Wait for all
const receipts = await Promise.all(txs.map((tx) => tx.wait()));
console.log("All transfers complete");
```

---

## Runtime-Specific Guides

### Node.js Examples

#### Express API Server

```typescript
import express from "express";
import StableBirr from "@tolbel/sbirr";

const app = express();
app.use(express.json());

const sbirr = new StableBirr({
  network: "polygon",
  rpcUrl: process.env.POLYGON_RPC_URL,
  privateKey: process.env.PRIVATE_KEY,
});

app.post("/api/mint", async (req, res) => {
  try {
    const { to, amount, usdAmount, rate } = req.body;

    const tx = await sbirr.contract.mint({
      to,
      amount,
      usdAmount,
      rate,
    });

    res.json({
      success: true,
      txHash: tx.hash,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/api/balance/:address", async (req, res) => {
  const balance = await sbirr.contract.getBalance(req.params.address);
  res.json({ balance });
});

app.listen(3000, () => {
  console.log("API server running on port 3000");
});
```

#### CLI Tool

```typescript
#!/usr/bin/env node
import { Command } from "commander";
import StableBirr from "@tolbel/sbirr";

const program = new Command();

program.name("sbirr").description("StableBirr CLI").version("1.0.0");

program
  .command("balance <address>")
  .description("Get SBirr balance")
  .action(async (address) => {
    const sbirr = new StableBirr({
      network: "polygon",
      rpcUrl: process.env.POLYGON_RPC_URL,
    });

    const balance = await sbirr.contract.getBalance(address);
    console.log(`Balance: ${balance} SBirr`);
  });

program
  .command("mint <to> <amount> <usdAmount> <rate>")
  .description("Mint SBirr tokens")
  .action(async (to, amount, usdAmount, rate) => {
    const sbirr = new StableBirr({
      network: "polygon",
      rpcUrl: process.env.POLYGON_RPC_URL,
      privateKey: process.env.PRIVATE_KEY,
    });

    const tx = await sbirr.contract.mint({
      to,
      amount,
      usdAmount,
      rate: parseFloat(rate),
    });

    console.log("Transaction:", tx.hash);
    await tx.wait();
    console.log("Minted successfully!");
  });

program.parse();
```

### Bun Examples

#### High-Performance Server

```typescript
import StableBirr from "@tolbel/sbirr";

const sbirr = new StableBirr({
  network: "polygon",
  rpcUrl: Bun.env.POLYGON_RPC_URL,
  privateKey: Bun.env.PRIVATE_KEY,
});

Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/balance" && req.method === "GET") {
      const address = url.searchParams.get("address");
      const balance = await sbirr.contract.getBalance(address);

      return new Response(JSON.stringify({ balance }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/mint" && req.method === "POST") {
      const body = await req.json();
      const tx = await sbirr.contract.mint(body);

      return new Response(JSON.stringify({ txHash: tx.hash }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log("Bun server running on http://localhost:3000");
```

### Deno Examples

#### Deno Deploy Edge Function

```typescript
import StableBirr from "npm:@tolbel/sbirr";

const sbirr = new StableBirr({
  network: "polygon",
  rpcUrl: Deno.env.get("POLYGON_RPC_URL"),
});

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/supply") {
    const supply = await sbirr.contract.getTotalSupply();
    return new Response(JSON.stringify({ supply }), {
      headers: { "content-type": "application/json" },
    });
  }

  return new Response("Not found", { status: 404 });
});
```

### Browser Examples

#### React Hook

```typescript
import { useState, useEffect } from "react";
import StableBirr, { ethers } from "@tolbel/sbirr";

export function useStableBirr() {
  const [sdk, setSdk] = useState<StableBirr | null>(null);
  const [address, setAddress] = useState<string>("");

  useEffect(() => {
    async function init() {
      if (!window.ethereum) return;

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();

      const instance = new StableBirr({
        network: "polygon",
        privateKey: addr,
      });

      setSdk(instance);
      setAddress(addr);
    }

    init();
  }, []);

  return { sdk, address };
}

// Usage in component
function App() {
  const { sdk, address } = useStableBirr();
  const [balance, setBalance] = useState("0");

  useEffect(() => {
    if (sdk && address) {
      sbirr.contract.getBalance(address).then(setBalance);
    }
  }, [sdk, address]);

  return (
    <div>
      <h1>StableBirr Balance</h1>
      <p>Address: {address}</p>
      <p>Balance: {balance} SBirr</p>
    </div>
  );
}
```

---

## Security Best Practices

### Private Key Management

❌ **NEVER DO THIS**:

```typescript
const sbirr = new StableBirr({
  privateKey:
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
});
```

✅ **DO THIS**:

```typescript
// Environment variables
const sbirr = new StableBirr({
  privateKey: process.env.PRIVATE_KEY,
});

// AWS Secrets Manager
import { SecretsManager } from "@aws-sdk/client-secrets-manager";
const client = new SecretsManager({ region: "us-east-1" });
const secret = await client.getSecretValue({ SecretId: "prod/sbirr/key" });
const sbirr = new StableBirr({
  privateKey: JSON.parse(secret.SecretString).privateKey,
});

// Hardware wallet (Ledger)
import { LedgerSigner } from "@ethersproject/hardware-wallets";
const signer = new LedgerSigner(provider);
```

### Input Validation

```typescript
import { z } from "zod";

const MintRequestSchema = z.object({
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string().regex(/^\d+(\.\d+)?$/),
  usdAmount: z.string().regex(/^\d+(\.\d+)?$/),
  rate: z.number().positive(),
});

// Validate before SDK call
const validated = MintRequestSchema.parse(userInput);
await sbirr.contract.mint(validated);
```

### Rate Limiting

```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
});

app.use("/api/", limiter);
```

### Transaction Monitoring

```typescript
// Access raw contract for event monitoring
const contract = sbirr.contract.contract;

// Monitor for suspicious activity
contract.on("Transfer", (from, to, amount, event) => {
  const amountEth = ethers.formatUnits(amount, 18);

  if (parseFloat(amountEth) > 100000) {
    // Alert on large transfers
    console.warn("Large transfer detected:", {
      from,
      to,
      amount: amountEth,
      tx: event.log.transactionHash,
    });

    // Send alert to monitoring system
    alertService.send({
      severity: "high",
      message: `Large transfer: ${amountEth} SBirr`,
    });
  }
});
```

Transaction options control how the Polygon network processes your transaction, not what the Solidity contract does. The `gasLimit` sets the maximum gas units the transaction can consume - if execution uses less, you only pay for what's actually used. The `maxFeePerGas` caps the total fee you're willing to pay per gas unit (this includes both the base fee and priority fee). During network congestion, setting a higher `maxFeePerGas` gets your transaction confirmed faster because validators prioritize higher-paying transactions. For urgent operations like emergency pauses, set high gas to ensure fast confirmation. For routine mints, you can set lower gas and wait longer.

---

## Troubleshooting

### Common Issues

#### "Signer required for minting"

**Problem**: Trying to call privileged function without private key.

**Solution**:

```typescript
const sbirr = new StableBirr({
  network: "polygon",
  privateKey: process.env.PRIVATE_KEY, // Add this
});
```

#### "Rate tolerance exceeded"

**Problem**: Your rate differs too much from oracle rate.

**Solution**:

```typescript
// Fetch current oracle rate first
const oracleRate = await sbirr.contract.currentOracleRate();
const rateEth = parseFloat(ethers.formatUnits(oracleRate, 18));

// Use oracle rate
await sbirr.contract.mint({
  to,
  amount,
  usdAmount,
  rate: rateEth, // Use oracle rate
});
```

#### "Nonce too low"

**Problem**: Transaction nonce already used.

**Solution**:

```typescript
// Get latest nonce
const nonce = await sbirr.contract.provider.getTransactionCount(
  address,
  "latest"
);

await sbirr.contract.mint({
  to,
  amount,
  usdAmount,
  rate,
  options: { nonce },
});
```

Nonces ensure transactions execute in order. Each transaction from your address must have a sequential nonce (0, 1, 2, 3...). The SDK auto-fetches the next nonce, which works for most cases. Manual nonce management is needed for: (1) sending multiple transactions in parallel without waiting for confirmations, (2) replacing stuck transactions by resubmitting with the same nonce but higher gas, or (3) canceling transactions by sending a zero-value transfer to yourself with the same nonce. If you mess up nonces, transactions will get stuck waiting for missing sequence numbers.

### Error Handlingsufficient funds for gas"

**Problem**: Not enough MATIC for gas fees.

**Solution**:

```typescript
// Check MATIC balance
const balance = await provider.getBalance(address);
console.log("MATIC:", ethers.formatEther(balance));

// Get MATIC from faucet (testnet) or exchange (mainnet)
```

---

## API Reference

### StableBirr Class

#### Constructor

```typescript
new StableBirr(config: StableBirrConfig)
```

**Parameters**:

- `config.network?` - Network name (`"polygon"` | `"amoy"` | `"local"`)
- `config.rpcUrl?` - Custom RPC endpoint
- `config.privateKey?` - Private key for signing (optional for read-only)
- `config.contractAddress?` - Custom contract address

#### Properties

- `sbirr.contract` - Contract resource for blockchain operations
- `sbirr.nbe` - NBE resource for regulatory APIs

### Contract Resource

#### Minting

**`contract.mint(params: MintParams): Promise<TransactionResponse>`**

Creates new SBirr tokens.

**Parameters**:

```typescript
{
  to: string;           // Recipient address
  amount: string;       // SBirr amount (18 decimals)
  usdAmount: string;    // USD deposited (18 decimals)
  rate: number;         // Exchange rate
  options?: {
    gasLimit?: number;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
    nonce?: number;
  }
}
```

**Returns**: `Promise<TransactionResponse>`

**Throws**:

- `ValidationError` - Invalid parameters
- `ContractError` - On-chain validation failed

---

## Examples

### Complete Treasury Operation

```typescript
import StableBirr, { ethers } from "@tolbel/sbirr";

async function processMint(depositInfo: {
  userId: string;
  usdAmount: number;
  recipientAddress: string;
}) {
  // 1. Initialize SDK
  const sbirr = new StableBirr({
    network: "polygon",
    rpcUrl: process.env.POLYGON_RPC_URL,
    privateKey: process.env.TREASURY_PRIVATE_KEY,
  });

  // 2. Fetch current exchange rate
  const oracleRate = await sbirr.contract.currentOracleRate();
  const rate = parseFloat(ethers.formatUnits(oracleRate, 18));

  // 3. Calculate SBirr amount
  const sbirrAmount = depositInfo.usdAmount * rate;

  // 4. Mint tokens
  const tx = await sbirr.contract.mint({
    to: depositInfo.recipientAddress,
    amount: sbirrAmount.toString(),
    usdAmount: depositInfo.usdAmount.toString(),
    rate,
    options: {
      gasLimit: 250000,
      maxFeePerGas: ethers.parseUnits("50", "gwei"),
    },
  });

  console.log("Transaction submitted:", tx.hash);

  // 5. Wait for confirmation
  const receipt = await tx.wait();

  if (receipt.status === 1) {
    console.log("Mint successful!");

    // 6. Report to NBE
    await sbirr.nbe.reportTransaction({
      txHash: tx.hash,
      amount: sbirrAmount.toString(),
      usdAmount: depositInfo.usdAmount.toString(),
      type: "MINT",
      timestamp: Date.now(),
    });

    return {
      success: true,
      txHash: tx.hash,
      amount: sbirrAmount,
    };
  } else {
    throw new Error("Transaction failed");
  }
}

// Usage
processMint({
  userId: "USER-123",
  usdAmount: 100,
  recipientAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
})
  .then((result) => console.log("Success:", result))
  .catch((error) => console.error("Error:", error));
```

---

## License

MIT © Schnl (tolbel LLC)

---

## Support

- **Documentation**: [https://github.com/kibrukuture/sbirr](https://github.com/kibrukuture/sbirr)
- **Issues**: [GitHub Issues](https://github.com/kibrukuture/sbirr/issues)
