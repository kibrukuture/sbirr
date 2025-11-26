import type StableBirr from "@tolbel/sbirr";

export async function burn(
  sbirr: StableBirr,
  from: string,
  amount: string,
  merchantId: string
) {
  const result = await sbirr.contract.burn({
    from,
    amount,
    merchantId,
  });
  await result.wait();
  return { hash: result.hash, from, amount: `${amount} SBirr` };
}
