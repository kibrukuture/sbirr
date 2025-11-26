 
import { ValidationError } from "@/core/errors";

/**
 * Calculate ETB amount from USD amount and rate
 * @param usdAmount USD amount
 * @param rate Exchange rate (ETB per USD)
 * @returns ETB amount
 */
export function calculateEtbAmount(usdAmount: number, rate: number): number {
  if (usdAmount < 0) throw new ValidationError("USD amount must be positive");
  if (rate <= 0) throw new ValidationError("Rate must be positive");

  return usdAmount * rate;
}

/**
 * Calculate USD amount from ETB amount and rate
 * @param etbAmount ETB amount
 * @param rate Exchange rate (ETB per USD)
 * @returns USD amount
 */
export function calculateUsdAmount(etbAmount: number, rate: number): number {
  if (etbAmount < 0) throw new ValidationError("ETB amount must be positive");
  if (rate <= 0) throw new ValidationError("Rate must be positive");

  return etbAmount / rate;
}
