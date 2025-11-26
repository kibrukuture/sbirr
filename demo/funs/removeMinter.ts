import type StableBirr from "@tolbel/sbirr";

export async function removeMinter(sbirr: StableBirr, minter: string) {
  const result = await sbirr.contract.removeMinter({ minter });
  await result.wait();
  return { hash: result.hash, minter };
}
