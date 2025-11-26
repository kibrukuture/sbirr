import { ethers } from "ethers";
import type { BurnParams } from "@/resources/contract/contract.types";
import { ContractError } from "@/core/errors";
import type { StableBirr } from "@/typechain-types";

export async function burn(
  contract: StableBirr,
  signer: ethers.Signer,
  params: BurnParams
): Promise<ethers.TransactionResponse> {
  try {
    const tx = await contract
      .connect(signer)
      .burn(
        params.from,
        ethers.parseUnits(params.amount, 18),
        params.merchantId,
        params.options || {}
      );
    return tx;
  } catch (error: unknown) {
    throw new ContractError("Burn failed", error);
  }
}
