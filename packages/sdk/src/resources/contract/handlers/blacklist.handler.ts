import { ethers } from "ethers";
import type { BlacklistParams } from "@/resources/contract/contract.types";
import { ContractError } from "@/core/errors";
import type { StableBirr } from "@/typechain-types";

export async function blacklist(
  contract: StableBirr,
  signer: ethers.Signer,
  params: BlacklistParams
): Promise<ethers.TransactionResponse> {
  try {
    const tx = await contract
      .connect(signer)
      .blacklist(params.account, params.options || {});
    return tx;
  } catch (error: unknown) {
    throw new ContractError("Blacklist failed", error);
  }
}

export async function unblacklist(
  contract: StableBirr,
  signer: ethers.Signer,
  params: BlacklistParams
): Promise<ethers.TransactionResponse> {
  try {
    const tx = await contract
      .connect(signer)
      .unblacklist(params.account, params.options || {});
    return tx;
  } catch (error: unknown) {
    throw new ContractError("Unblacklist failed", error);
  }
}
