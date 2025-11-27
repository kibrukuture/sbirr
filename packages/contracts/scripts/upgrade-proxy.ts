import { ethers, upgrades } from "hardhat";

/**
 * Upgrade existing StableBirr proxy to oracle-free version
 *
 * This upgrades the implementation while keeping the same proxy address
 */

async function main() {
  const [deployer] = await ethers.getSigners();

  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

  if (!CONTRACT_ADDRESS) throw new Error("CONTRACT_ADDRESS Not Available.");

  console.log("🔄 Upgrading StableBirr proxy...\n");
  console.log("Proxy address:", CONTRACT_ADDRESS);
  console.log("Upgrading with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "POL\n"
  );

  // Get the new implementation factory
  const StableBirrV2 = await ethers.getContractFactory("StableBirr");

  console.log("⏳ Upgrading implementation...");

  // Upgrade the proxy to the new implementation
  const upgraded = await upgrades.upgradeProxy(CONTRACT_ADDRESS, StableBirrV2);
  await upgraded.waitForDeployment();

  const newImplementation = await upgrades.erc1967.getImplementationAddress(
    CONTRACT_ADDRESS
  );

  console.log("✅ Upgrade complete!");
  console.log("   Proxy address (unchanged):", CONTRACT_ADDRESS);
  console.log("   New implementation:", newImplementation);

  // Verify the upgrade worked
  console.log("\n🔍 Verifying upgrade...");
  const contract = await ethers.getContractAt("StableBirr", CONTRACT_ADDRESS);
  const name = await contract.name();
  const symbol = await contract.symbol();
  const admin = await contract.schnlAdmin();

  console.log("   Name:", name);
  console.log("   Symbol:", symbol);
  console.log("   Admin:", admin);

  console.log("\n✨ Upgrade successful!");
  console.log("\n📝 Your contract address is still:", CONTRACT_ADDRESS);
  console.log("   (No need to update SDK or demo!)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
