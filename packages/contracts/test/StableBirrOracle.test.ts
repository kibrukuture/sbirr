import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import type { StableBirr, MockPriceFeed } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ZeroAddress } from "ethers";

/**
 * Test Suite: StableBirr Oracle Management
 *
 * **What we're testing**
 * - Oracle address updates with validation
 * - Rate deviation tolerance configuration
 * - Oracle stale period configuration
 * - Supply cap updates
 * - Oracle rate fetching and scaling
 * - Invalid oracle data rejection
 *
 * **Why these tests matter**
 * The oracle is the source of truth for FX rates. Any misconfiguration could result in incorrect
 * minting amounts, breaking the peg. These tests ensure oracle management is robust and secure.
 */
describe("StableBirr - Oracle Management", function () {
  let stableBirr: StableBirr;
  let mockOracle: MockPriceFeed;
  let secondaryOracle: MockPriceFeed;
  let admin: SignerWithAddress;
  let operator: SignerWithAddress;
  let attacker: SignerWithAddress;

  beforeEach(async function () {
    [admin, operator, attacker] = await ethers.getSigners();

    // Deploy primary mock oracle
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

    await stableBirr.connect(admin).unpause("Initial deployment");
  });

  describe("Oracle Address Updates", function () {
    beforeEach(async function () {
      // Deploy secondary oracle for testing updates
      const MockPriceFeedFactory = await ethers.getContractFactory(
        "MockPriceFeed"
      );
      secondaryOracle = await MockPriceFeedFactory.deploy(8);
      await secondaryOracle.waitForDeployment();

      const currentTime = await ethers.provider
        .getBlock("latest")
        .then((b) => b!.timestamp);
      await secondaryOracle.setLatestAnswer(121_00000000, currentTime);
    });

    it("Should update oracle address", async function () {
      await expect(
        stableBirr
          .connect(admin)
          .updateFxOracle(await secondaryOracle.getAddress())
      )
        .to.emit(stableBirr, "FxOracleUpdated")
        .withArgs(await secondaryOracle.getAddress());

      expect(await stableBirr.fxOracle()).to.equal(
        await secondaryOracle.getAddress()
      );
    });

    it("Should reject zero address oracle", async function () {
      await expect(
        stableBirr.connect(admin).updateFxOracle(ZeroAddress)
      ).to.be.revertedWithCustomError(stableBirr, "InvalidAddress");
    });

    it("Should reject oracle update from non-admin", async function () {
      await expect(
        stableBirr
          .connect(operator)
          .updateFxOracle(await secondaryOracle.getAddress())
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");

      await expect(
        stableBirr
          .connect(attacker)
          .updateFxOracle(await secondaryOracle.getAddress())
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");
    });

    it("Should reject oracle with invalid decimals", async function () {
      // Deploy oracle with 0 decimals (invalid)
      const MockPriceFeedFactory = await ethers.getContractFactory(
        "MockPriceFeed"
      );
      const invalidOracle = await MockPriceFeedFactory.deploy(0);
      await invalidOracle.waitForDeployment();

      await expect(
        stableBirr
          .connect(admin)
          .updateFxOracle(await invalidOracle.getAddress())
      ).to.be.revertedWithCustomError(stableBirr, "OracleRateInvalid");
    });

    it("Should use new oracle for rate fetching after update", async function () {
      await stableBirr
        .connect(admin)
        .updateFxOracle(await secondaryOracle.getAddress());

      const rate = await stableBirr.currentOracleRate();
      // Secondary oracle has 121 ETB/USD
      expect(rate).to.equal(ethers.parseUnits("121", 18));
    });
  });

  describe("Rate Deviation Tolerance", function () {
    it("Should update rate deviation tolerance", async function () {
      const newTolerance = 200; // 2%

      await expect(
        stableBirr.connect(admin).setRateDeviationTolerance(newTolerance)
      )
        .to.emit(stableBirr, "RateToleranceUpdated")
        .withArgs(newTolerance);

      expect(await stableBirr.rateDeviationToleranceBps()).to.equal(
        newTolerance
      );
    });

    it("Should allow setting tolerance to zero (exact match required)", async function () {
      await stableBirr.connect(admin).setRateDeviationTolerance(0);
      expect(await stableBirr.rateDeviationToleranceBps()).to.equal(0);
    });

    it("Should allow setting tolerance to 10000 (100% deviation)", async function () {
      await stableBirr.connect(admin).setRateDeviationTolerance(10000);
      expect(await stableBirr.rateDeviationToleranceBps()).to.equal(10000);
    });

    it("Should reject tolerance exceeding 10000 bps", async function () {
      await expect(
        stableBirr.connect(admin).setRateDeviationTolerance(10001)
      ).to.be.revertedWithCustomError(stableBirr, "InvalidTolerance");
    });

    it("Should reject tolerance update from non-admin", async function () {
      await expect(
        stableBirr.connect(operator).setRateDeviationTolerance(200)
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");
    });
  });

  describe("Oracle Stale Period", function () {
    it("Should update oracle stale period", async function () {
      const newPeriod = 7200; // 2 hours

      await expect(stableBirr.connect(admin).setOracleStalePeriod(newPeriod))
        .to.emit(stableBirr, "OracleStalePeriodUpdated")
        .withArgs(newPeriod);

      expect(await stableBirr.oracleStalePeriod()).to.equal(newPeriod);
    });

    it("Should allow disabling stale check (period = 0)", async function () {
      await stableBirr.connect(admin).setOracleStalePeriod(0);
      expect(await stableBirr.oracleStalePeriod()).to.equal(0);
    });

    it("Should reject stale period update from non-admin", async function () {
      await expect(
        stableBirr.connect(operator).setOracleStalePeriod(7200)
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");
    });
  });

  describe("Supply Cap Management", function () {
    it("Should update supply cap", async function () {
      const newCap = ethers.parseUnits("10000000", 18); // 10M SBirr

      await expect(stableBirr.connect(admin).setSupplyCap(newCap))
        .to.emit(stableBirr, "SupplyCapUpdated")
        .withArgs(newCap);

      expect(await stableBirr.supplyCap()).to.equal(newCap);
    });

    it("Should allow disabling supply cap (cap = 0)", async function () {
      await stableBirr.connect(admin).setSupplyCap(0);
      expect(await stableBirr.supplyCap()).to.equal(0);
    });

    it("Should reject supply cap update from non-admin", async function () {
      await expect(
        stableBirr
          .connect(operator)
          .setSupplyCap(ethers.parseUnits("1000000", 18))
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");
    });
  });

  describe("Oracle Rate Fetching", function () {
    it("Should fetch and scale oracle rate correctly", async function () {
      const rate = await stableBirr.currentOracleRate();

      // Oracle returns 120_00000000 (8 decimals)
      // Should be scaled to 120_000000000000000000 (18 decimals)
      expect(rate).to.equal(ethers.parseUnits("120", 18));
    });

    it("Should handle different oracle decimals", async function () {
      // Deploy oracle with 18 decimals
      const MockPriceFeedFactory = await ethers.getContractFactory(
        "MockPriceFeed"
      );
      const oracle18 = await MockPriceFeedFactory.deploy(18);
      await oracle18.waitForDeployment();

      const currentTime = await ethers.provider
        .getBlock("latest")
        .then((b) => b!.timestamp);
      await oracle18.setLatestAnswer(ethers.parseUnits("120", 18), currentTime);

      await stableBirr
        .connect(admin)
        .updateFxOracle(await oracle18.getAddress());

      const rate = await stableBirr.currentOracleRate();
      expect(rate).to.equal(ethers.parseUnits("120", 18));
    });

    it("Should reject invalid oracle data (negative answer)", async function () {
      await mockOracle.setInvalidData();

      await expect(
        stableBirr.currentOracleRate()
      ).to.be.revertedWithCustomError(stableBirr, "OracleRateInvalid");
    });

    it("Should reject stale oracle data", async function () {
      await mockOracle.setStaleData(7200); // 2 hours old (stale period is 1 hour)

      await expect(
        stableBirr.currentOracleRate()
      ).to.be.revertedWithCustomError(stableBirr, "OracleStale");
    });

    it("Should reject oracle data from the future", async function () {
      const futureTime =
        (await ethers.provider.getBlock("latest").then((b) => b!.timestamp)) +
        3600;
      await mockOracle.setLatestAnswer(120_00000000, futureTime);

      await expect(
        stableBirr.currentOracleRate()
      ).to.be.revertedWithCustomError(stableBirr, "OracleRateInvalid");
    });

    it("Should update lastOracleRate and oracleLastUpdatedAt after mint", async function () {
      const usdAmount = ethers.parseUnits("100", 18);
      const sbirrAmount = ethers.parseUnits("12000", 18);
      const rate = ethers.parseUnits("120", 18);

      const user = operator; // Use operator as recipient
      await stableBirr
        .connect(operator)
        .mint(user.address, sbirrAmount, usdAmount, rate);

      expect(await stableBirr.lastOracleRate()).to.equal(rate);

      const oracleTimestamp = await stableBirr.oracleLastUpdatedAt();
      expect(oracleTimestamp).to.be.gt(0);
    });
  });

  describe("Oracle Failure Scenarios", function () {
    it("Should reject operations when oracle not configured", async function () {
      // Deploy new contract without oracle
      const StableBirrFactory = await ethers.getContractFactory("StableBirr");
      const noOracleContract = (await upgrades.deployProxy(
        StableBirrFactory,
        [admin.address, operator.address, ZeroAddress],
        { kind: "uups" }
      )) as unknown as StableBirr;

      await noOracleContract.connect(admin).unpause("Test");

      await expect(
        noOracleContract.currentOracleRate()
      ).to.be.revertedWithCustomError(noOracleContract, "OracleNotConfigured");
    });

    it("Should reject operations when oracle reverts", async function () {
      await mockOracle.setShouldRevert(true);

      await expect(stableBirr.currentOracleRate()).to.be.reverted;
    });
  });

  describe("Oracle Rate Validation in Minting", function () {
    it("Should enforce rate tolerance during mint", async function () {
      // Set tight tolerance (0.1%)
      await stableBirr.connect(admin).setRateDeviationTolerance(10);

      const usdAmount = ethers.parseUnits("100", 18);
      const sbirrAmount = ethers.parseUnits("12000", 18);

      // Provide rate 0.5% off (exceeds 0.1% tolerance)
      const offRate = (ethers.parseUnits("120", 18) * 1005n) / 1000n;

      await expect(
        stableBirr
          .connect(operator)
          .mint(operator.address, sbirrAmount, usdAmount, offRate)
      ).to.be.revertedWithCustomError(stableBirr, "RateToleranceExceeded");
    });

    it("Should allow mint with exact oracle rate match", async function () {
      await stableBirr.connect(admin).setRateDeviationTolerance(0); // Exact match required

      const usdAmount = ethers.parseUnits("100", 18);
      const sbirrAmount = ethers.parseUnits("12000", 18);
      const exactRate = ethers.parseUnits("120", 18);

      await expect(
        stableBirr
          .connect(operator)
          .mint(operator.address, sbirrAmount, usdAmount, exactRate)
      ).to.not.be.reverted;
    });
  });
});
