import { ethers } from "hardhat";

async function main() {
  // Use the deployed contract address
  const contractAddress = "0x610178dA211FEF7D417bC0e6FeD39F05609AD788";

  console.log("🔗 Connecting to StableBirr at:", contractAddress);
  console.log();

  // Get contract instance
  const StableBirr = await ethers.getContractFactory("StableBirr");
  const contract = StableBirr.attach(contractAddress);

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("Using account:", signer.address);
  console.log();

  // Read contract state
  console.log("📊 Contract Information:");
  console.log("   Name:", await contract.name());
  console.log("   Symbol:", await contract.symbol());
  console.log(
    "   Total Supply:",
    ethers.formatEther(await contract.totalSupply()),
    "SBirr"
  );
  console.log("   Admin:", await contract.schnlAdmin());
  console.log("   Operator:", await contract.schnlOperator());
  console.log();

  // Check if paused
  const paused = await contract.paused();
  console.log("   Status:", paused ? "⏸️  PAUSED" : "✅ ACTIVE");
  console.log();

  // Step 1: Deploy a mock oracle
  console.log("🔮 Deploying mock oracle...");
  const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
  const mockOracle = await MockPriceFeed.deploy(8); // 8 decimals for USD price feeds
  await mockOracle.waitForDeployment();
  const oracleAddress = await mockOracle.getAddress();
  console.log("✅ Mock oracle deployed at:", oracleAddress);
  console.log();

  // Step 2: Set the oracle
  console.log("⚙️  Configuring oracle...");
  const setOracleTx = await contract.updateFxOracle(oracleAddress);
  await setOracleTx.wait();
  console.log("✅ Oracle configured!");
  console.log();

  // Step 3: Set a mock rate in the oracle (120 ETB/USD with 8 decimals)
  console.log("📊 Setting oracle rate to 120 ETB/USD...");
  const mockRate = 120 * 10 ** 8; // 120 ETB/USD with 8 decimals
  const setRateTx = await mockOracle.setLatestAnswer(
    mockRate,
    Math.floor(Date.now() / 1000)
  );
  await setRateTx.wait();
  console.log("✅ Oracle rate set!");
  console.log();

  // Step 4: Unpause if needed
  if (paused) {
    console.log("⏳ Unpausing contract...");
    const tx = await contract.unpause("Initial unpause for testing");
    await tx.wait();
    console.log("✅ Contract unpaused!");
    console.log();
  }

  // Step 5: Mint some tokens
  console.log("💰 Minting test tokens...");
  const recipient = signer.address;
  const amount = ethers.parseEther("120000"); // 120,000 SBirr (1000 USD * 120 rate)
  const usdAmount = ethers.parseEther("1000"); // $1000 USD
  const rate = ethers.parseEther("120"); // 120 ETB/USD

  try {
    const mintTx = await contract.mint(recipient, amount, usdAmount, rate);
    console.log("   Transaction hash:", mintTx.hash);
    await mintTx.wait();
    console.log("✅ Minted 120,000 SBirr!");
    console.log();

    // Check balance
    const balance = await contract.balanceOf(recipient);
    console.log("📊 Your balance:", ethers.formatEther(balance), "SBirr");
    console.log();

    // Check total supply
    const totalSupply = await contract.totalSupply();
    console.log("📊 Total supply:", ethers.formatEther(totalSupply), "SBirr");
    console.log();

    // Check USD converted
    const totalUSD = await contract.totalUSDConverted();
    console.log("� Total USD converted:", ethers.formatEther(totalUSD), "USD");
  } catch (error: any) {
    console.error("❌ Mint failed!");
    console.error("   Error:", error.message);
    if (error.data) {
      console.error("   Data:", error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
