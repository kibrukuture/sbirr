import { ethers } from "ethers";
import type { RescueParams } from "@/resources/contract/contract.types";
import { ContractError } from "@/core/errors";
import type { StableBirr } from "@/typechain-types";

export async function rescue(
  contract: StableBirr,
  signer: ethers.Signer,
  params: RescueParams
): Promise<ethers.TransactionResponse> {
  try {
    const tx = await contract
      .connect(signer)
      .rescueERC20(
        params.tokenAddress,
        params.to,
        ethers.parseUnits(params.amount, 18),
        params.options || {}
      );
    return tx;
  } catch (error: unknown) {
    throw new ContractError("Rescue failed", error);
  }
}
