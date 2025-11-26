import { ethers } from "ethers";
import type { PermitParams } from "@/resources/contract/contract.types";
import { ContractError } from "@/core/errors";
import type { StableBirr } from "@/typechain-types";

export async function permit(
  contract: StableBirr,
  signer: ethers.Signer,
  params: PermitParams
): Promise<ethers.TransactionResponse> {
  try {
    const tx = await contract
      .connect(signer)
      .permit(
        params.owner,
        params.spender,
        ethers.parseUnits(params.value, 18),
        params.deadline,
        params.v,
        params.r,
        params.s,
        params.options || {}
      );
    return tx;
  } catch (error: unknown) {
    throw new ContractError("Permit failed", error);
  }
}
