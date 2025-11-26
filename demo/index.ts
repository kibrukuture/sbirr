import StableBirr, { ethers, type MintParams } from "@tolbel/sbirr";

console.log({
  // .env vars;
  PRIVATE_KEY: !!process.env.PRIVATE_KEY,
  METAMASK_ADDRESS: !!process.env.METAMASK_ADDRESS,
  CONTRACT_ADDRESS: !!process.env.CONTRACT_ADDRESS,
});
async function main() {
  // Initialize SDK
  const sbirr = new StableBirr({
    network: "polygon",
    rpcUrl: "https://polygon-rpc.com", // this url must be givne.
    privateKey: process.env.PRIVATE_KEY!,
    contractAddress: process.env.CONTRACT_ADDRESS!,
  });

  console.log("🚀 Minting 1 SBirr to your MetaMask address...\n");
  console.log("📍 Recipient:", process.env.METAMASK_ADDRESS);
  console.log("💰 Amount: 1 SBirr (1 ETB)\n");

  try {
    // Mint 1 SBirr to your address
    const result = await sbirr.contract.mint({
      to: process.env.METAMASK_ADDRESS!, // YOUR MetaMask address
      amount: "1", // 1 SBirr (SDK will parse to 18 decimals)
      usdAmount: "0.0067", // $0.0067 USD (1 ETB / 150 rate) (SDK will parse to 18 decimals)
      rate: 150, // 150 ETB/USD (SDK will parse to 18 decimals)
    });

    console.log("✅ Mint transaction sent!");
    console.log("📝 Transaction hash:", result.hash);
    console.log("🔗 View on Polygonscan:");
    console.log(`   https://polygonscan.com/tx/${result.hash}\n`);

    // Wait for confirmation
    console.log("⏳ Waiting for confirmation...");
    const receipt = await result.wait();

    // Calculate actual cost
    const gasUsed = receipt?.gasUsed || 0n;
    const gasPrice = receipt?.gasPrice || 0n;
    const gasCostPOL = ethers.formatEther(gasUsed * gasPrice);
    const gasCostUSD = (parseFloat(gasCostPOL) * 0.13).toFixed(4); // POL = $0.13

    console.log("\n✅ Transaction confirmed!");
    console.log("📦 Block number:", receipt?.blockNumber);
    console.log("\n💸 Gas Cost:");
    console.log(`   ${gasCostPOL} POL ($${gasCostUSD} USD)`);
    console.log(`   Gas used: ${gasUsed.toString()} units`);

    console.log("\n🎉 Success! You now have 1 SBirr in your MetaMask!");
    console.log("👀 To see it in MetaMask:");
    console.log("   1. Open MetaMask");
    console.log("   2. Switch to Polygon network");
    console.log("   3. Click 'Import tokens'");
    console.log(
      `   4. Paste contract address: ${process.env.CONTRACT_ADDRESS}`
    );
    console.log("   5. Token symbol: SBirr");
    console.log("   6. Decimals: 18");
  } catch (error) {
    console.error("\n❌ Mint failed:", error);
  }
}

main();
