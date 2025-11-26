export { StableBirr } from "@/client";
export { StableBirr as default } from "@/client";

// Export types
export * from "@/types";

// Export error classes
export * from "@/core/errors";

// Export resources
export * from "@/resources/contract";
export * from "@/resources/nbe";

// Export utility namespaces
export * as Utils from "@/utils/formatting";
export * as Conversion from "@/utils/conversion";

// Re-export ethers utilities for convenience
// Users can now do: import { ethers, parseUnits } from "@tolbel/sbirr"
export { ethers } from "ethers";
export {
  parseUnits,
  formatUnits,
  parseEther,
  formatEther,
  isAddress,
  getAddress,
  keccak256,
  solidityPackedKeccak256,
  toUtf8Bytes,
  toUtf8String,
  hexlify,
  zeroPadValue,
  MaxUint256,
  ZeroAddress,
  type TransactionResponse,
  type TransactionReceipt,
  type Provider,
  type Signer,
  type ContractTransactionResponse,
} from "ethers";
