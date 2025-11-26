import type StableBirr from "@tolbel/sbirr";

export async function unfreeze(
  sbirr: StableBirr,
  account: string,
  reason: string
) {
  const result = await sbirr.contract.unfreeze({ account, reason });
  await result.wait();
  return { hash: result.hash, account, reason };
}
