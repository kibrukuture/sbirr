import type StableBirr from "@tolbel/sbirr";

export async function mint(sbirr: StableBirr, to: string) {
  const before = performance.now();
  const result = await sbirr.contract.mint({
    to,
    amount: "1",
    usdAmount: "0.0067",
    rate: 150,
  });
  // await result.wait();
  const after = performance.now();
  return {
    hash: result.hash,
    amount: "1 SBirr",
    duration: `${(after - before) / 1000}s`,
  };
}
