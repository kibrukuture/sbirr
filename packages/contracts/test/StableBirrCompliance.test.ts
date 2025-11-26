import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import type { StableBirr, MockPriceFeed } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ZeroAddress } from "ethers";

/**
 * Test Suite: StableBirr Compliance Operations
 *
 * **What we're testing**
 * - Blacklist/unblacklist flows with proper authorization
 * - Freeze/unfreeze with mandatory reason strings
 * - Frozen balance wiping (legal seizures)
 * - Pause/unpause with incident logging
 * - ERC20 token rescue functionality
 * - Compliance event emissions
 *
 * **Why these tests matter**
 * Compliance features are legally mandated and audited heavily. Any bug here could result in
 * regulatory violations, failed audits, or inability to respond to court orders. These tests
 * ensure all compliance primitives work correctly and emit proper audit trails.
 */
describe("StableBirr - Compliance Operations", function () {
  let stableBirr: StableBirr;
  let mockOracle: MockPriceFeed;
  let mockToken: any; // For rescue testing
  let admin: SignerWithAddress;
  let operator: SignerWithAddress;
  let user: SignerWithAddress;
  let attacker: SignerWithAddress;

  const ORACLE_RATE = ethers.parseUnits("120", 18);

  beforeEach(async function () {
    const [admin, operator, user, attacker] = await ethers.getSigners();

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

    await stableBirr.connect(admin).unpause("Initial deployment");

    // Mint tokens to user for testing
    const usdAmount = ethers.parseUnits("1000", 18);
    const sbirrAmount = ethers.parseUnits("120000", 18);
    await stableBirr
      .connect(operator)
      .mint(user.address, sbirrAmount, usdAmount, ORACLE_RATE);
  });

  describe("Blacklist Operations", function () {
    it("Should blacklist an address", async function () {
      await expect(stableBirr.connect(admin).blacklist(user.address))
        .to.emit(stableBirr, "Blacklisted")
        .withArgs(user.address);

      expect(await stableBirr.isBlacklisted(user.address)).to.be.true;
    });

    it("Should unblacklist an address", async function () {
      await stableBirr.connect(admin).blacklist(user.address);

      await expect(stableBirr.connect(admin).unblacklist(user.address))
        .to.emit(stableBirr, "UnBlacklisted")
        .withArgs(user.address);

      expect(await stableBirr.isBlacklisted(user.address)).to.be.false;
    });

    it("Should be idempotent when blacklisting already blacklisted address", async function () {
      await stableBirr.connect(admin).blacklist(user.address);

      // Second blacklist should not revert
      await expect(stableBirr.connect(admin).blacklist(user.address)).to.not.be
        .reverted;

      expect(await stableBirr.isBlacklisted(user.address)).to.be.true;
    });

    it("Should be idempotent when unblacklisting non-blacklisted address", async function () {
      await expect(stableBirr.connect(admin).unblacklist(user.address)).to.not
        .be.reverted;
      expect(await stableBirr.isBlacklisted(user.address)).to.be.false;
    });

    it("Should reject blacklist from non-admin", async function () {
      await expect(
        stableBirr.connect(operator).blacklist(user.address)
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");

      await expect(
        stableBirr.connect(attacker).blacklist(user.address)
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");
    });

    it("Should prevent transfers from blacklisted address", async function () {
      await stableBirr.connect(admin).blacklist(user.address);

      await expect(
        stableBirr
          .connect(user)
          .transfer(operator.address, ethers.parseUnits("100", 18))
      ).to.be.revertedWithCustomError(stableBirr, "AccountBlacklisted");
    });

    it("Should prevent transfers to blacklisted address", async function () {
      await stableBirr.connect(admin).blacklist(attacker.address);

      await expect(
        stableBirr
          .connect(user)
          .transfer(attacker.address, ethers.parseUnits("100", 18))
      ).to.be.revertedWithCustomError(stableBirr, "AccountBlacklisted");
    });
  });

  describe("Freeze Operations", function () {
    it("Should freeze an address with reason", async function () {
      const reason = "Suspicious activity - Case #12345";

      await expect(stableBirr.connect(admin).freeze(user.address, reason))
        .to.emit(stableBirr, "AccountFrozen")
        .withArgs(
          user.address,
          admin.address,
          reason,
          await ethers.provider.getBlock("latest").then((b) => b!.timestamp + 1)
        );

      expect(await stableBirr.isFrozen(user.address)).to.be.true;
    });

    it("Should unfreeze an address with reason", async function () {
      const freezeReason = "Investigation started";
      const unfreezeReason = "Investigation concluded - no issues found";

      await stableBirr.connect(admin).freeze(user.address, freezeReason);

      await expect(
        stableBirr.connect(admin).unfreeze(user.address, unfreezeReason)
      )
        .to.emit(stableBirr, "AccountUnfrozen")
        .withArgs(
          user.address,
          admin.address,
          unfreezeReason,
          await ethers.provider.getBlock("latest").then((b) => b!.timestamp + 1)
        );

      expect(await stableBirr.isFrozen(user.address)).to.be.false;
    });

    it("Should reject freeze without reason", async function () {
      await expect(
        stableBirr.connect(admin).freeze(user.address, "")
      ).to.be.revertedWithCustomError(stableBirr, "IncidentReasonRequired");
    });

    it("Should reject unfreeze without reason", async function () {
      await stableBirr.connect(admin).freeze(user.address, "Test freeze");

      await expect(
        stableBirr.connect(admin).unfreeze(user.address, "")
      ).to.be.revertedWithCustomError(stableBirr, "IncidentReasonRequired");
    });

    it("Should reject freeze of zero address", async function () {
      await expect(
        stableBirr.connect(admin).freeze(ZeroAddress, "Invalid target")
      ).to.be.revertedWithCustomError(stableBirr, "InvalidAddress");
    });

    it("Should reject freezing already frozen address", async function () {
      await stableBirr.connect(admin).freeze(user.address, "First freeze");

      await expect(
        stableBirr.connect(admin).freeze(user.address, "Second freeze")
      ).to.be.revertedWithCustomError(stableBirr, "AccountAlreadyFrozen");
    });

    it("Should reject unfreezing non-frozen address", async function () {
      await expect(
        stableBirr.connect(admin).unfreeze(user.address, "Not frozen")
      ).to.be.revertedWithCustomError(stableBirr, "AccountNotFrozen");
    });

    it("Should reject freeze from non-admin", async function () {
      await expect(
        stableBirr.connect(operator).freeze(user.address, "Unauthorized")
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");
    });

    it("Should prevent transfers from frozen address", async function () {
      await stableBirr.connect(admin).freeze(user.address, "Compliance hold");

      await expect(
        stableBirr
          .connect(user)
          .transfer(operator.address, ethers.parseUnits("100", 18))
      ).to.be.revertedWithCustomError(stableBirr, "AccountFrozenState");
    });

    it("Should prevent transfers to frozen address", async function () {
      await stableBirr
        .connect(admin)
        .freeze(attacker.address, "Compliance hold");

      await expect(
        stableBirr
          .connect(user)
          .transfer(attacker.address, ethers.parseUnits("100", 18))
      ).to.be.revertedWithCustomError(stableBirr, "AccountFrozenState");
    });
  });

  describe("Frozen Balance Wiping", function () {
    beforeEach(async function () {
      // Freeze user before wiping tests
      await stableBirr
        .connect(admin)
        .freeze(user.address, "Compliance investigation");
    });

    it("Should wipe frozen balance with case ID", async function () {
      const caseId = "COURT_ORDER_2024_001";
      const balanceBefore = await stableBirr.balanceOf(user.address);

      await expect(
        stableBirr.connect(admin).wipeFrozenBalance(user.address, caseId)
      )
        .to.emit(stableBirr, "FrozenBalanceWiped")
        .withArgs(
          user.address,
          admin.address,
          balanceBefore,
          caseId,
          await ethers.provider.getBlock("latest").then((b) => b!.timestamp + 1)
        );

      expect(await stableBirr.balanceOf(user.address)).to.equal(0);
      expect(await stableBirr.totalFrozenWiped()).to.equal(balanceBefore);
    });

    it("Should reject wipe without case ID", async function () {
      await expect(
        stableBirr.connect(admin).wipeFrozenBalance(user.address, "")
      ).to.be.revertedWithCustomError(stableBirr, "IncidentReasonRequired");
    });

    it("Should reject wipe of non-frozen address", async function () {
      await stableBirr.connect(admin).unfreeze(user.address, "Unfrozen");

      await expect(
        stableBirr.connect(admin).wipeFrozenBalance(user.address, "CASE_002")
      ).to.be.revertedWithCustomError(stableBirr, "AccountNotFrozen");
    });

    it("Should reject wipe with zero balance", async function () {
      // Wipe once
      await stableBirr
        .connect(admin)
        .wipeFrozenBalance(user.address, "CASE_003");

      // Try to wipe again (balance is now zero)
      await expect(
        stableBirr.connect(admin).wipeFrozenBalance(user.address, "CASE_004")
      ).to.be.revertedWithCustomError(stableBirr, "InvalidAmount");
    });

    it("Should reject wipe from non-admin", async function () {
      await expect(
        stableBirr.connect(operator).wipeFrozenBalance(user.address, "CASE_005")
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");
    });

    it("Should accumulate total frozen wiped", async function () {
      const balance1 = await stableBirr.balanceOf(user.address);
      await stableBirr
        .connect(admin)
        .wipeFrozenBalance(user.address, "CASE_006");

      // Mint to another user, freeze, and wipe
      const attacker2 = attacker.address;
      const amount2 = ethers.parseUnits("50000", 18);
      await stableBirr
        .connect(operator)
        .mint(attacker2, amount2, ethers.parseUnits("500", 18), ORACLE_RATE);
      await stableBirr.connect(admin).freeze(attacker2, "Another case");
      await stableBirr.connect(admin).wipeFrozenBalance(attacker2, "CASE_007");

      expect(await stableBirr.totalFrozenWiped()).to.equal(balance1 + amount2);
    });
  });

  describe("Pause/Unpause Operations", function () {
    it("Should pause with reason", async function () {
      const reason = "Oracle outage - maintenance mode";

      await expect(stableBirr.connect(admin).pause(reason))
        .to.emit(stableBirr, "IncidentLogged")
        .withArgs(
          "PAUSE",
          admin.address,
          reason,
          await ethers.provider.getBlock("latest").then((b) => b!.timestamp + 1)
        );

      expect(await stableBirr.paused()).to.be.true;
    });

    it("Should unpause with reason", async function () {
      await stableBirr.connect(admin).pause("Emergency");
      const reason = "Oracle restored - resuming operations";

      await expect(stableBirr.connect(admin).unpause(reason))
        .to.emit(stableBirr, "IncidentLogged")
        .withArgs(
          "UNPAUSE",
          admin.address,
          reason,
          await ethers.provider.getBlock("latest").then((b) => b!.timestamp + 1)
        );

      expect(await stableBirr.paused()).to.be.false;
    });

    it("Should reject pause without reason", async function () {
      await expect(
        stableBirr.connect(admin).pause("")
      ).to.be.revertedWithCustomError(stableBirr, "IncidentReasonRequired");
    });

    it("Should reject unpause without reason", async function () {
      await stableBirr.connect(admin).pause("Test");

      await expect(
        stableBirr.connect(admin).unpause("")
      ).to.be.revertedWithCustomError(stableBirr, "IncidentReasonRequired");
    });

    it("Should reject pause from non-admin", async function () {
      await expect(
        stableBirr.connect(operator).pause("Unauthorized")
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");
    });

    it("Should prevent all operations when paused", async function () {
      await stableBirr.connect(admin).pause("Testing pause");

      // Transfers should fail
      await expect(
        stableBirr
          .connect(user)
          .transfer(operator.address, ethers.parseUnits("100", 18))
      ).to.be.revertedWithCustomError(stableBirr, "EnforcedPause");

      // Mints should fail
      await expect(
        stableBirr
          .connect(operator)
          .mint(
            user.address,
            ethers.parseUnits("1000", 18),
            ethers.parseUnits("10", 18),
            ORACLE_RATE
          )
      ).to.be.revertedWithCustomError(stableBirr, "EnforcedPause");

      // Burns should fail
      await expect(
        stableBirr
          .connect(operator)
          .burn(user.address, ethers.parseUnits("100", 18), "MERCHANT_X")
      ).to.be.revertedWithCustomError(stableBirr, "EnforcedPause");
    });
  });

  describe("ERC20 Token Rescue", function () {
    beforeEach(async function () {
      // Deploy a mock ERC20 token to rescue
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      mockToken = await MockERC20.deploy();
      await mockToken.waitForDeployment();
      // Initialize with supply to owner (admin)
      await mockToken.initialize(
        "MockToken",
        "MCK",
        ethers.parseUnits("1000000", 18),
        admin.address
      );
    });

    it("Should rescue accidentally sent ERC20 tokens", async function () {
      // "Accidentally" send tokens to StableBirr contract
      const rescueAmount = ethers.parseUnits("1000", 18);
      await mockToken.transfer(await stableBirr.getAddress(), rescueAmount);

      await expect(
        stableBirr
          .connect(admin)
          .rescueERC20(
            await mockToken.getAddress(),
            admin.address,
            rescueAmount
          )
      )
        .to.emit(stableBirr, "Rescued")
        .withArgs(await mockToken.getAddress(), admin.address, rescueAmount);

      expect(await mockToken.balanceOf(admin.address)).to.be.gte(rescueAmount);
    });

    it("Should reject rescuing SBirr itself", async function () {
      const rescueAmount = ethers.parseUnits("100", 18);

      await expect(
        stableBirr
          .connect(admin)
          .rescueERC20(
            await stableBirr.getAddress(),
            admin.address,
            rescueAmount
          )
      ).to.be.revertedWithCustomError(stableBirr, "InvalidAddress");
    });

    it("Should reject rescue from non-admin", async function () {
      const rescueAmount = ethers.parseUnits("100", 18);

      await expect(
        stableBirr
          .connect(operator)
          .rescueERC20(
            await mockToken.getAddress(),
            admin.address,
            rescueAmount
          )
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");
    });
  });

  describe("Combined Compliance Scenarios", function () {
    it("Should handle blacklist → freeze → wipe workflow", async function () {
      // Blacklist prevents new transactions
      await stableBirr.connect(admin).blacklist(user.address);
      expect(await stableBirr.isBlacklisted(user.address)).to.be.true;

      // Freeze for investigation (blacklist and freeze are independent)
      await stableBirr.connect(admin).freeze(user.address, "AML investigation");
      expect(await stableBirr.isFrozen(user.address)).to.be.true;

      // Wipe after court order
      const balanceBefore = await stableBirr.balanceOf(user.address);
      await stableBirr
        .connect(admin)
        .wipeFrozenBalance(user.address, "COURT_ORDER_001");

      expect(await stableBirr.balanceOf(user.address)).to.equal(0);
      expect(await stableBirr.totalFrozenWiped()).to.equal(balanceBefore);
    });

    it("Should handle unfreeze → unblacklist workflow", async function () {
      // Freeze and blacklist
      await stableBirr.connect(admin).freeze(user.address, "Investigation");
      await stableBirr.connect(admin).blacklist(user.address);

      // Unfreeze after investigation
      await stableBirr.connect(admin).unfreeze(user.address, "Cleared");
      expect(await stableBirr.isFrozen(user.address)).to.be.false;

      // Unblacklist to restore full access
      await stableBirr.connect(admin).unblacklist(user.address);
      expect(await stableBirr.isBlacklisted(user.address)).to.be.false;

      // User should be able to transfer now
      await expect(
        stableBirr
          .connect(user)
          .transfer(operator.address, ethers.parseUnits("100", 18))
      ).to.not.be.reverted;
    });
  });
});
