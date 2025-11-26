import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";

import * as dotenv from "dotenv";

dotenv.config();

/**
 * Hardhat configuration for StableBirr smart contracts.
 *
 * **Networks**
 * - `localhost`: Local Hardhat node for development
 * - `amoy`: Polygon testnet (formerly Mumbai)
 * - `polygon`: Polygon mainnet
 *
 * **Environment Variables Required**
 * - `PRIVATE_KEY`: Deployer private key
 * - `POLYGON_RPC_URL`: Polygon mainnet RPC endpoint
 * - `AMOY_RPC_URL`: Polygon Amoy testnet RPC endpoint
 * - `POLYGONSCAN_API_KEY`: For contract verification
 *
 * **Gas Reporting**
 * Set `REPORT_GAS=true` to enable gas usage reporting during tests.
 */
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: false,
    },
  },

  networks: {
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: false,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    amoy: {
      url: process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80002,
      gasPrice: "auto",
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137,
      gasPrice: "auto",
    },
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    outputFile: "gas-report.txt",
    noColors: true,
  },

  etherscan: {
    apiKey: {
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
    },
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  mocha: {
    timeout: 60000, // 60 seconds
  },

  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
