import type StableBirr from "@tolbel/sbirr";

export async function unblacklist(sbirr: StableBirr, account: string) {
  const startTime = performance.now();
  const result = await sbirr.contract.unblacklist({ account });
  await result.wait();
  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  return { hash: result.hash, account, duration: `${duration}s` };
}
