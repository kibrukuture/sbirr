import { ethers, upgrades } from "hardhat";

async function main() {
  console.log("🚀 Deploying StableBirr...\n");

  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH\n"
  );

  // Deploy parameters
  const schnlAdmin = deployer.address; // For testing, use deployer as admin
  const schnlOperator = deployer.address; // For testing, use deployer as operator
  const oracle = ethers.ZeroAddress; // No oracle for local testing

  console.log("Deploy parameters:");
  console.log("  Schnl Admin:", schnlAdmin);
  console.log("  Schnl Operator:", schnlOperator);
  console.log(
    "  Oracle:",
    oracle === ethers.ZeroAddress ? "None (will set later)" : oracle
  );
  console.log();

  // Deploy using UUPS proxy pattern
  const StableBirr = await ethers.getContractFactory("StableBirr");

  console.log("⏳ Deploying proxy and implementation...");
  const stableBirr = await upgrades.deployProxy(
    StableBirr,
    [schnlAdmin, schnlOperator, oracle],
    {
      kind: "uups",
      initializer: "initialize",
    }
  );

  await stableBirr.waitForDeployment();
  const proxyAddress = await stableBirr.getAddress();

  console.log("✅ StableBirr deployed!");
  console.log("   Proxy address:", proxyAddress);
  console.log();

  // Get implementation address
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(
    proxyAddress
  );
  console.log("   Implementation address:", implementationAddress);
  console.log();

  // Verify deployment
  console.log("🔍 Verifying deployment...");
  const name = await stableBirr.name();
  const symbol = await stableBirr.symbol();
  const decimals = await stableBirr.decimals();
  const admin = await stableBirr.schnlAdmin();
  const operator = await stableBirr.schnlOperator();

  console.log("   Name:", name);
  console.log("   Symbol:", symbol);
  console.log("   Decimals:", decimals);
  console.log("   Admin:", admin);
  console.log("   Operator:", operator);
  console.log();

  console.log("✨ Deployment complete!");
  console.log();
  console.log("📝 Save this address for interacting with the contract:");
  console.log("   ", proxyAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
