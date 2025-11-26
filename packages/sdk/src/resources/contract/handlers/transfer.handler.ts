import { ethers } from "ethers";
import type { TransferParams } from "@/resources/contract/contract.types";
import { ContractError } from "@/core/errors";
import type { StableBirr } from "@/typechain-types";
export async function transfer(
  contract: StableBirr,
  signer: ethers.Signer,
  params: TransferParams
): Promise<ethers.TransactionResponse> {
  try {
    const tx = await contract
      .connect(signer)
      .transfer(
        params.to,
        ethers.parseUnits(params.amount, 18),
        params.options || {}
      );
    return tx;
  } catch (error: unknown) {
    throw new ContractError("Transfer failed", error);
  }
}
