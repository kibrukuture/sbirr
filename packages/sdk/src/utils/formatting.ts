import { ethers } from "ethers";

/**
 * Format raw amount to human readable string
 * @param amount Raw amount (wei)
 * @param decimals Decimals (default 18)
 * @returns Formatted string (e.g. "1.5")
 */
export function formatAmount(
  amount: string | bigint,
  decimals: number = 18
): string {
  return ethers.formatUnits(amount, decimals);
}

/**
 * Parse human readable string to raw amount
 * @param amount Formatted string (e.g. "1.5")
 * @param decimals Decimals (default 18)
 * @returns Raw amount string (wei)
 */
export function parseAmount(amount: string, decimals: number = 18): string {
  return ethers.parseUnits(amount, decimals).toString();
}

/**
 * Format address to checksum address
 * @param address Address to format
 * @returns Checksum address
 */
export function formatAddress(address: string): string {
  return ethers.getAddress(address);
}
