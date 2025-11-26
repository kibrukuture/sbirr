import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🔧 Configuring minter...\n");
  console.log("Admin address:", deployer.address);

  const contract = await ethers.getContractAt(
    "StableBirr",
    "0xFaa6E8Ee77368613c804f51029CAb30677967F67"
  );

  // Configure yourself as a minter with unlimited allowance
  const tx = await contract.configureMinter(
    deployer.address, // minter address
    ethers.MaxUint256, // unlimited allowance
    true // can burn
  );

  console.log("📝 Transaction sent:", tx.hash);
  console.log("⏳ Waiting for confirmation...");

  const receipt = await tx.wait();
  console.log("✅ Minter configured!");
  console.log("📦 Block:", receipt?.blockNumber);
  console.log("\n🎉 You can now mint SBirr tokens!");
}

main();
