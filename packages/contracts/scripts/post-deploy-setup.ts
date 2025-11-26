import { ethers } from "hardhat";

/**
 * Simple Post-Deployment Setup Script
 *
 * This script configures a freshly deployed StableBirr contract with:
 * 1. Authorized minter (deployer address)
 *
 * Run this IMMEDIATELY after deploying the contract.
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  const contractAddress =
    process.env.CONTRACT_ADDRESS ||
    "0xFaa6E8Ee77368613c804f51029CAb30677967F67";

  console.log("🚀 Post-Deployment Setup\n");
  console.log("Contract:", contractAddress);
  console.log("Admin:", deployer.address);
  console.log();

  const contract = await ethers.getContractAt("StableBirr", contractAddress);

  // Configure Minter
  console.log("📝 Configuring minter...");
  const tx = await contract.configureMinter(
    deployer.address,
    ethers.MaxUint256, // unlimited allowance
    true // can burn
  );
  await tx.wait();
  console.log("✅ Minter configured");
  console.log("   Address:", deployer.address);
  console.log("   Allowance: Unlimited");
  console.log("   Can burn: Yes\n");

  // Verify configuration
  console.log("🔍 Verifying configuration...");
  const admin = await contract.schnlAdmin();
  const operator = await contract.schnlOperator();
  const isMinter = await contract.isMinter(deployer.address);

  console.log("\n📋 Final Configuration:");
  console.log("   Admin:", admin);
  console.log("   Operator:", operator);
  console.log("   Is Minter:", isMinter);

  console.log("\n🎉 Setup complete! You can now mint SBirr tokens.");
  console.log("\n📝 Next steps:");
  console.log("   1. Unpause contract: contract.unpause('Initial deployment')");
  console.log("   2. Test minting: cd ../../demo && bun index.ts");
  console.log("   3. View in MetaMask: Import token", contractAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
