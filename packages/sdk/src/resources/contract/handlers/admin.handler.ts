import { ethers } from "ethers";
import { ContractError } from "@/core/errors";
import type {
  PauseParams,
  UnpauseParams,
  UpdateAdminParams,
  UpdateOperatorParams,
  UpdateOracleParams,
  SetRateToleranceParams,
  SetOracleStalePeriodParams,
  SetSupplyCapParams,
  ConfigureMinterParams,
  RemoveMinterParams,
} from "@/resources/contract/contract.types";
import type { StableBirr } from "@/typechain-types";

/**
 * Pause the contract.
 * Only callable by Schnl Admin.
 */
export async function pause(
  contract: StableBirr,
  signer: ethers.Signer,
  params: PauseParams
): Promise<ethers.TransactionResponse> {
  try {
    const tx = await contract
      .connect(signer)
      .pause(params.reason, params.options || {});

    return tx;
  } catch (error: unknown) {
    throw new ContractError("Failed to pause contract", error);
  }
}

/**
 * Unpause the contract.
 * Only callable by Schnl Admin.
 */
export async function unpause(
  contract: StableBirr,
  signer: ethers.Signer,
  params: UnpauseParams
): Promise<ethers.TransactionResponse> {
  try {
    const tx = await contract
      .connect(signer)
      .unpause(params.reason, params.options || {});
    return tx;
  } catch (error: unknown) {
    throw new ContractError("Failed to unpause contract", error);
  }
}

/**
 * Update the Schnl Admin address.
 * Only callable by current Schnl Admin.
 */
export async function updateSchnlAdmin(
  contract: StableBirr,
  signer: ethers.Signer,
  params: UpdateAdminParams
): Promise<ethers.TransactionResponse> {
  try {
    const tx = await contract
      .connect(signer)
      .updateSchnlAdmin(params.newAdmin, params.options || {});
    return tx;
  } catch (error: unknown) {
    throw new ContractError("Failed to update Schnl Admin", error);
  }
}

/**
 * Update the Schnl Operator address.
 * Only callable by Schnl Admin.
 */
export async function updateSchnlOperator(
  contract: StableBirr,
  signer: ethers.Signer,
  params: UpdateOperatorParams
): Promise<ethers.TransactionResponse> {
  try {
    const tx = await contract
      .connect(signer)
      .updateSchnlOperator(params.newOperator, params.options || {});
    return tx;
  } catch (error: unknown) {
    throw new ContractError("Failed to update Schnl Operator", error);
  }
}

/**
 * Swap the contract’s FX oracle reference.
 */
export async function updateFxOracle(
  contract: StableBirr,
  signer: ethers.Signer,
  params: UpdateOracleParams
): Promise<ethers.TransactionResponse> {
  try {
    const tx = await contract
      .connect(signer)
      .updateFxOracle(params.oracle, params.options || {});
    return tx;
  } catch (error: unknown) {
    throw new ContractError("Failed to update FX oracle", error);
  }
}

/**
 * Set the operator/oracle deviation tolerance (basis points).
 */
export async function setRateDeviationTolerance(
  contract: StableBirr,
  signer: ethers.Signer,
  params: SetRateToleranceParams
): Promise<ethers.TransactionResponse> {
  try {
    const tx = await contract
      .connect(signer)
      .setRateDeviationTolerance(params.toleranceBps, params.options || {});
    return tx;
  } catch (error: unknown) {
    throw new ContractError("Failed to set rate tolerance", error);
  }
}

/**
 * Configure how many seconds oracle data may remain valid before rejecting new mints.
 */
export async function setOracleStalePeriod(
  contract: StableBirr,
  signer: ethers.Signer,
  params: SetOracleStalePeriodParams
): Promise<ethers.TransactionResponse> {
  try {
    const tx = await contract
      .connect(signer)
      .setOracleStalePeriod(params.periodSeconds, params.options || {});
    return tx;
  } catch (error: unknown) {
    throw new ContractError("Failed to set oracle stale period", error);
  }
}

/**
 * Update the circulating supply cap (pass "0" to disable the guard).
 */
export async function setSupplyCap(
  contract: StableBirr,
  signer: ethers.Signer,
  params: SetSupplyCapParams
): Promise<ethers.TransactionResponse> {
  try {
    const tx = await contract
      .connect(signer)
      .setSupplyCap(ethers.parseUnits(params.cap, 18), params.options || {});
    return tx;
  } catch (error: unknown) {
    throw new ContractError("Failed to set supply cap", error);
  }
}

/**
 * Configure or update an authorized minter with a deterministic allowance.
 */
export async function configureMinter(
  contract: StableBirr,
  signer: ethers.Signer,
  params: ConfigureMinterParams
): Promise<ethers.TransactionResponse> {
  try {
    const allowance =
      params.allowance.toLowerCase() === "max"
        ? ethers.MaxUint256
        : ethers.parseUnits(params.allowance, 18);

    const tx = await contract
      .connect(signer)
      .configureMinter(
        params.minter,
        allowance,
        params.canBurn,
        params.options || {}
      );
    return tx;
  } catch (error: unknown) {
    throw new ContractError("Failed to configure minter", error);
  }
}

/**
 * Remove a minter entirely.
 */
export async function removeMinter(
  contract: StableBirr,
  signer: ethers.Signer,
  params: RemoveMinterParams
): Promise<ethers.TransactionResponse> {
  try {
    const tx = await contract
      .connect(signer)
      .removeMinter(params.minter, params.options || {});
    return tx;
  } catch (error: unknown) {
    throw new ContractError("Failed to remove minter", error);
  }
}
