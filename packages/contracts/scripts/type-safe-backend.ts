/**
 * Type-Safe Backend Example using TypeChain
 *
 * This shows how to get FULL type safety when interacting with your
 * StableBirr contract using TypeChain-generated types.
 */

import { ethers } from "ethers";
import * as dotenv from "dotenv";

// ✅ Import TypeChain-generated types (FULLY TYPE-SAFE!)
import { StableBirr, StableBirr__factory } from "../typechain-types";

dotenv.config();

/**
 * Configuration
 */
const CONFIG = {
  CONTRACT_ADDRESS:
    process.env.CONTRACT_ADDRESS ||
    "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
  RPC_URL: process.env.AMOY_RPC_URL || "http://localhost:8545",
  PRIVATE_KEY:
    process.env.PRIVATE_KEY ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
};

/**
 * Initialize with FULL type safety
 */
function initializeTypeSafeContract() {
  // 1. Create provider
  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);

  // 2. Create signer
  const signer = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);

  // 3. Create TYPED contract instance using TypeChain factory
  const contract: StableBirr = StableBirr__factory.connect(
    CONFIG.CONTRACT_ADDRESS,
    signer
  );

  return { provider, signer, contract };
}

/**
 * Example 1: Type-safe read operations
 */
async function typeSafeRead() {
  console.log("📖 Type-safe reading...\n");

  const { contract, signer } = initializeTypeSafeContract();

  // ✅ FULLY TYPED! Autocomplete works, types are inferred
  const name = await contract.name();
  const symbol = await contract.symbol();
  const totalSupply = await contract.totalSupply();
  const decimals = await contract.decimals();
  const admin = await contract.schnlAdmin();
  const operator = await contract.schnlOperator();
  const isPaused = await contract.paused();

  // ✅ Type-safe balance check
  const myAddress = await signer.getAddress();
  const balance = await contract.balanceOf(myAddress);

  console.log("Contract Info (ALL TYPED!):");
  console.log("  Name:", name); // ← TypeScript knows this is string
  console.log("  Symbol:", symbol);
  console.log("  Decimals:", decimals.toString()); // ← TypeScript knows this is bigint
  console.log("  Total Supply:", ethers.formatEther(totalSupply), symbol);
  console.log("  Admin:", admin);
  console.log("  Operator:", operator);
  console.log("  Paused:", isPaused); // ← TypeScript knows this is boolean
  console.log("  Your Balance:", ethers.formatEther(balance), symbol);
  console.log();

  // ✅ TypeScript will ERROR if you try wrong function name
  // await contract.invalidFunction();  // ← Compile error!

  // ✅ TypeScript will ERROR if you pass wrong parameter type
  // await contract.balanceOf(123);  // ← Compile error! Expects string (address)
}

/**
 * Example 2: Type-safe write operations
 */
async function typeSafeMint(to: string, usdAmount: string) {
  console.log("💰 Type-safe minting...\n");

  const { contract } = initializeTypeSafeContract();

  // Prepare parameters with correct types
  const usdAmountWei = ethers.parseEther(usdAmount);
  const rate = ethers.parseEther("120");
  const etbAmount = BigInt(usdAmount) * 120n * 10n ** 18n;

  console.log("Mint Parameters (ALL TYPED!):");
  console.log("  To:", to);
  console.log("  ETB Amount:", ethers.formatEther(etbAmount));
  console.log("  USD Amount:", usdAmount);
  console.log("  Rate:", "120 ETB/USD");
  console.log();

  // ✅ FULLY TYPED! TypeScript checks all parameters
  const tx = await contract.mint(
    to, // ← Must be string (address)
    etbAmount, // ← Must be bigint
    usdAmountWei, // ← Must be bigint
    rate // ← Must be bigint
  );

  // ✅ TypeScript knows tx is ContractTransactionResponse
  console.log("  Transaction hash:", tx.hash);
  console.log("  Waiting for confirmation...");

  // ✅ TypeScript knows receipt type
  const receipt = await tx.wait();

  if (receipt) {
    console.log("✅ Transaction confirmed!");
    console.log("  Block:", receipt.blockNumber);
    console.log("  Gas used:", receipt.gasUsed.toString());
  }
  console.log();

  // ✅ TypeScript will ERROR if you pass wrong types
  // await contract.mint(to, "wrong", usdAmountWei, rate);  // ← Compile error!
  // await contract.mint(to, etbAmount, usdAmountWei);  // ← Compile error! Missing parameter
}

/**
 * Example 3: Type-safe event listening
 */
async function typeSafeEvents() {
  console.log("👂 Type-safe event listening...\n");

  const { contract } = initializeTypeSafeContract();

  // ✅ FULLY TYPED event filter
  const filter = contract.filters.Minted();

  // ✅ Type-safe event listener
  contract.on(filter, (to, amount, usdAmount, rate, timestamp, event) => {
    console.log("🎉 Minted Event (TYPED!):");
    console.log("  To:", to);
    console.log("  Amount:", ethers.formatEther(amount));
    console.log("  USD:", ethers.formatEther(usdAmount));
    console.log("  Rate:", ethers.formatEther(rate));
    console.log("  Time:", new Date(Number(timestamp) * 1000).toISOString());
    console.log("  Tx:", event.transactionHash);
    console.log();
  });

  console.log("Listening for events... (Press Ctrl+C to stop)");
}

/**
 * Example 4: Type-safe past event queries
 */
async function typeSafePastEvents() {
  console.log("🔍 Type-safe past events...\n");

  const { contract } = initializeTypeSafeContract();

  // ✅ FULLY TYPED filter
  const filter = contract.filters.Minted();

  // ✅ TypeScript knows the event type
  const events = await contract.queryFilter(filter, -1000);

  console.log(`Found ${events.length} events (ALL TYPED!):\n`);

  events.forEach((event, index) => {
    // ✅ TypeScript knows args structure
    const args = event.args;

    console.log(`Event ${index + 1}:`);
    console.log("  To:", args.to); // ← Autocomplete works!
    console.log("  Amount:", ethers.formatEther(args.amount));
    console.log("  USD:", ethers.formatEther(args.usdAmount));
    console.log("  Rate:", ethers.formatEther(args.rate));
    console.log("  Block:", event.blockNumber);
    console.log();
  });
}

/**
 * Example 5: Type-safe admin functions
 */
async function typeSafeAdminFunctions() {
  console.log("⚙️  Type-safe admin functions...\n");

  const { contract } = initializeTypeSafeContract();

  // ✅ Check if paused (typed as boolean)
  const isPaused = await contract.paused();
  console.log("Paused:", isPaused);

  if (isPaused) {
    // ✅ Unpause with typed parameter
    const tx = await contract.unpause("Testing complete");
    await tx.wait();
    console.log("✅ Unpaused!");
  }

  // ✅ Configure minter with typed parameters
  const minterAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const allowance = ethers.parseEther("1000000"); // 1M tokens
  const canBurn = true;

  const tx = await contract.configureMinter(
    minterAddress, // ← Must be string
    allowance, // ← Must be bigint
    canBurn // ← Must be boolean
  );

  await tx.wait();
  console.log("✅ Minter configured!");

  // ✅ Check minter status (typed return values)
  const isMinter = await contract.isMinter(minterAddress);
  const minterAllowance = await contract.minterAllowance(minterAddress);
  const minterCanBurn = await contract.minterCanBurn(minterAddress);

  console.log("\nMinter Status (ALL TYPED!):");
  console.log("  Is Minter:", isMinter);
  console.log("  Allowance:", ethers.formatEther(minterAllowance));
  console.log("  Can Burn:", minterCanBurn);
  console.log();
}

/**
 * Comparison: Type-safe vs Not Type-safe
 */
async function comparison() {
  const { contract } = initializeTypeSafeContract();

  // ❌ OLD WAY (not type-safe)
  // const contract = new ethers.Contract(address, abi, signer);
  // await contract.mint(to, amount, usdAmount, rate);  // No autocomplete, no type checking

  // ✅ NEW WAY (fully type-safe with TypeChain)
  const name = await contract.name(); // ← Autocomplete works!
  const balance = await contract.balanceOf("0x..."); // ← Types enforced!

  // TypeScript catches errors at COMPILE TIME:
  // await contract.invalidFunction();  // ← ERROR: Property 'invalidFunction' does not exist
  // await contract.balanceOf(123);  // ← ERROR: Argument of type 'number' is not assignable to parameter of type 'string'
  // await contract.mint(to, amount);  // ← ERROR: Expected 4 arguments, but got 2
}

/**
 * Main function
 */
async function main() {
  try {
    console.log("🎯 Type-Safe Contract Interaction with TypeChain\n");
    console.log("=".repeat(60));
    console.log();

    // Run examples
    await typeSafeRead();

    // Uncomment to run other examples:
    // await typeSafeMint("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "100");
    // await typeSafePastEvents();
    // await typeSafeAdminFunctions();
    // await typeSafeEvents();  // Runs indefinitely
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export {
  initializeTypeSafeContract,
  typeSafeRead,
  typeSafeMint,
  typeSafeEvents,
  typeSafePastEvents,
  typeSafeAdminFunctions,
};
