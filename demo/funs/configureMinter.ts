import type StableBirr from "@tolbel/sbirr";
import type { AllowanceValue } from "@tolbel/sbirr";

export async function configureMinter(
  sbirr: StableBirr,
  minter: string,
  allowance: AllowanceValue,
  canBurn: boolean
) {
  const result = await sbirr.contract.configureMinter({
    minter,
    allowance,
    canBurn,
  });
  await result.wait();
  return { hash: result.hash, minter, allowance, canBurn };
}
