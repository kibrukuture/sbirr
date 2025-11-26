import StableBirr, { ethers } from "@tolbel/sbirr";

// Test that the SDK is self-contained and works
const sbirr = new StableBirr({
  network: "amoy",
  rpcUrl: "https://rpc-amoy.polygon.technology",
});

console.log("✅ SDK imported successfully!");
console.log("✅ StableBirr class instantiated!");
console.log("✅ Contract address:");
console.log("✅ ethers imported from SDK:", typeof ethers.parseUnits);
console.log("✅ Type check:", sbirr.contract.address);
