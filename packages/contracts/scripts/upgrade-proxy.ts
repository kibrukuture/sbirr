import { ethers, upgrades } from "hardhat";

/**
 * Upgrade existing StableBirr proxy to oracle-free version
 *
 * This upgrades the implementation while keeping the same proxy address
 */

async function main() {
  const [deployer] = await ethers.getSigners();

  // OLD proxy address (the one you want to keep)
  const PROXY_ADDRESS = "0xFaa6E8Ee77368613c804f51029CAb30677967F67";

  console.log("🔄 Upgrading StableBirr proxy...\n");
  console.log("Proxy address:", PROXY_ADDRESS);
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
  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, StableBirrV2);
  await upgraded.waitForDeployment();

  const newImplementation = await upgrades.erc1967.getImplementationAddress(
    PROXY_ADDRESS
  );

  console.log("✅ Upgrade complete!");
  console.log("   Proxy address (unchanged):", PROXY_ADDRESS);
  console.log("   New implementation:", newImplementation);

  // Verify the upgrade worked
  console.log("\n🔍 Verifying upgrade...");
  const contract = await ethers.getContractAt("StableBirr", PROXY_ADDRESS);
  const name = await contract.name();
  const symbol = await contract.symbol();
  const admin = await contract.schnlAdmin();

  console.log("   Name:", name);
  console.log("   Symbol:", symbol);
  console.log("   Admin:", admin);

  console.log("\n✨ Upgrade successful!");
  console.log("\n📝 Your contract address is still:", PROXY_ADDRESS);
  console.log("   (No need to update SDK or demo!)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
