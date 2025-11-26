import type { ethers } from "ethers";
import { ContractError } from "@/core/errors";
import type {
  FreezeParams,
  UnfreezeParams,
  WipeFrozenParams,
} from "@/resources/contract/contract.types";
import type { StableBirr } from "@/typechain-types";

/**
 * Freeze an address at the contract level.
 */
export async function freeze(
  contract: StableBirr,
  signer: ethers.Signer,
  params: FreezeParams
): Promise<ethers.TransactionResponse> {
  try {
    const tx = await contract
      .connect(signer)
      .freeze(params.account, params.reason, params.options || {});
    return tx;
  } catch (error: unknown) {
    throw new ContractError("Failed to freeze account", error);
  }
}

/**
 * Unfreeze an address.
 */
export async function unfreeze(
  contract: StableBirr,
  signer: ethers.Signer,
  params: UnfreezeParams
): Promise<ethers.TransactionResponse> {
  try {
    const tx = await contract
      .connect(signer)
      .unfreeze(params.account, params.reason, params.options || {});
    return tx;
  } catch (error: unknown) {
    throw new ContractError("Failed to unfreeze account", error);
  }
}

/**
 * Wipe the balance of a frozen address.
 */
export async function wipeFrozenBalance(
  contract: StableBirr,
  signer: ethers.Signer,
  params: WipeFrozenParams
): Promise<ethers.TransactionResponse> {
  try {
    const tx = await contract
      .connect(signer)
      .wipeFrozenBalance(params.account, params.caseId, params.options || {});
    return tx;
  } catch (error: unknown) {
    throw new ContractError("Failed to wipe frozen balance", error);
  }
}
