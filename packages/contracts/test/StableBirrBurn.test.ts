import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import type { StableBirr, MockPriceFeed } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ZeroAddress } from "ethers";

/**
 * Test Suite: StableBirr Burning Operations
 *
 * **What we're testing**
 * - Valid burning with proper permissions
 * - Merchant ID recording for audit trails
 * - Burn permission enforcement (operator + authorized minters)
 * - Insufficient balance handling
 * - Blacklist/freeze checks during burning
 * - Burn record creation and retrieval
 * - Total burned tracking
 *
 * **Why these tests matter**
 * Burning reduces circulating supply when fiat leaves custody. Incorrect burns can break the peg
 * or create accounting discrepancies. These tests ensure burns only happen with proper authorization
 * and complete audit trails.
 */
describe("StableBirr - Burning Operations", function () {
  let stableBirr: StableBirr;
  let mockOracle: MockPriceFeed;
  let admin: SignerWithAddress;
  let operator: SignerWithAddress;
  let user: SignerWithAddress;
  let minter: SignerWithAddress;
  let attacker: SignerWithAddress;

  const ORACLE_RATE = ethers.parseUnits("120", 18);

  beforeEach(async function () {
  const [admin, operator, user, minter, attacker] = await ethers.getSigners();

    // Deploy mock oracle
    const MockPriceFeedFactory = await ethers.getContractFactory(
      "MockPriceFeed"
    );
    mockOracle = await MockPriceFeedFactory.deploy(8);
    await mockOracle.waitForDeployment();

    const currentTime = await ethers.provider
      .getBlock("latest")
      .then((b) => b!.timestamp);
    await mockOracle.setLatestAnswer(120_00000000, currentTime);

    // Deploy StableBirr
    const StableBirrFactory = await ethers.getContractFactory("StableBirr");
    stableBirr = (await upgrades.deployProxy(
      StableBirrFactory,
      [admin.address, operator.address, await mockOracle.getAddress()],
      { kind: "uups" }
    )) as unknown as StableBirr;
    await stableBirr.waitForDeployment();

    // Unpause and mint some tokens to user for testing
    await stableBirr.connect(admin).unpause("Initial deployment");

    const usdAmount = ethers.parseUnits("1000", 18);
    const sbirrAmount = ethers.parseUnits("120000", 18);
    await stableBirr
      .connect(operator)
      .mint(user.address, sbirrAmount, usdAmount, ORACLE_RATE);
  });

  describe("Valid Burning", function () {
    it("Should burn tokens with operator permission", async function () {
      const burnAmount = ethers.parseUnits("10000", 18);
      const merchantId = "MERCHANT_12345";

      const balanceBefore = await stableBirr.balanceOf(user.address);
      const supplyBefore = await stableBirr.totalSupply();

      await expect(
        stableBirr.connect(operator).burn(user.address, burnAmount, merchantId)
      )
        .to.emit(stableBirr, "Burned")
        .withArgs(
          user.address,
          burnAmount,
          merchantId,
          await ethers.provider.getBlock("latest").then((b) => b!.timestamp + 1)
        );

      expect(await stableBirr.balanceOf(user.address)).to.equal(
        balanceBefore - burnAmount
      );
      expect(await stableBirr.totalSupply()).to.equal(
        supplyBefore - burnAmount
      );
      expect(await stableBirr.totalBurned()).to.equal(burnAmount);
    });

    it("Should burn tokens with authorized minter permission", async function () {
      // Configure minter with burn permission
      await stableBirr.connect(admin).configureMinter(
        minter.address,
        ethers.parseUnits("100000", 18),
        true // canBurn = true
      );

      const burnAmount = ethers.parseUnits("5000", 18);
      const merchantId = "MERCHANT_67890";

      await expect(
        stableBirr.connect(minter).burn(user.address, burnAmount, merchantId)
      ).to.not.be.reverted;

      expect(await stableBirr.totalBurned()).to.equal(burnAmount);
    });

    it("Should create and store burn record", async function () {
      const burnAmount = ethers.parseUnits("10000", 18);
      const merchantId = "MERCHANT_TEST";

      const tx = await stableBirr
        .connect(operator)
        .burn(user.address, burnAmount, merchantId);
      const receipt = await tx.wait();
      const currentTime = await ethers.provider
        .getBlock(receipt!.blockNumber)
        .then((b) => b!.timestamp);

      // Calculate record ID
      const recordId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint256", "string", "uint256"],
          [user.address, burnAmount, merchantId, currentTime]
        )
      );

      const record = await stableBirr.getBurnRecord(recordId);
      expect(record.from).to.equal(user.address);
      expect(record.amount).to.equal(burnAmount);
      expect(record.merchantId).to.equal(merchantId);
      expect(record.timestamp).to.equal(currentTime);
      expect(record.exists).to.be.true;
    });

    it("Should accumulate total burned across multiple burns", async function () {
      const burn1 = ethers.parseUnits("5000", 18);
      const burn2 = ethers.parseUnits("3000", 18);

      await stableBirr
        .connect(operator)
        .burn(user.address, burn1, "MERCHANT_1");
      await stableBirr
        .connect(operator)
        .burn(user.address, burn2, "MERCHANT_2");

      expect(await stableBirr.totalBurned()).to.equal(burn1 + burn2);
    });
  });

  describe("Burn Permission Enforcement", function () {
    it("Should reject burn from unauthorized address", async function () {
      const burnAmount = ethers.parseUnits("1000", 18);

      await expect(
        stableBirr
          .connect(attacker)
          .burn(user.address, burnAmount, "MERCHANT_X")
      ).to.be.revertedWithCustomError(stableBirr, "NotAuthorizedMinter");
    });

    it("Should reject burn from minter without burn permission", async function () {
      // Configure minter WITHOUT burn permission
      await stableBirr.connect(admin).configureMinter(
        minter.address,
        ethers.parseUnits("100000", 18),
        false // canBurn = false
      );

      const burnAmount = ethers.parseUnits("1000", 18);

      await expect(
        stableBirr.connect(minter).burn(user.address, burnAmount, "MERCHANT_Y")
      ).to.be.revertedWithCustomError(stableBirr, "NotAuthorizedMinter");
    });

    it("Should allow operator to burn even without explicit minter config", async function () {
      // Operator has burn permission by default
      const burnAmount = ethers.parseUnits("1000", 18);

      await expect(
        stableBirr
          .connect(operator)
          .burn(user.address, burnAmount, "MERCHANT_Z")
      ).to.not.be.reverted;
    });
  });

  describe("Insufficient Balance Handling", function () {
    it("Should reject burn exceeding user balance", async function () {
      const userBalance = await stableBirr.balanceOf(user.address);
      const excessiveAmount = userBalance + ethers.parseUnits("1", 18);

      await expect(
        stableBirr
          .connect(operator)
          .burn(user.address, excessiveAmount, "MERCHANT_FAIL")
      ).to.be.revertedWithCustomError(stableBirr, "InsufficientBalance");
    });

    it("Should allow burning entire balance", async function () {
      const userBalance = await stableBirr.balanceOf(user.address);

      await expect(
        stableBirr
          .connect(operator)
          .burn(user.address, userBalance, "MERCHANT_ALL")
      ).to.not.be.reverted;

      expect(await stableBirr.balanceOf(user.address)).to.equal(0);
    });
  });

  describe("Compliance Checks During Burning", function () {
    it("Should reject burning from blacklisted address", async function () {
      await stableBirr.connect(admin).blacklist(user.address);

      const burnAmount = ethers.parseUnits("1000", 18);

      await expect(
        stableBirr
          .connect(operator)
          .burn(user.address, burnAmount, "MERCHANT_BL")
      ).to.be.revertedWithCustomError(stableBirr, "AccountBlacklisted");
    });

    it("Should reject burning from frozen address", async function () {
      await stableBirr.connect(admin).freeze(user.address, "Investigation");

      const burnAmount = ethers.parseUnits("1000", 18);

      await expect(
        stableBirr
          .connect(operator)
          .burn(user.address, burnAmount, "MERCHANT_FR")
      ).to.be.revertedWithCustomError(stableBirr, "AccountFrozenState");
    });

    it("Should reject burning from zero address", async function () {
      const burnAmount = ethers.parseUnits("1000", 18);

      await expect(
        stableBirr
          .connect(operator)
          .burn(ZeroAddress, burnAmount, "MERCHANT_ZERO")
      ).to.be.revertedWithCustomError(stableBirr, "InvalidAddress");
    });

    it("Should reject burning when paused", async function () {
      await stableBirr.connect(admin).pause("Emergency");

      const burnAmount = ethers.parseUnits("1000", 18);

      await expect(
        stableBirr
          .connect(operator)
          .burn(user.address, burnAmount, "MERCHANT_PAUSE")
      ).to.be.revertedWithCustomError(stableBirr, "EnforcedPause");
    });
  });

  describe("Input Validation", function () {
    it("Should reject zero burn amount", async function () {
      await expect(
        stableBirr.connect(operator).burn(user.address, 0, "MERCHANT_ZERO_AMT")
      ).to.be.revertedWithCustomError(stableBirr, "InvalidAmount");
    });

    it("Should allow empty merchant ID (edge case)", async function () {
      // While not recommended, the contract doesn't enforce non-empty merchantId
      const burnAmount = ethers.parseUnits("1000", 18);

      await expect(
        stableBirr.connect(operator).burn(user.address, burnAmount, "")
      ).to.not.be.reverted;
    });
  });

  describe("Burn vs Wipe Distinction", function () {
    it("Should track regular burns separately from frozen wipes", async function () {
      const regularBurn = ethers.parseUnits("5000", 18);
      await stableBirr
        .connect(operator)
        .burn(user.address, regularBurn, "MERCHANT_REG");

      // Freeze another user and wipe their balance
      const wipeUser = minter.address;
      const wipeAmount = ethers.parseUnits("10000", 18);
      await stableBirr
        .connect(operator)
        .mint(wipeUser, wipeAmount, ethers.parseUnits("100", 18), ORACLE_RATE);

      await stableBirr.connect(admin).freeze(wipeUser, "Compliance case");
      await stableBirr.connect(admin).wipeFrozenBalance(wipeUser, "CASE_001");

      // totalBurned should only include regular burn
      expect(await stableBirr.totalBurned()).to.equal(regularBurn);

      // totalFrozenWiped should track the wipe separately
      expect(await stableBirr.totalFrozenWiped()).to.equal(wipeAmount);
    });
  });
});
