# StableBirr Oracle Removal Analysis

## Current Oracle Dependencies

### Files Involved:

1. `StableBirr.sol` - Main contract (initialize function)
2. `StableBirrOperations.sol` - Mint function (uses oracle)
3. `StableBirrOracle.sol` - Oracle management
4. `StableBirrCompliance.sol` - Inherits from Oracle
5. `StableBirrBase.sol` - Base contract with oracle state

---

## Oracle Code in Mint Function (Lines 52-103)

**Current mint function does:**

```solidity
function mint(address to, uint256 amount, uint256 usdAmount, uint256 rate) {
    // Line 63: Fetch oracle rate
    (uint256 oracleRate, uint256 oracleTimestamp) = _fetchOracleRate();

    // Line 64: Validate oracle rate
    Conversion.validateRate(oracleRate);

    // Line 66-68: Check if manual rate matches oracle rate
    if (!_withinRateTolerance(oracleRate, rate)) {
        revert RateToleranceExceeded(oracleRate, rate);
    }

    // Line 70-73: Calculate expected amount using oracle rate
    uint256 expectedAmount = Conversion.calculateEtbAmount(usdAmount, oracleRate);
    if (amount != expectedAmount) {
        revert AmountMismatch(expectedAmount, amount);
    }

    // Line 99-100: Store oracle rate
    lastOracleRate = oracleRate;
    oracleLastUpdatedAt = oracleTimestamp;
}
```

---

## What Needs to Change

### ❌ REMOVE (Oracle-Related):

1. **Line 63:** `_fetchOracleRate()` call
2. **Line 64:** `Conversion.validateRate()` call
3. **Line 66-68:** Rate tolerance check
4. **Line 70-73:** Amount calculation and validation
5. **Line 99-100:** Oracle rate storage
6. **Parameter:** `uint256 rate` (no longer needed)

### ✅ KEEP (Essential):

1. **Line 58-61:** Address and amount validation
2. **Line 75-80:** Supply cap check
3. **Line 82-93:** Mint record creation
4. **Line 95-97:** Actual minting logic
5. **Line 102:** Minted event

---

## Simplified Mint Function (USDC-Style)

**New mint function should be:**

```solidity
function mint(address to, uint256 amount)
    external override onlyAuthorizedMinter whenNotPaused nonReentrant
{
    // Validation
    if (to == address(0)) revert InvalidAddress();
    if (amount == 0) revert InvalidAmount();
    if (_blacklisted[to]) revert AccountBlacklisted(to);
    if (_frozen[to]) revert AccountFrozenState(to);

    // Supply cap check
    if (supplyCap != 0) {
        uint256 newSupply = totalSupply() + amount;
        if (newSupply > supplyCap) {
            revert SupplyCapExceeded(supplyCap, newSupply);
        }
    }

    // Mint
    _mint(to, amount);
    _consumeMintAllowance(msg.sender, amount);

    emit Minted(to, amount, block.timestamp);
}
```

**Changes:**

- ✅ Removed `usdAmount` parameter (backend calculates)
- ✅ Removed `rate` parameter (backend uses NBE rate)
- ✅ Removed oracle rate fetching
- ✅ Removed rate validation
- ✅ Removed amount calculation
- ✅ Simplified event (no oracle rate)

---

## Files to Modify

### 1. `StableBirrOperations.sol`

- Simplify `mint()` function (remove oracle logic)
- Update `Minted` event
- Remove `MintRecord` oracle fields (optional)

### 2. `StableBirr.sol`

- Remove `oracle` parameter from `initialize()`
- Remove `_setFxOracle()` call

### 3. `StableBirrOracle.sol`

- Can be deleted entirely (no longer needed)

### 4. `StableBirrCompliance.sol`

- Change inheritance from `StableBirrOracle` to `StableBirrBase`

### 5. `interfaces/IStableBirr.sol`

- Update `mint()` signature
- Update `Minted` event signature

---

## Benefits of Removal

✅ **Simpler:** No oracle contract needed  
✅ **Cheaper:** Less gas (no oracle calls)  
✅ **Flexible:** NBE controls rates off-chain  
✅ **Standard:** Same as USDC/USDT model  
✅ **Secure:** Backend validates everything before calling mint

---

## Backend Responsibility

**Schnl backend will:**

1. Get NBE exchange rate via API (e.g., 150 ETB/USD)
2. User deposits $10 USD
3. Backend calculates: $10 × 150 = 1,500 SBirr
4. Backend calls: `mint(userAddress, 1500e18)`
5. Done!

**No on-chain rate conversion needed!**

---

## Next Steps

1. ✅ Analyze code (DONE)
2. ⏳ Create simplified contract versions
3. ⏳ Test simplified contracts
4. ⏳ Deploy new version
5. ⏳ Update SDK

**Estimated changes:** 5 files, ~200 lines removed, contract 40% simpler!
