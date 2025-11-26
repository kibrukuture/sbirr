import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const contractAddress =
    process.env.CONTRACT_ADDRESS ||
    "0xA80E0bFE59546D4f40d96CdAab2701b179C66Be5";

  console.log("🔓 Unpausing StableBirr contract...\n");
  console.log("Contract:", contractAddress);
  console.log("Admin:", deployer.address);
  console.log();

  const contract = await ethers.getContractAt("StableBirr", contractAddress);

  console.log("📝 Unpausing...");
  const tx = await contract.unpause(
    "Initial deployment - ready for production"
  );
  await tx.wait();

  console.log("✅ Contract unpaused!");
  console.log("   Transaction:", tx.hash);

  const isPaused = await contract.paused();
  console.log("\n📋 Status:");
  console.log("   Paused:", isPaused);

  console.log("\n🎉 Contract is now ready for minting!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
