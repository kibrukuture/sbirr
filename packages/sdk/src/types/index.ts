import type { TransactionReceipt } from "ethers";

/**
 * Configuration envelope shared by every StableBirr SDK resource.
 *
 * This object centralizes how the SDK chooses networks, RPC endpoints, and signer context, ensuring
 * every resource operates against the same chain and custody settings.
 * Providing a deterministic config object lets the SDK instantiate the contract resource,
 * the NBE resource, and every helper module with identical context so you cannot accidentally
 * mint on Polygon while reporting against Mainnet. All properties are optional because
 * sensible defaults are supplied (Polygon public RPC + the canonical contract address),
 * but production environments are expected to inject explicit values.
 */
export interface StableBirrConfig {
  /**
   * Named network the SDK should target. The value selects both default RPC providers and the
   * canonical SBirr deployment address.
   * @default 'polygon'
   */
  network?: "mainnet" | "polygon" | "amoy" | "local";

  /**
   * Fully qualified RPC URL. When omitted the SDK falls back to ethers.js default providers,
   * which is acceptable for prototyping but not recommended for regulated treasury operations.
   */
  rpcUrl?: string;

  /**
   * Hex-encoded private key used to sign privileged transactions (mint, burn, blacklist, etc.).
   * Can be omitted for read-only flows such as balance queries or public metadata calls.
   */
  privateKey?: string;

  /**
   * Optional override for the StableBirr contract address. Useful for local forks/tests or when
   * interacting with pre-release deployments before addresses are promoted to the constants file.
   */
  contractAddress?: string;
}

export interface TransactionOptions {
  gasLimit?: number;
  gasPrice?: string;
  nonce?: number;
}

export interface TransactionResult {
  hash: string;
  wait: () => Promise<TransactionReceipt | null>;
}
