import { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function getImplementationAddress() {
  const proxyAddress = process.env.CONTRACT_ADDRESS;

  if (!proxyAddress) {
    throw new Error("CONTRACT_ADDRESS not found in .env");
  }

  console.log("Proxy Address:", proxyAddress);

  // Use OpenZeppelin's upgrades plugin to get implementation
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(
    proxyAddress
  );

  console.log("\n✅ Implementation Address:", implementationAddress);
  console.log("\nVerify with:");
  console.log(`npx hardhat verify --network polygon ${implementationAddress}`);

  return implementationAddress;
}

getImplementationAddress()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
