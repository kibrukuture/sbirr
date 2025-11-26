import type { StableBirr } from "@/typechain-types";
import { ethers } from "ethers";
import type { MintParams } from "@/resources/contract/contract.types";
import { ContractError } from "@/core/errors";

export async function mint(
  contract: StableBirr,
  signer: ethers.Signer,
  params: MintParams
): Promise<ethers.TransactionResponse> {
  try {
    const tx = await contract
      .connect(signer)
      .mint(
        params.to,
        ethers.parseUnits(params.amount, 18),
        ethers.parseUnits(params.usdAmount, 18),
        ethers.parseUnits(params.rate.toString(), 18),
        params.options || {}
      );
    return tx;
  } catch (error: unknown) {
    throw new ContractError("Mint failed", error);
  }
}
