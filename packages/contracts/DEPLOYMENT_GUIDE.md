# StableBirr Deployment - Complete Guide & All Problems Encountered

## 🚨 CRITICAL: Read This ENTIRE Document Before Deploying

This document contains ALL problems we encountered and their solutions. Follow this EXACTLY to avoid issues.

---

## ❌ Problem 1: Oracle Requirement (FIXED)

### What Happened:

The contract was trying to get the exchange rate from an "oracle" (a separate smart contract that provides price data). But we never deployed or configured this oracle contract, so it was set to `address(0)` (empty address).

### Why This Was a Problem:

When you tried to mint tokens, the contract tried to:

1. Call the oracle to get the current ETB/USD exchange rate
2. But the oracle address was `address(0)` (doesn't exist)
3. So the contract reverted with error `0xd93c0665` which means "OracleNotConfigured"

**In simple terms:** The contract was asking "What's the exchange rate?" to nobody, so it failed.

### Why We Had an Oracle in the First Place:

Originally, we thought the contract should validate the exchange rate on-chain by comparing what the backend says with what an oracle says. This is how some DeFi protocols work (like Chainlink price feeds).

### Why We Removed It:

**We realized this is NOT how USDC/USDT work!**

- USDC doesn't use an oracle - Circle's backend just mints the amount it calculates
- The backend is TRUSTED to provide correct values
- Oracle adds complexity and cost for no benefit
- NBE already controls the exchange rate via their API

### What We Changed:

**BEFORE (with oracle):**

```
User deposits $10 USD
→ Backend calculates: $10 × 150 = 1,500 SBirr
→ Backend calls: mint(user, 1500, 10, 150)
→ Contract asks oracle: "What's the rate?"
→ Oracle says: "150 ETB/USD"
→ Contract validates: backend's 150 matches oracle's 150 ✓
→ Contract mints 1,500 SBirr
```

**AFTER (without oracle):**

```
User deposits $10 USD
→ Backend gets rate from NBE API: 150 ETB/USD
→ Backend calculates: $10 × 150 = 1,500 SBirr
→ Backend calls: mint(user, 1500, 10, 150)
→ Contract records everything and mints
→ Done! (No oracle validation needed)
```

### Why This Solution Works:

1. **Backend is already trusted** - Only authorized minters can call mint()
2. **Full audit trail** - All params (amount, usdAmount, rate) recorded on-chain
3. **NBE controls rate** - They set it via API, not on-chain oracle
4. **Simpler and cheaper** - No oracle contract needed, lower gas costs
5. **Same as USDC** - Proven model used by major stablecoins

### Status: ✅ FIXED in current version

---

## ❌ Problem 2: Minter Not Configured (MUST DO)

### What Happened:

The contract was deployed, but nobody was authorized to mint tokens yet.

### Why This Was a Problem:

The `mint()` function has a security check:

```solidity
function mint(...) external onlyAuthorizedMinter {
    // Only authorized minters can call this
}
```

When you tried to mint without being configured as a minter, the contract said "You're not authorized!" and reverted.

### Why Minters Exist:

**Security!** We don't want just anyone to be able to create new SBirr tokens out of thin air. Only trusted addresses (like Schnl's backend) should be able to mint.

Think of it like a printing press for money - you don't want random people having access to it!

### What "Configuring a Minter" Means:

When you run the setup script, it tells the contract:

- "This address (0x96b5...34C) is allowed to mint tokens"
- "They can mint unlimited amount" (or you can set a limit)
- "They can also burn tokens" (for redemptions)

### Why You Must Do This After Deployment:

The contract doesn't know who should be a minter when it's first deployed. The admin (you) must explicitly authorize minters as a security measure.

**It's like:** You bought a new safe, but you haven't given anyone the combination yet. You need to explicitly give access to trusted people.

### Solution:

**MUST run after deployment:**

```bash
CONTRACT_ADDRESS=0xYourAddress npx hardhat run scripts/post-deploy-setup-simple.ts --network polygon
```

This configures deployer as authorized minter with unlimited allowance.

### Status: ⚠️ REQUIRED STEP - Do NOT skip!

---

## ❌ Problem 3: Contract Deployed PAUSED (MUST DO)

### What Happened:

When the contract is first deployed, it automatically starts in a "PAUSED" state. This means ALL operations are frozen - nobody can mint, burn, or transfer tokens.

### Why This Was a Problem:

Even after configuring the minter, when you tried to mint tokens, the contract said "Sorry, I'm paused!" and reverted with error "EnforcedPause".

**It's like:** You configured the minter (gave them the key to the printing press), but the printing press itself is turned OFF. You need to turn it ON first!

### Why Contracts Are Paused by Default:

**This is a SECURITY FEATURE!**

When you deploy a new financial contract, you don't want it to be immediately active. Here's why:

1. **Configuration Time** - You need time to set up minters, check settings, verify everything
2. **Safety Check** - If something went wrong during deployment, tokens can't be minted/moved yet
3. **Controlled Launch** - Admin explicitly decides when to "go live"
4. **Emergency Brake** - If there's a problem later, admin can pause again to stop all activity

**Real-world example:** When a new bank opens, they don't let customers in on day 1. They spend time:

- Training staff (configuring minters)
- Testing systems (verifying contract)
- Getting regulatory approval (admin review)
- THEN they open the doors (unpause)

### What "Paused" Means Technically:

The contract has a pause mechanism that blocks these functions:

```solidity
function mint(...) whenNotPaused {
    // Can only run if contract is NOT paused
}

function burn(...) whenNotPaused {
    // Can only run if contract is NOT paused
}

function transfer(...) whenNotPaused {
    // Can only run if contract is NOT paused
}
```

When paused = true, all these functions revert immediately.

### Why You Must Unpause:

The contract will NEVER work until you explicitly unpause it. This is intentional - the admin must make a conscious decision to activate the contract.

### What Unpausing Does:

When you run the unpause script, it:

1. Sets `paused = false` in the contract
2. Records WHO unpaused it (your address)
3. Records WHY you unpaused it ("Initial deployment - ready for production")
4. Emits an event so it's logged on-chain forever

This creates an audit trail showing exactly when and why the contract was activated.

### Solution:

**MUST run after configuring minter:**

```bash
CONTRACT_ADDRESS=0xYourAddress npx hardhat run scripts/unpause.ts --network polygon
```

This unpauses the contract and allows minting.

### Status: ⚠️ REQUIRED STEP - Do NOT skip!

---

## ❌ Problem 4: Cannot Upgrade Proxy (IMPORTANT)

### What Was Wrong:

- We deleted storage variables (fxOracle, rateDeviationToleranceBps, etc.)
- OpenZeppelin upgrades plugin prevents deleting storage variables
- Attempting to upgrade fails with "New storage layout is incompatible"

### Why This Matters:

- **Cannot upgrade old contract** `0xFaa6E8Ee77368613c804f51029CAb30677967F67`
- **Must use new contract** `0xA80E0bFE59546D4f40d96CdAab2701b179C66Be5`
- **Must update all addresses** in SDK, demo, and .env files

### Lesson Learned:

**In upgradeable contracts, NEVER delete storage variables - mark them as unused instead!**

### Status: ⚠️ CANNOT FIX - Must use new deployment

---

## ❌ Problem 5: Compiler Version Mismatch (FIXED)

### What Was Wrong:

- Contract compiled with Solidity 0.8.22
- Hardhat config had wrong version
- Verification on Polygonscan failed

### Solution:

Updated `hardhat.config.ts`:

```typescript
solidity: {
  version: "0.8.22",
  // ...
}
```

### Status: ✅ FIXED

---

## ❌ Problem 6: Etherscan API V1 Deprecated (FIXED)

### What Was Wrong:

- Hardhat config used old Etherscan API format
- Verification failed with "deprecated V1 endpoint"

### Solution:

Updated `hardhat.config.ts`:

```typescript
etherscan: {
  apiKey: process.env.POLYGONSCAN_API_KEY,
}
```

### Status: ✅ FIXED

---

## ✅ CORRECT Deployment Process (Follow This EXACTLY)

### Step 1: Compile

```bash
cd sbirr/packages/contracts
npx hardhat compile
```

**Expected:** "Compiled 44 Solidity files successfully"

---

### Step 2: Deploy

```bash
npx hardhat run scripts/deploy.ts --network polygon
```

**Expected output:**

```
✅ StableBirr deployed!
   Proxy address: 0xA80E0bFE59546D4f40d96CdAab2701b179C66Be5
   Implementation address: 0x...
```

**⚠️ SAVE THE PROXY ADDRESS!**

---

### Step 3: Update Addresses

**Update these files with the NEW proxy address:**

1. `packages/sdk/src/constants/addresses.ts`:

```typescript
export const STABLEBIRR_ADDRESSES = {
  mainnet: "0xA80E0bFE59546D4f40d96CdAab2701b179C66Be5",
  polygon: "0xA80E0bFE59546D4f40d96CdAab2701b179C66Be5",
  // ...
};
```

2. `demo/.env`:

```bash
CONTRACT_ADDRESS=0xA80E0bFE59546D4f40d96CdAab2701b179C66Be5
```

3. `packages/contracts/.env`:

```bash
CONTRACT_ADDRESS=0xA80E0bFE59546D4f40d96CdAab2701b179C66Be5
```

---

### Step 4: Configure Minter (REQUIRED)

```bash
CONTRACT_ADDRESS=0xA80E0bFE59546D4f40d96CdAab2701b179C66Be5 npx hardhat run scripts/post-deploy-setup-simple.ts --network polygon
```

**Expected output:**

```
✅ Minter configured
   Address: 0x96b5586e4040859A60C844d4590a474F04Cde34C
   Allowance: Unlimited
   Can burn: Yes
```

**⚠️ DO NOT SKIP THIS STEP!**

---

### Step 5: Unpause Contract (REQUIRED)

```bash
CONTRACT_ADDRESS=0xA80E0bFE59546D4f40d96CdAab2701b179C66Be5 npx hardhat run scripts/unpause.ts --network polygon
```

**Expected output:**

```
✅ Contract unpaused!
   Paused: false
```

**⚠️ DO NOT SKIP THIS STEP!**

---

### Step 6: Test Minting

```bash
cd ../../demo
bun index.ts
```

**Expected output:**

```
✅ Mint transaction sent!
   Transaction hash: 0x...
   Gas cost: ~0.01 POL
```

---

### Step 7: Verify Contract (Optional)

```bash
cd sbirr/packages/contracts
npx hardhat verify --network polygon <IMPLEMENTATION_ADDRESS>
```

---

## 🔥 Common Errors & Solutions

### Error: "NotAuthorizedMinter"

**Cause:** Minter not configured  
**Solution:** Run Step 4 (configure minter)

### Error: "EnforcedPause"

**Cause:** Contract is paused  
**Solution:** Run Step 5 (unpause contract)

### Error: "OracleNotConfigured" or "0xd93c0665"

**Cause:** Using old oracle-based contract  
**Solution:** Deploy new oracle-free version

### Error: "New storage layout is incompatible"

**Cause:** Trying to upgrade old contract  
**Solution:** Cannot upgrade - must use new deployment

### Error: "Compiler version mismatch"

**Cause:** Wrong Solidity version in hardhat.config.ts  
**Solution:** Use version 0.8.22

---

## 📊 Cost Breakdown

| Action           | POL Cost       | USD Cost   |
| ---------------- | -------------- | ---------- |
| Deploy contract  | ~0.5 POL       | ~$0.32     |
| Configure minter | ~0.01 POL      | ~$0.006    |
| Unpause          | ~0.005 POL     | ~$0.003    |
| Test mint        | ~0.01 POL      | ~$0.006    |
| **Total**        | **~0.525 POL** | **~$0.34** |

---

## ✅ Final Checklist

Before considering deployment complete, verify:

- [ ] Contract compiled successfully
- [ ] Contract deployed to Polygon mainnet
- [ ] Proxy address saved
- [ ] All addresses updated (SDK, demo, .env)
- [ ] Minter configured
- [ ] Contract unpaused
- [ ] Test mint successful
- [ ] Tokens visible in MetaMask
- [ ] Contract verified on Polygonscan (optional)

---

## 🚨 CRITICAL REMINDERS

1. **ALWAYS configure minter after deployment** (Step 4)
2. **ALWAYS unpause contract after configuring minter** (Step 5)
3. **NEVER skip these steps** - minting will fail!
4. **Contract is paused by default** - this is a security feature
5. **Cannot upgrade old contract** - must use new deployment
6. **Save proxy address** - this is your contract address
7. **Update all .env files** - SDK, demo, and contracts

---

## 📝 New Contract Details

**Current Deployed Contract:**

- **Proxy:** `0xA80E0bFE59546D4f40d96CdAab2701b179C66Be5`
- **Network:** Polygon PoS Mainnet
- **Version:** Oracle-free (backend provides all params)
- **Status:** ✅ Deployed, configured, and ready

**Old Contract (DO NOT USE):**

- **Proxy:** `0xFaa6E8Ee77368613c804f51029CAb30677967F67`
- **Status:** ❌ Cannot be upgraded (storage layout incompatible)

---

## 🎯 Summary

**What We Fixed:**

- ✅ Removed oracle requirement
- ✅ Simplified mint function
- ✅ Backend provides all parameters
- ✅ Full audit trail maintained

**What You Must Do:**

1. ⚠️ Configure minter (REQUIRED)
2. ⚠️ Unpause contract (REQUIRED)
3. ⚠️ Update all addresses (REQUIRED)

**Follow these steps EXACTLY and deployment will succeed!**
