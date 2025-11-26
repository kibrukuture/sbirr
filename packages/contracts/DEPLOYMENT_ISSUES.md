# StableBirr Deployment Issues & Solutions

## Issues Encountered During First Deployment

### Issue 1: Contract Verification Failed

**Error:** Compiler version mismatch (0.8.22 vs 0.8.29)
**Root Cause:** Hardhat config had wrong Solidity version
**Solution:** Updated `hardhat.config.ts` to use `0.8.22`
**Fix:** Changed compiler version to match deployed contract

### Issue 2: Etherscan API V1 Deprecated

**Error:** "deprecated V1 endpoint"
**Root Cause:** Hardhat config used old API format
**Solution:** Updated to V2 format: `apiKey: process.env.ETHERSCAN_API_KEY`
**Fix:** Simplified etherscan config in `hardhat.config.ts`

### Issue 3: Minting Failed - Not Authorized

**Error:** `0xd93c0665` (InvalidAmount or NotAuthorizedMinter)
**Root Cause:** Deployer address not configured as authorized minter
**Solution:** Must call `configureMinter()` after deployment
**Fix:** Created `scripts/configure-minter.ts`

### Issue 4: Oracle Not Set

**Error:** Mint reverts because oracle is zero address
**Root Cause:** Deployed with `oracle = ethers.ZeroAddress`
**Solution:** Must set oracle and manual rate after deployment
**Fix:** Created `scripts/configure-oracle.ts`

---

## Required Post-Deployment Steps

After deploying StableBirr contract, you MUST run these configuration steps:

### Step 1: Configure Minter

```bash
npx hardhat run scripts/configure-minter.ts --network polygon
```

**What it does:**

- Authorizes deployer address to mint tokens
- Sets unlimited minting allowance
- Grants burn permission

### Step 2: Configure Oracle

```bash
npx hardhat run scripts/configure-oracle.ts --network polygon
```

**What it does:**

- Sets oracle address (deployer for testing, NBE API for production)
- Sets manual exchange rate (150 ETB/USD)
- Sets rate tolerance (10%)

### Step 3: Verify Contract (Optional)

```bash
npx hardhat verify --network polygon <IMPLEMENTATION_ADDRESS>
```

---

## Automated Post-Deployment Script

See `scripts/post-deploy-setup.ts` for automated configuration.

---

## Cost Breakdown

| Action           | POL Cost      | USD Cost    |
| ---------------- | ------------- | ----------- |
| Deploy contract  | ~0.5 POL      | ~$0.065     |
| Configure minter | ~0.01 POL     | ~$0.006     |
| Configure oracle | ~0.03 POL     | ~$0.02      |
| **Total**        | **~0.54 POL** | **~$0.091** |

---

## For Future Deployments

**Option 1: Include in deploy script**

- Add post-deployment configuration to `scripts/deploy.ts`
- Automatically configure minter and oracle after deployment

**Option 2: Separate setup script**

- Keep deployment and configuration separate
- Run `scripts/post-deploy-setup.ts` after deployment

**Recommendation:** Use Option 1 for production, Option 2 for testing.
