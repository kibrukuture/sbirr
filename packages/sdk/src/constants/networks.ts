export const NETWORKS = {
  mainnet: {
    name: "Ethereum Mainnet",
    chainId: 1,
    rpcUrl: "https://eth.llamarpc.com",
  },
  polygon: {
    name: "Polygon Mainnet",
    chainId: 137,
    rpcUrl: "https://polygon-rpc.com",
  },
  amoy: {
    name: "Polygon Amoy Testnet",
    chainId: 80002,
    rpcUrl: "https://rpc-amoy.polygon.technology",
  },
  local: {
    name: "Localhost",
    chainId: 31337,
    rpcUrl: "http://127.0.0.1:8545",
  },
};
