import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import type { StableBirr, MockPriceFeed } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ZeroAddress } from "ethers";

/**
 * Test Suite: StableBirr Minting Operations
 *
 * **What we're testing**
 * - Valid minting with oracle rate validation
 * - Oracle deviation tolerance enforcement
 * - Supply cap enforcement
 * - Minter allowance consumption
 * - Stale oracle rejection
 * - Blacklist/freeze checks during minting
 * - Mint record creation and retrieval
 *
 * **Why these tests matter**
 * Minting is the entry point for fiat → crypto conversion. Any bug here directly impacts the peg
 * and reserve ratio. These tests ensure minting only happens when all invariants are satisfied.
 */
describe("StableBirr - Minting Operations", function () {
  let stableBirr: StableBirr;
  let mockOracle: MockPriceFeed;
  let admin: SignerWithAddress;
  let operator: SignerWithAddress;
  let user: SignerWithAddress;
  let minter: SignerWithAddress;
  let attacker: SignerWithAddress;

  const INITIAL_ORACLE_RATE = 120_00000000; // 120 ETB/USD (8 decimals)
  const ORACLE_RATE_18_DECIMALS = ethers.parseUnits("120", 18);

  beforeEach(async function () {
    const [admin, operator, user, minter, attacker] = await ethers.getSigners();

    // Deploy mock oracle
    const MockPriceFeedFactory = await ethers.getContractFactory(
      "MockPriceFeed"
    );
    mockOracle = await MockPriceFeedFactory.deploy(8);
    await mockOracle.waitForDeployment();

    // Set initial oracle rate
    const currentTime = await ethers.provider
      .getBlock("latest")
      .then((b) => b!.timestamp);
    await mockOracle.setLatestAnswer(INITIAL_ORACLE_RATE, currentTime);

    // Deploy StableBirr
    const StableBirrFactory = await ethers.getContractFactory("StableBirr");
    stableBirr = (await upgrades.deployProxy(
      StableBirrFactory,
      [admin.address, operator.address, await mockOracle.getAddress()],
      { kind: "uups" }
    )) as unknown as StableBirr;
    await stableBirr.waitForDeployment();

    // Unpause the contract so minting can work
    await stableBirr.connect(admin).unpause("Initial deployment complete");
  });

  describe("Valid Minting", function () {
    it("Should mint tokens with correct oracle rate", async function () {
      const recipient = user.address;
      const usdAmount = ethers.parseUnits("1000", 18); // $1000 USD
      const expectedSBirr = ethers.parseUnits("120000", 18); // 120,000 SBirr (1000 * 120)
      const rate = ORACLE_RATE_18_DECIMALS;

      await expect(
        stableBirr
          .connect(operator)
          .mint(recipient, expectedSBirr, usdAmount, rate)
      )
        .to.emit(stableBirr, "Minted")
        .withArgs(
          recipient,
          expectedSBirr,
          usdAmount,
          rate,
          await ethers.provider.getBlock("latest").then((b) => b!.timestamp + 1)
        );

      expect(await stableBirr.balanceOf(recipient)).to.equal(expectedSBirr);
      expect(await stableBirr.totalSupply()).to.equal(expectedSBirr);
      expect(await stableBirr.totalUSDConverted()).to.equal(usdAmount);
    });

    it("Should consume minter allowance correctly", async function () {
      // Configure a minter with limited allowance
      const allowance = ethers.parseUnits("50000", 18); // 50,000 SBirr
      await stableBirr
        .connect(admin)
        .configureMinter(minter.address, allowance, false);

      const usdAmount = ethers.parseUnits("100", 18); // $100
      const sbirrAmount = ethers.parseUnits("12000", 18); // 12,000 SBirr
      const rate = ORACLE_RATE_18_DECIMALS;

      await stableBirr
        .connect(minter)
        .mint(user.address, sbirrAmount, usdAmount, rate);

      const remainingAllowance = await stableBirr.minterAllowance(
        minter.address
      );
      expect(remainingAllowance).to.equal(allowance - sbirrAmount);
    });

    it("Should not consume unlimited minter allowance", async function () {
      const usdAmount = ethers.parseUnits("1000", 18);
      const sbirrAmount = ethers.parseUnits("120000", 18);
      const rate = ORACLE_RATE_18_DECIMALS;

      const allowanceBefore = await stableBirr.minterAllowance(
        operator.address
      );
      expect(allowanceBefore).to.equal(ethers.MaxUint256);

      await stableBirr
        .connect(operator)
        .mint(user.address, sbirrAmount, usdAmount, rate);

      const allowanceAfter = await stableBirr.minterAllowance(operator.address);
      expect(allowanceAfter).to.equal(ethers.MaxUint256); // Still unlimited
    });

    it("Should create and store mint record", async function () {
      const recipient = user.address;
      const usdAmount = ethers.parseUnits("500", 18);
      const sbirrAmount = ethers.parseUnits("60000", 18);
      const rate = ORACLE_RATE_18_DECIMALS;

      const tx = await stableBirr
        .connect(operator)
        .mint(recipient, sbirrAmount, usdAmount, rate);
      const receipt = await tx.wait();
      const currentTime = await ethers.provider
        .getBlock(receipt!.blockNumber)
        .then((b) => b!.timestamp);

      // Calculate record ID (same hash used in contract)
      const recordId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint256", "uint256", "uint256", "uint256"],
          [recipient, sbirrAmount, usdAmount, rate, currentTime]
        )
      );

      const record = await stableBirr.getMintRecord(recordId);
      expect(record.to).to.equal(recipient);
      expect(record.amount).to.equal(sbirrAmount);
      expect(record.usdAmount).to.equal(usdAmount);
      expect(record.rate).to.equal(rate);
      expect(record.timestamp).to.equal(currentTime);
      expect(record.exists).to.be.true;
    });
  });

  describe("Oracle Rate Validation", function () {
    it("Should accept rate within tolerance (1% default)", async function () {
      const usdAmount = ethers.parseUnits("100", 18);
      const sbirrAmount = ethers.parseUnits("12000", 18);

      // Provide rate 0.5% higher than oracle (within 1% tolerance)
      const slightlyHigherRate = (ORACLE_RATE_18_DECIMALS * 10050n) / 10000n;

      await expect(
        stableBirr
          .connect(operator)
          .mint(user.address, sbirrAmount, usdAmount, slightlyHigherRate)
      ).to.not.be.reverted;
    });

    it("Should reject rate exceeding tolerance", async function () {
      const usdAmount = ethers.parseUnits("100", 18);
      const sbirrAmount = ethers.parseUnits("12000", 18);

      // Provide rate 2% higher than oracle (exceeds 1% tolerance)
      const tooHighRate = (ORACLE_RATE_18_DECIMALS * 102n) / 100n;

      await expect(
        stableBirr
          .connect(operator)
          .mint(user.address, sbirrAmount, usdAmount, tooHighRate)
      ).to.be.revertedWithCustomError(stableBirr, "RateToleranceExceeded");
    });

    it("Should reject amount mismatch with oracle rate", async function () {
      const usdAmount = ethers.parseUnits("100", 18);
      const wrongAmount = ethers.parseUnits("10000", 18); // Should be 12,000
      const rate = ORACLE_RATE_18_DECIMALS;

      await expect(
        stableBirr
          .connect(operator)
          .mint(user.address, wrongAmount, usdAmount, rate)
      ).to.be.revertedWithCustomError(stableBirr, "AmountMismatch");
    });

    it("Should update lastOracleRate after successful mint", async function () {
      const usdAmount = ethers.parseUnits("100", 18);
      const sbirrAmount = ethers.parseUnits("12000", 18);
      const rate = ORACLE_RATE_18_DECIMALS;

      await stableBirr
        .connect(operator)
        .mint(user.address, sbirrAmount, usdAmount, rate);

      expect(await stableBirr.lastOracleRate()).to.equal(rate);
    });
  });

  describe("Supply Cap Enforcement", function () {
    beforeEach(async function () {
      // Set supply cap to 1 million SBirr
      const cap = ethers.parseUnits("1000000", 18);
      await stableBirr.connect(admin).setSupplyCap(cap);
    });

    it("Should allow minting within supply cap", async function () {
      const usdAmount = ethers.parseUnits("5000", 18);
      const sbirrAmount = ethers.parseUnits("600000", 18); // 600k SBirr (under 1M cap)
      const rate = ORACLE_RATE_18_DECIMALS;

      await expect(
        stableBirr
          .connect(operator)
          .mint(user.address, sbirrAmount, usdAmount, rate)
      ).to.not.be.reverted;
    });

    it("Should reject minting that exceeds supply cap", async function () {
      const usdAmount = ethers.parseUnits("10000", 18);
      const sbirrAmount = ethers.parseUnits("1200000", 18); // 1.2M SBirr (exceeds 1M cap)
      const rate = ORACLE_RATE_18_DECIMALS;

      await expect(
        stableBirr
          .connect(operator)
          .mint(user.address, sbirrAmount, usdAmount, rate)
      ).to.be.revertedWithCustomError(stableBirr, "SupplyCapExceeded");
    });

    it("Should allow minting up to exact supply cap", async function () {
      const cap = ethers.parseUnits("1000000", 18);
      const usdAmount = cap / 120n; // Exact USD to reach cap
      const sbirrAmount = cap;
      const rate = ORACLE_RATE_18_DECIMALS;

      await expect(
        stableBirr
          .connect(operator)
          .mint(user.address, sbirrAmount, usdAmount, rate)
      ).to.not.be.reverted;

      expect(await stableBirr.totalSupply()).to.equal(cap);
    });

    it("Should allow unlimited minting when cap is zero", async function () {
      await stableBirr.connect(admin).setSupplyCap(0);

      const usdAmount = ethers.parseUnits("100000", 18);
      const sbirrAmount = ethers.parseUnits("12000000", 18); // 12M SBirr
      const rate = ORACLE_RATE_18_DECIMALS;

      await expect(
        stableBirr
          .connect(operator)
          .mint(user.address, sbirrAmount, usdAmount, rate)
      ).to.not.be.reverted;
    });
  });

  describe("Stale Oracle Rejection", function () {
    it("Should reject minting with stale oracle data", async function () {
      // Set oracle data to 2 hours old (stale period is 1 hour)
      const twoHoursAgo = 7200;
      await mockOracle.setStaleData(twoHoursAgo);

      const usdAmount = ethers.parseUnits("100", 18);
      const sbirrAmount = ethers.parseUnits("12000", 18);
      const rate = ORACLE_RATE_18_DECIMALS;

      await expect(
        stableBirr
          .connect(operator)
          .mint(user.address, sbirrAmount, usdAmount, rate)
      ).to.be.revertedWithCustomError(stableBirr, "OracleStale");
    });

    it("Should allow minting with fresh oracle data", async function () {
      // Update oracle with current timestamp
      const currentTime = await ethers.provider
        .getBlock("latest")
        .then((b) => b!.timestamp);
      await mockOracle.setLatestAnswer(INITIAL_ORACLE_RATE, currentTime);

      const usdAmount = ethers.parseUnits("100", 18);
      const sbirrAmount = ethers.parseUnits("12000", 18);
      const rate = ORACLE_RATE_18_DECIMALS;

      await expect(
        stableBirr
          .connect(operator)
          .mint(user.address, sbirrAmount, usdAmount, rate)
      ).to.not.be.reverted;
    });

    it("Should allow minting when stale period is disabled (0)", async function () {
      await stableBirr.connect(admin).setOracleStalePeriod(0);

      // Set very old oracle data
      await mockOracle.setStaleData(86400); // 24 hours old

      const usdAmount = ethers.parseUnits("100", 18);
      const sbirrAmount = ethers.parseUnits("12000", 18);
      const rate = ORACLE_RATE_18_DECIMALS;

      await expect(
        stableBirr
          .connect(operator)
          .mint(user.address, sbirrAmount, usdAmount, rate)
      ).to.not.be.reverted;
    });
  });

  describe("Minter Allowance Enforcement", function () {
    it("Should reject minting when allowance exceeded", async function () {
      const allowance = ethers.parseUnits("10000", 18);
      await stableBirr
        .connect(admin)
        .configureMinter(minter.address, allowance, false);

      const usdAmount = ethers.parseUnits("100", 18);
      const sbirrAmount = ethers.parseUnits("12000", 18); // Exceeds 10k allowance

      await expect(
        stableBirr
          .connect(minter)
          .mint(user.address, sbirrAmount, usdAmount, ORACLE_RATE_18_DECIMALS)
      ).to.be.revertedWithCustomError(stableBirr, "MintAllowanceExceeded");
    });

    it("Should reject minting from unauthorized minter", async function () {
      const usdAmount = ethers.parseUnits("100", 18);
      const sbirrAmount = ethers.parseUnits("12000", 18);

      await expect(
        stableBirr
          .connect(attacker)
          .mint(user.address, sbirrAmount, usdAmount, ORACLE_RATE_18_DECIMALS)
      ).to.be.revertedWithCustomError(stableBirr, "NotAuthorizedMinter");
    });

    it("Should emit MintAllowanceUsed event", async function () {
      const allowance = ethers.parseUnits("50000", 18);
      await stableBirr
        .connect(admin)
        .configureMinter(minter.address, allowance, false);

      const usdAmount = ethers.parseUnits("100", 18);
      const sbirrAmount = ethers.parseUnits("12000", 18);

      await expect(
        stableBirr
          .connect(minter)
          .mint(user.address, sbirrAmount, usdAmount, ORACLE_RATE_18_DECIMALS)
      )
        .to.emit(stableBirr, "MintAllowanceUsed")
        .withArgs(minter.address, allowance - sbirrAmount);
    });
  });

  describe("Compliance Checks During Minting", function () {
    it("Should reject minting to blacklisted address", async function () {
      await stableBirr.connect(admin).blacklist(user.address);

      const usdAmount = ethers.parseUnits("100", 18);
      const sbirrAmount = ethers.parseUnits("12000", 18);

      await expect(
        stableBirr
          .connect(operator)
          .mint(user.address, sbirrAmount, usdAmount, ORACLE_RATE_18_DECIMALS)
      ).to.be.revertedWithCustomError(stableBirr, "AccountBlacklisted");
    });

    it("Should reject minting to frozen address", async function () {
      await stableBirr
        .connect(admin)
        .freeze(user.address, "Investigation pending");

      const usdAmount = ethers.parseUnits("100", 18);
      const sbirrAmount = ethers.parseUnits("12000", 18);

      await expect(
        stableBirr
          .connect(operator)
          .mint(user.address, sbirrAmount, usdAmount, ORACLE_RATE_18_DECIMALS)
      ).to.be.revertedWithCustomError(stableBirr, "AccountFrozenState");
    });

    it("Should reject minting to zero address", async function () {
      const usdAmount = ethers.parseUnits("100", 18);
      const sbirrAmount = ethers.parseUnits("12000", 18);

      await expect(
        stableBirr
          .connect(operator)
          .mint(ZeroAddress, sbirrAmount, usdAmount, ORACLE_RATE_18_DECIMALS)
      ).to.be.revertedWithCustomError(stableBirr, "InvalidAddress");
    });

    it("Should reject minting when paused", async function () {
      await stableBirr.connect(admin).pause("Emergency pause");

      const usdAmount = ethers.parseUnits("100", 18);
      const sbirrAmount = ethers.parseUnits("12000", 18);

      await expect(
        stableBirr
          .connect(operator)
          .mint(user.address, sbirrAmount, usdAmount, ORACLE_RATE_18_DECIMALS)
      ).to.be.revertedWithCustomError(stableBirr, "EnforcedPause");
    });
  });

  describe("Input Validation", function () {
    it("Should reject zero amount", async function () {
      await expect(
        stableBirr
          .connect(operator)
          .mint(
            user.address,
            0,
            ethers.parseUnits("100", 18),
            ORACLE_RATE_18_DECIMALS
          )
      ).to.be.revertedWithCustomError(stableBirr, "InvalidAmount");
    });

    it("Should reject zero USD amount", async function () {
      await expect(
        stableBirr
          .connect(operator)
          .mint(
            user.address,
            ethers.parseUnits("12000", 18),
            0,
            ORACLE_RATE_18_DECIMALS
          )
      ).to.be.revertedWithCustomError(stableBirr, "InvalidAmount");
    });
  });
});
