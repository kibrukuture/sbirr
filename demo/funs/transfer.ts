import type StableBirr from "@tolbel/sbirr";

export async function transfer(sbirr: StableBirr, to: string, amount: string) {
  const startTime = performance.now();
  const result = await sbirr.contract.transfer({ to, amount });
  await result.wait(1);
  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  return {
    hash: result.hash,
    to,
    amount: `${amount} SBirr`,
    duration: `${duration}s`,
  };
}
