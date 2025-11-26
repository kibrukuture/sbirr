# StableBirr Deployment Checklist (Oracle-Free Version)

## ✅ Pre-Deployment Checklist

- [x] Contract compiles successfully
- [x] Oracle dependencies removed
- [x] Mint function simplified (backend provides all params)
- [x] All access controls intact
- [ ] `.env` file configured with:
  - `PRIVATE_KEY`
  - `POLYGON_RPC_URL`
  - `POLYGONSCAN_API_KEY`

---

## 📝 Deployment Steps

### 1. Compile Contract

```bash
cd sbirr/packages/contracts
npx hardhat compile
```

### 2. Deploy to Polygon Mainnet

```bash
npx hardhat run scripts/deploy.ts --network polygon
```

**Expected output:**

- Proxy address: `0x...`
- Implementation address: `0x...`
- Transaction hash: `0x...`

**Save these addresses!**

### 3. Configure Minter

```bash
npx hardhat run scripts/post-deploy-setup-simple.ts --network polygon
```

**This will:**

- Configure deployer as authorized minter
- Set unlimited allowance
- Grant burn permission

### 4. Unpause Contract

```bash
npx hardhat run scripts/unpause.ts --network polygon
```

Or manually:

```typescript
await contract.unpause("Initial deployment - ready for production");
```

### 5. Verify on Polygonscan

```bash
npx hardhat verify --network polygon <IMPLEMENTATION_ADDRESS>
```

---

## 🧪 Testing After Deployment

### Test Minting

```bash
cd ../../demo
bun index.ts
```

**Expected:**

- ✅ Transaction sent
- ✅ Minted 1 SBirr
- ✅ Gas cost displayed
- ✅ Token visible in MetaMask

---

## 📊 Cost Breakdown

| Action           | POL Cost       | USD Cost   |
| ---------------- | -------------- | ---------- |
| Deploy contract  | ~0.5 POL       | ~$0.32     |
| Configure minter | ~0.01 POL      | ~$0.006    |
| Unpause          | ~0.005 POL     | ~$0.003    |
| **Total**        | **~0.515 POL** | **~$0.33** |

---

## 🔑 Key Differences from Oracle Version

### What Changed:

- ❌ No oracle configuration needed
- ❌ No rate tolerance settings
- ❌ No oracle stale period
- ✅ Backend provides rate directly
- ✅ Simpler deployment
- ✅ Lower gas costs

### Mint Function:

**Backend must provide:**

- `to` - Recipient address
- `amount` - SBirr amount (18 decimals)
- `usdAmount` - USD amount (18 decimals) - for audit
- `rate` - Exchange rate used (18 decimals) - for audit

**Example:**

```typescript
await contract.mint(
  "0x...", // to
  "1000000000000000000", // 1 SBirr
  "6666666666666667", // $0.00667 USD
  "150000000000000000000" // 150 ETB/USD
);
```

---

## ✅ Post-Deployment Verification

- [ ] Contract deployed successfully
- [ ] Minter configured
- [ ] Contract unpaused
- [ ] Test mint successful
- [ ] Tokens visible in MetaMask
- [ ] Contract verified on Polygonscan
- [ ] Admin controls working
- [ ] Pause/unpause working

---

## 🚨 Important Notes

1. **No Oracle Required** - Backend gets rate from NBE API
2. **Backend Trusted** - Authorized minters are trusted to provide correct values
3. **Full Audit Trail** - All mints record: to, amount, usdAmount, rate, timestamp
4. **Supply Cap** - Still enforced (set via `setSupplyCap()`)
5. **Compliance** - Blacklist, freeze, pause all still work

---

## 📞 Emergency Procedures

### Pause Contract

```typescript
await contract.pause("Security incident - investigating");
```

### Blacklist Address

```typescript
await contract.blacklist("0x...");
```

### Remove Minter

```typescript
await contract.removeMinter("0x...");
```

---

**Contract is ready for production deployment!** 🚀
