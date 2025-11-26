import { ethers } from "ethers";
import { ValidationError } from "@/core/errors";

export function validateAddress(address: string): string {
  if (!ethers.isAddress(address)) {
    throw new ValidationError(`Invalid Ethereum address: ${address}`);
  }
  return address;
}

export function validateAmount(amount: string): string {
  try {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      throw new ValidationError(
        `Invalid amount: ${amount}. Must be positive number.`
      );
    }
    return amount;
  } catch (e) {
    throw new ValidationError(`Invalid amount format: ${amount}`);
  }
}

export function validateRate(rate: number): number {
  if (rate <= 0) {
    throw new ValidationError(
      `Invalid exchange rate: ${rate}. Must be positive.`
    );
  }
  return rate;
}
