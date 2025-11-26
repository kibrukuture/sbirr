import type StableBirr from "@tolbel/sbirr";

export async function freeze(
  sbirr: StableBirr,
  account: string,
  reason: string
) {
  const startTime = performance.now();
  const result = await sbirr.contract.freeze({ account, reason });
  await result.wait();
  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  return { hash: result.hash, account, reason, duration: `${duration}s` };
}
