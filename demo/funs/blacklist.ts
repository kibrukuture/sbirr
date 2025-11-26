import type StableBirr from "@tolbel/sbirr";

export async function blacklist(sbirr: StableBirr, account: string) {
  const startTime = performance.now();

  // Check if already blacklisted to avoid wasting gas
  const isAlreadyBlacklisted = await sbirr.contract.isBlacklisted(account);
  if (isAlreadyBlacklisted) {
    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    return {
      message: "Already blacklisted",
      account,
      duration: `${duration}s`,
    };
  }

  const result = await sbirr.contract.blacklist({ account });
  await result.wait(1);
  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  return { hash: result.hash, account, duration: `${duration}s` };
}
