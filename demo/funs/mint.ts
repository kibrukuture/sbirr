import type StableBirr from "@tolbel/sbirr";

export async function mint(sbirr: StableBirr, to: string) {
  const result = await sbirr.contract.mint({
    to,
    amount: "1",
    usdAmount: "0.0067",
    rate: 150,
  });
  await result.wait();
  return { hash: result.hash, amount: "1 SBirr" };
}
