import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import type { StableBirr, MockPriceFeed } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ZeroAddress } from "ethers";

/**
 * Test Suite: StableBirr Access Control
 *
 * **What we're testing**
 * - Admin role updates and transfers
 * - Operator role updates
 * - Minter configuration and removal
 * - Permission enforcement across all privileged functions
 * - Role-based access control integrity
 *
 * **Why these tests matter**
 * Access control is the foundation of security. Any bug here could allow unauthorized minting,
 * burning, or governance changes. These tests ensure only authorized addresses can execute
 * privileged operations.
 */
describe("StableBirr - Access Control", function () {
  let stableBirr: StableBirr;
  let mockOracle: MockPriceFeed;
  let admin: SignerWithAddress;
  let operator: SignerWithAddress;
  let newAdmin: SignerWithAddress;
  let newOperator: SignerWithAddress;
  let minter: SignerWithAddress;
  let attacker: SignerWithAddress;

  beforeEach(async function () {
    const [admin, operator, newAdmin, newOperator, minter, attacker] =
      await ethers.getSigners();

    const MockPriceFeedFactory = await ethers.getContractFactory(
      "MockPriceFeed"
    );
    mockOracle = await MockPriceFeedFactory.deploy(8);
    await mockOracle.waitForDeployment();

    const currentTime = await ethers.provider
      .getBlock("latest")
      .then((b) => b!.timestamp);
    await mockOracle.setLatestAnswer(120_00000000, currentTime);

    const StableBirrFactory = await ethers.getContractFactory("StableBirr");
    stableBirr = (await upgrades.deployProxy(
      StableBirrFactory,
      [admin.address, operator.address, await mockOracle.getAddress()],
      { kind: "uups" }
    )) as unknown as StableBirr;
    await stableBirr.waitForDeployment();

    await stableBirr.connect(admin).unpause("Initial deployment");
  });

  describe("Admin Role Management", function () {
    it("Should update admin address", async function () {
      await expect(stableBirr.connect(admin).updateSchnlAdmin(newAdmin.address))
        .to.emit(stableBirr, "SchnlAdminUpdated")
        .withArgs(admin.address, newAdmin.address);

      expect(await stableBirr.schnlAdmin()).to.equal(newAdmin.address);
    });

    it("Should allow new admin to perform admin functions", async function () {
      await stableBirr.connect(admin).updateSchnlAdmin(newAdmin.address);

      // New admin should be able to pause
      await expect(stableBirr.connect(newAdmin).pause("Testing new admin")).to
        .not.be.reverted;
    });

    it("Should prevent old admin from performing admin functions after transfer", async function () {
      await stableBirr.connect(admin).updateSchnlAdmin(newAdmin.address);

      await expect(
        stableBirr.connect(admin).pause("Old admin attempt")
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");
    });

    it("Should reject admin update to zero address", async function () {
      await expect(
        stableBirr.connect(admin).updateSchnlAdmin(ZeroAddress)
      ).to.be.revertedWithCustomError(stableBirr, "ZeroAddress");
    });

    it("Should reject admin update from non-admin", async function () {
      await expect(
        stableBirr.connect(operator).updateSchnlAdmin(newAdmin.address)
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");

      await expect(
        stableBirr.connect(attacker).updateSchnlAdmin(newAdmin.address)
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");
    });
  });

  describe("Operator Role Management", function () {
    it("Should update operator address", async function () {
      await expect(
        stableBirr.connect(admin).updateSchnlOperator(newOperator.address)
      )
        .to.emit(stableBirr, "SchnlOperatorUpdated")
        .withArgs(operator.address, newOperator.address);

      expect(await stableBirr.schnlOperator()).to.equal(newOperator.address);
    });

    it("Should allow new operator to mint", async function () {
      await stableBirr.connect(admin).updateSchnlOperator(newOperator.address);

      // Configure new operator as minter
      await stableBirr
        .connect(admin)
        .configureMinter(newOperator.address, ethers.MaxUint256, true);

      const usdAmount = ethers.parseUnits("100", 18);
      const sbirrAmount = ethers.parseUnits("12000", 18);
      const rate = ethers.parseUnits("120", 18);

      await expect(
        stableBirr
          .connect(newOperator)
          .mint(minter.address, sbirrAmount, usdAmount, rate)
      ).to.not.be.reverted;
    });

    it("Should reject operator update to zero address", async function () {
      await expect(
        stableBirr.connect(admin).updateSchnlOperator(ZeroAddress)
      ).to.be.revertedWithCustomError(stableBirr, "ZeroAddress");
    });

    it("Should reject operator update from non-admin", async function () {
      await expect(
        stableBirr.connect(operator).updateSchnlOperator(newOperator.address)
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");
    });
  });

  describe("Minter Configuration", function () {
    it("Should configure a new minter with allowance", async function () {
      const allowance = ethers.parseUnits("100000", 18);

      await expect(
        stableBirr
          .connect(admin)
          .configureMinter(minter.address, allowance, true)
      )
        .to.emit(stableBirr, "MinterConfigured")
        .withArgs(minter.address, allowance, true);

      expect(await stableBirr.isMinter(minter.address)).to.be.true;
      expect(await stableBirr.minterAllowance(minter.address)).to.equal(
        allowance
      );
      expect(await stableBirr.minterCanBurn(minter.address)).to.be.true;
    });

    it("Should configure minter without burn permission", async function () {
      const allowance = ethers.parseUnits("50000", 18);

      await stableBirr
        .connect(admin)
        .configureMinter(minter.address, allowance, false);

      expect(await stableBirr.isMinter(minter.address)).to.be.true;
      expect(await stableBirr.minterCanBurn(minter.address)).to.be.false;
    });

    it("Should update existing minter configuration", async function () {
      const initialAllowance = ethers.parseUnits("50000", 18);
      await stableBirr
        .connect(admin)
        .configureMinter(minter.address, initialAllowance, false);

      const newAllowance = ethers.parseUnits("100000", 18);
      await stableBirr
        .connect(admin)
        .configureMinter(minter.address, newAllowance, true);

      expect(await stableBirr.minterAllowance(minter.address)).to.equal(
        newAllowance
      );
      expect(await stableBirr.minterCanBurn(minter.address)).to.be.true;
    });

    it("Should configure minter with unlimited allowance", async function () {
      await stableBirr
        .connect(admin)
        .configureMinter(minter.address, ethers.MaxUint256, true);

      expect(await stableBirr.minterAllowance(minter.address)).to.equal(
        ethers.MaxUint256
      );
    });

    it("Should reject minter configuration to zero address", async function () {
      await expect(
        stableBirr
          .connect(admin)
          .configureMinter(ZeroAddress, ethers.parseUnits("100000", 18), true)
      ).to.be.revertedWithCustomError(stableBirr, "InvalidAddress");
    });

    it("Should reject minter configuration from non-admin", async function () {
      await expect(
        stableBirr
          .connect(operator)
          .configureMinter(
            minter.address,
            ethers.parseUnits("100000", 18),
            true
          )
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");
    });
  });

  describe("Minter Removal", function () {
    beforeEach(async function () {
      await stableBirr
        .connect(admin)
        .configureMinter(minter.address, ethers.parseUnits("100000", 18), true);
    });

    it("Should remove a minter", async function () {
      await expect(stableBirr.connect(admin).removeMinter(minter.address))
        .to.emit(stableBirr, "MinterRemoved")
        .withArgs(minter.address);

      expect(await stableBirr.isMinter(minter.address)).to.be.false;
      expect(await stableBirr.minterAllowance(minter.address)).to.equal(0);
      expect(await stableBirr.minterCanBurn(minter.address)).to.be.false;
    });

    it("Should be idempotent when removing non-existent minter", async function () {
      await stableBirr.connect(admin).removeMinter(minter.address);

      await expect(stableBirr.connect(admin).removeMinter(minter.address)).to
        .not.be.reverted;
    });

    it("Should prevent removed minter from minting", async function () {
      await stableBirr.connect(admin).removeMinter(minter.address);

      const usdAmount = ethers.parseUnits("100", 18);
      const sbirrAmount = ethers.parseUnits("12000", 18);
      const rate = ethers.parseUnits("120", 18);

      await expect(
        stableBirr
          .connect(minter)
          .mint(attacker.address, sbirrAmount, usdAmount, rate)
      ).to.be.revertedWithCustomError(stableBirr, "NotAuthorizedMinter");
    });

    it("Should reject minter removal from non-admin", async function () {
      await expect(
        stableBirr.connect(operator).removeMinter(minter.address)
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");
    });
  });

  describe("Permission Enforcement - Admin Functions", function () {
    it("Should restrict blacklist to admin only", async function () {
      await expect(
        stableBirr.connect(operator).blacklist(attacker.address)
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");
    });

    it("Should restrict freeze to admin only", async function () {
      await expect(
        stableBirr.connect(operator).freeze(attacker.address, "Test")
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");
    });

    it("Should restrict pause to admin only", async function () {
      await expect(
        stableBirr.connect(operator).pause("Test")
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");
    });

    it("Should restrict oracle update to admin only", async function () {
      await expect(
        stableBirr
          .connect(operator)
          .updateFxOracle(await mockOracle.getAddress())
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");
    });

    it("Should restrict supply cap update to admin only", async function () {
      await expect(
        stableBirr
          .connect(operator)
          .setSupplyCap(ethers.parseUnits("1000000", 18))
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");
    });

    it("Should restrict rescue to admin only", async function () {
      await expect(
        stableBirr
          .connect(operator)
          .rescueERC20(await mockOracle.getAddress(), admin.address, 100)
      ).to.be.revertedWithCustomError(stableBirr, "OnlySchnlAdmin");
    });
  });

  describe("Permission Enforcement - Minter Functions", function () {
    it("Should restrict mint to authorized minters", async function () {
      const usdAmount = ethers.parseUnits("100", 18);
      const sbirrAmount = ethers.parseUnits("12000", 18);
      const rate = ethers.parseUnits("120", 18);

      await expect(
        stableBirr
          .connect(attacker)
          .mint(minter.address, sbirrAmount, usdAmount, rate)
      ).to.be.revertedWithCustomError(stableBirr, "NotAuthorizedMinter");
    });

    it("Should restrict burn to authorized burners", async function () {
      // Mint tokens first
      const usdAmount = ethers.parseUnits("100", 18);
      const sbirrAmount = ethers.parseUnits("12000", 18);
      const rate = ethers.parseUnits("120", 18);
      await stableBirr
        .connect(operator)
        .mint(attacker.address, sbirrAmount, usdAmount, rate);

      // Try to burn without permission
      await expect(
        stableBirr
          .connect(attacker)
          .burn(attacker.address, ethers.parseUnits("100", 18), "MERCHANT_X")
      ).to.be.revertedWithCustomError(stableBirr, "NotAuthorizedMinter");
    });
  });

  describe("Operator Default Permissions", function () {
    it("Should allow operator to mint by default", async function () {
      expect(await stableBirr.isMinter(operator.address)).to.be.true;
      expect(await stableBirr.minterAllowance(operator.address)).to.equal(
        ethers.MaxUint256
      );
    });

    it("Should allow operator to burn by default", async function () {
      expect(await stableBirr.minterCanBurn(operator.address)).to.be.true;
    });

    it("Should maintain operator permissions after role transfer", async function () {
      await stableBirr.connect(admin).updateSchnlOperator(newOperator.address);

      // Old operator should still have minter permissions (they're separate)
      expect(await stableBirr.isMinter(operator.address)).to.be.true;

      // New operator needs to be configured as minter
      expect(await stableBirr.isMinter(newOperator.address)).to.be.false;
    });
  });

  describe("Multi-Minter Scenarios", function () {
    it("Should support multiple active minters", async function () {
      const minter1 = minter;
      const minter2 = newOperator;

      await stableBirr
        .connect(admin)
        .configureMinter(
          minter1.address,
          ethers.parseUnits("50000", 18),
          false
        );

      await stableBirr
        .connect(admin)
        .configureMinter(
          minter2.address,
          ethers.parseUnits("100000", 18),
          true
        );

      expect(await stableBirr.isMinter(minter1.address)).to.be.true;
      expect(await stableBirr.isMinter(minter2.address)).to.be.true;
      expect(await stableBirr.minterCanBurn(minter1.address)).to.be.false;
      expect(await stableBirr.minterCanBurn(minter2.address)).to.be.true;
    });

    it("Should track allowances independently per minter", async function () {
      const minter1 = minter;
      const minter2 = newOperator;

      await stableBirr
        .connect(admin)
        .configureMinter(
          minter1.address,
          ethers.parseUnits("50000", 18),
          false
        );

      await stableBirr
        .connect(admin)
        .configureMinter(
          minter2.address,
          ethers.parseUnits("100000", 18),
          false
        );

      const usdAmount = ethers.parseUnits("100", 18);
      const sbirrAmount = ethers.parseUnits("12000", 18);
      const rate = ethers.parseUnits("120", 18);

      await stableBirr
        .connect(minter1)
        .mint(attacker.address, sbirrAmount, usdAmount, rate);

      expect(await stableBirr.minterAllowance(minter1.address)).to.equal(
        ethers.parseUnits("50000", 18) - sbirrAmount
      );
      expect(await stableBirr.minterAllowance(minter2.address)).to.equal(
        ethers.parseUnits("100000", 18)
      );
    });
  });
});
