import { ethers } from "ethers";
import type { StableBirr } from "@/typechain-types";
import { StableBirr__factory } from "@/typechain-types";
import { STABLEBIRR_ADDRESSES } from "@/constants/addresses";
import type { StableBirrConfig } from "@/types";
import { ContractError, ValidationError } from "@/core/errors";
import type {
  MintParams,
  BurnParams,
  TransferParams,
  BlacklistParams,
  FreezeParams,
  UnfreezeParams,
  WipeFrozenParams,
  RescueParams,
  PermitParams,
  UpdateAdminParams,
  UpdateOperatorParams,
  UpdateOracleParams,
  SetRateToleranceParams,
  SetOracleStalePeriodParams,
  SetSupplyCapParams,
  ConfigureMinterParams,
  RemoveMinterParams,
  PauseParams,
  UnpauseParams,
} from "@/resources/contract/contract.types";

//

import {
  MintParamsSchema,
  BurnParamsSchema,
  TransferParamsSchema,
  BlacklistParamsSchema,
  FreezeParamsSchema,
  UnfreezeParamsSchema,
  WipeFrozenParamsSchema,
  RescueParamsSchema,
  PermitParamsSchema,
  UpdateAdminParamsSchema,
  UpdateOperatorParamsSchema,
  UpdateOracleParamsSchema,
  SetRateToleranceParamsSchema,
  SetOracleStalePeriodParamsSchema,
  SetSupplyCapParamsSchema,
  ConfigureMinterParamsSchema,
  RemoveMinterParamsSchema,
  PauseParamsSchema,
  UnpauseParamsSchema,
} from "@/resources/contract/contract.validator";
import * as MintHandler from "@/resources/contract/handlers/mint.handler";
import * as BurnHandler from "@/resources/contract/handlers/burn.handler";
import * as TransferHandler from "@/resources/contract/handlers/transfer.handler";
import * as BlacklistHandler from "@/resources/contract/handlers/blacklist.handler";
import * as RescueHandler from "@/resources/contract/handlers/rescue.handler";
import * as FreezeHandler from "@/resources/contract/handlers/freeze.handler";
import * as PermitHandler from "@/resources/contract/handlers/permit.handler";
import * as AdminHandler from "@/resources/contract/handlers/admin.handler";

/**
 * Resource for interacting with the StableBirr smart contract.
 *
 *
 * StableBirr exposes dozens of privileged actions (mint, burn, freeze, oracle governance). Rather
 * than force every integrator to wire ABI calls manually, this resource wraps ethers.js with:
 * - Strict schema validation (Zod/4) so mistakes are caught before hitting the chain.
 * - Deterministic handler modules so business logic stays isolated and testable.
 * - Rich errors (`ValidationError`, `ContractError`) that differentiate bad inputs from on-chain
 *   reverts, making it easier to alert the right ops team.
 *
 * **What you get**
 * - Full coverage of administrative actions (oracle swaps, tolerance tweaks, pausing, role changes).
 * - Compliance controls (blacklist, freeze, wipe) in the same ergonomic style.
 * - Read helpers (balances, supply, oracle rate) for dashboards and reconciliation jobs.
 *
 * **When to use**
 * Instantiate `StableBirrContract` once per signer/config and rely on its methods instead of manual
 * ABI calls. This guarantees you always respect the same invariants the Solidity code enforces.
 */
export class StableBirrContract {
  private contract: StableBirr;
  private provider: ethers.Provider;
  private signer?: ethers.Signer;

  /**
   * Initialize the StableBirrContract resource.
   * @param config - Configuration object containing network, RPC URL, and private key.
   * @throws {ValidationError} If contract address is not found for the specified network.
   */
  constructor(config: StableBirrConfig) {
    // Setup provider
    if (config.rpcUrl) {
      this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    } else {
      const network = config.network || "polygon";
      this.provider = ethers.getDefaultProvider(network);
    }

    // Setup signer
    if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
    }

    // Setup contract
    const address =
      config.contractAddress ||
      STABLEBIRR_ADDRESSES[config.network || "polygon"];
    if (!address) {
      throw new ValidationError("Contract address not found for network");
    }

    this.contract = StableBirr__factory.connect(
      address,
      this.signer || this.provider
    );
  }

  /**
   * Get the deployed contract address.
   */
  public get address() {
    return this.contract.target;
  }

  /**
   * Mint new StableBirr tokens to a specific address.
   *
   * **How it works**
   * 1. Validates the payload against `MintParamsSchema` to ensure addresses and numeric strings
   *    are well-formed.
   * 2. Ensures the configured signer exists (minting is a privileged action).
   * 3. Delegates to the low-level handler which invokes the on-chain `mint` method.
   *
   * **When to call**
   * - After fiat arrives in custody and you have the corresponding USD amount + FX rate snapshot.
   * - During treasury operations where Schnl Operator needs to issue SBirr to liquidity partners.
   *
   * @param params.to Recipient address.
   * @param params.amount Amount of SBirr to mint (in wei).
   * @param params.usdAmount USD amount deposited (wei, for audit parity).
   * @param params.rate Human-supplied FX rate that must match the oracle within tolerance.
   * @throws ValidationError if the payload/signature is missing.
   * @throws ContractError if the on-chain call reverts (e.g., oracle mismatch).
   */
  public async mint(params: MintParams): Promise<ethers.TransactionResponse> {
    if (!this.signer) throw new ValidationError("Signer required for minting");

    const validation = MintParamsSchema.safeParse(params);
    if (!validation.success) {
      throw new ValidationError("Invalid mint parameters", validation.error);
    }

    return MintHandler.mint(this.contract, this.signer, params);
  }

  /**
   * Burn StableBirr tokens from a specific address.
   *
   * **Use cases**
   * - Merchant payout / redemption flows where fiat is moving off-chain.
   * - Treasury needs to reduce circulating supply after reversing a mint.
   *
   * **Flow**
   * 1. Validate payload (`from`, `amount`, `merchantId`) against `BurnParamsSchema`.
   * 2. Ensure a signer is configured.
   * 3. Delegate to the `burn` handler which calls the contract (recording the merchant metadata).
   *
   * @throws ValidationError if inputs are malformed or signer missing.
   * @throws ContractError when the contract reverts (insufficient balance, blacklisted, etc.).
   */
  public async burn(params: BurnParams): Promise<ethers.TransactionResponse> {
    if (!this.signer) throw new ValidationError("Signer required for burning");

    const validation = BurnParamsSchema.safeParse(params);
    if (!validation.success) {
      throw new ValidationError("Invalid burn parameters", validation.error);
    }

    return BurnHandler.burn(this.contract, this.signer, params);
  }

  /**
   * Transfer StableBirr tokens to another address.
   * Standard ERC20 transfer.
   *
   * @param params - Parameters for transferring tokens.
   * @param params.to - Recipient address.
   * @param params.amount - Amount to transfer (in wei).
   * @returns Promise resolving to the transaction response.
   * @throws {ValidationError} If parameters are invalid or signer is missing.
   * @throws {ContractError} If the transaction fails on-chain.
   */
  public async transfer(
    params: TransferParams
  ): Promise<ethers.TransactionResponse> {
    if (!this.signer) throw new ValidationError("Signer required for transfer");

    const validation = TransferParamsSchema.safeParse(params);
    if (!validation.success) {
      throw new ValidationError(
        "Invalid transfer parameters",
        validation.error
      );
    }

    return TransferHandler.transfer(this.contract, this.signer, params);
  }

  /**
   * Blacklist an address to prevent them from sending/receiving tokens.
   * Only callable by the Schnl Admin.
   *
   * @param params - Parameters for blacklisting.
   * @param params.account - Address to blacklist.
   * @returns Promise resolving to the transaction response.
   * @throws {ValidationError} If parameters are invalid or signer is missing.
   * @throws {ContractError} If the transaction fails on-chain.
   */
  public async blacklist(
    params: BlacklistParams
  ): Promise<ethers.TransactionResponse> {
    if (!this.signer)
      throw new ValidationError("Signer required for blacklisting");

    const validation = BlacklistParamsSchema.safeParse(params);
    if (!validation.success) {
      throw new ValidationError(
        "Invalid blacklist parameters",
        validation.error
      );
    }

    return BlacklistHandler.blacklist(this.contract, this.signer, params);
  }

  /**
   * Remove an address from the blacklist.
   * Only callable by the Schnl Admin.
   *
   * @param params - Parameters for unblacklisting.
   * @param params.account - Address to unblacklist.
   * @returns Promise resolving to the transaction response.
   * @throws {ValidationError} If parameters are invalid or signer is missing.
   * @throws {ContractError} If the transaction fails on-chain.
   */
  public async unblacklist(
    params: BlacklistParams
  ): Promise<ethers.TransactionResponse> {
    if (!this.signer)
      throw new ValidationError("Signer required for unblacklisting");

    const validation = BlacklistParamsSchema.safeParse(params);
    if (!validation.success) {
      throw new ValidationError(
        "Invalid unblacklist parameters",
        validation.error
      );
    }

    return BlacklistHandler.unblacklist(this.contract, this.signer, params);
  }

  /**
   * Freeze an address (compliance hold) with a detailed reason string so compliance dashboards can
   * mirror the on-chain action. Treat this as the on-chain equivalent of “lock the account until we
   * figure out what happened”.
   *
   * @param params - Parameters describing the account and reason (case ID, incident ticket, etc.).
   */
  public async freeze(
    params: FreezeParams
  ): Promise<ethers.TransactionResponse> {
    if (!this.signer) throw new ValidationError("Signer required for freeze");

    const validation = FreezeParamsSchema.safeParse(params);
    if (!validation.success) {
      throw new ValidationError("Invalid freeze parameters", validation.error);
    }

    return FreezeHandler.freeze(this.contract, this.signer, params);
  }

  /**
   * Remove a freeze from an address once investigations conclude. The reason string should capture
   * how the case was resolved so anyone reviewing the event log understands the context.
   *
   * @param params - Parameters describing the account and unfreeze reason.
   */
  public async unfreeze(
    params: UnfreezeParams
  ): Promise<ethers.TransactionResponse> {
    if (!this.signer) throw new ValidationError("Signer required for unfreeze");

    const validation = UnfreezeParamsSchema.safeParse(params);
    if (!validation.success) {
      throw new ValidationError(
        "Invalid unfreeze parameters",
        validation.error
      );
    }

    return FreezeHandler.unfreeze(this.contract, this.signer, params);
  }

  /**
   * Permanently burn the balance of a frozen address when mandated by a regulator/court. This is a
   * last resort operation, so the `caseId` should reference the legal order authorizing the wipe.
   *
   * @param params - Parameters describing the account and case ID (e.g., subpoena number).
   */
  public async wipeFrozenBalance(
    params: WipeFrozenParams
  ): Promise<ethers.TransactionResponse> {
    if (!this.signer)
      throw new ValidationError("Signer required for wiping frozen balance");

    const validation = WipeFrozenParamsSchema.safeParse(params);
    if (!validation.success) {
      throw new ValidationError("Invalid wipe parameters", validation.error);
    }

    return FreezeHandler.wipeFrozenBalance(this.contract, this.signer, params);
  }

  /**
   * Rescue accidentally sent ERC20 tokens from the contract.
   * Only callable by the Schnl Admin.
   *
   * @param params - Parameters for rescuing tokens.
   * @param params.tokenAddress - Address of the token to rescue.
   * @param params.to - Recipient address for the rescued tokens.
   * @param params.amount - Amount to rescue.
   * @returns Promise resolving to the transaction response.
   * @throws {ValidationError} If parameters are invalid or signer is missing.
   * @throws {ContractError} If the transaction fails on-chain.
   */
  public async rescue(
    params: RescueParams
  ): Promise<ethers.TransactionResponse> {
    if (!this.signer) throw new ValidationError("Signer required for rescue");

    const validation = RescueParamsSchema.safeParse(params);
    if (!validation.success) {
      throw new ValidationError("Invalid rescue parameters", validation.error);
    }

    return RescueHandler.rescue(this.contract, this.signer, params);
  }

  /**
   * Execute a gasless approval using EIP-2612 Permit.
   *
   * @param params - Parameters for the permit.
   * @param params.owner - Token owner's address.
   * @param params.spender - Spender's address.
   * @param params.value - Amount to approve.
   * @param params.deadline - Timestamp until which the permit is valid.
   * @param params.v - Recovery ID of the signature.
   * @param params.r - R output of the signature.
   * @param params.s - S output of the signature.
   * @returns Promise resolving to the transaction response.
   * @throws {ValidationError} If parameters are invalid or signer is missing.
   * @throws {ContractError} If the transaction fails on-chain.
   */
  public async permit(
    params: PermitParams
  ): Promise<ethers.TransactionResponse> {
    if (!this.signer)
      throw new ValidationError("Signer required for permit execution");

    const validation = PermitParamsSchema.safeParse(params);
    if (!validation.success) {
      throw new ValidationError("Invalid permit parameters", validation.error);
    }

    return PermitHandler.permit(this.contract, this.signer, params);
  }

  /**
   * Pause the contract with an incident reason.
   *
   * @param params - Parameters containing the pause reason.
   */
  public async pause(params: PauseParams): Promise<ethers.TransactionResponse> {
    if (!this.signer) throw new ValidationError("Signer required for pausing");

    const validation = PauseParamsSchema.safeParse(params);
    if (!validation.success) {
      throw new ValidationError("Invalid pause parameters", validation.error);
    }

    return AdminHandler.pause(this.contract, this.signer, params);
  }

  /**
   * Unpause the contract with an incident reason.
   *
   * @param params - Parameters containing the unpause reason.
   */
  public async unpause(
    params: UnpauseParams
  ): Promise<ethers.TransactionResponse> {
    if (!this.signer)
      throw new ValidationError("Signer required for unpausing");

    const validation = UnpauseParamsSchema.safeParse(params);
    if (!validation.success) {
      throw new ValidationError("Invalid unpause parameters", validation.error);
    }

    return AdminHandler.unpause(this.contract, this.signer, params);
  }

  /**
   * Update the Schnl Admin address.
   * Only callable by current Schnl Admin.
   *
   * @param params - Parameters for updating admin.
   * @param params.newAdmin - New admin address.
   * @returns Promise resolving to the transaction response.
   * @throws {ValidationError} If parameters are invalid or signer is missing.
   * @throws {ContractError} If the transaction fails on-chain.
   */
  public async updateSchnlAdmin(
    params: UpdateAdminParams
  ): Promise<ethers.TransactionResponse> {
    if (!this.signer)
      throw new ValidationError("Signer required for updating admin");

    const validation = UpdateAdminParamsSchema.safeParse(params);
    if (!validation.success) {
      throw new ValidationError(
        "Invalid update admin parameters",
        validation.error
      );
    }

    return AdminHandler.updateSchnlAdmin(this.contract, this.signer, params);
  }

  /**
   * Update the Schnl Operator address.
   * Only callable by Schnl Admin.
   *
   * @param params - Parameters for updating operator.
   * @param params.newOperator - New operator address.
   * @returns Promise resolving to the transaction response.
   * @throws {ValidationError} If parameters are invalid or signer is missing.
   * @throws {ContractError} If the transaction fails on-chain.
   */
  public async updateSchnlOperator(
    params: UpdateOperatorParams
  ): Promise<ethers.TransactionResponse> {
    if (!this.signer)
      throw new ValidationError("Signer required for updating operator");

    const validation = UpdateOperatorParamsSchema.safeParse(params);
    if (!validation.success) {
      throw new ValidationError(
        "Invalid update operator parameters",
        validation.error
      );
    }

    return AdminHandler.updateSchnlOperator(this.contract, this.signer, params);
  }

  /**
   * Update the circulating supply cap (0 disables the guard). Operations typically set this to the
   * latest attested fiat reserves so the contract itself enforces the reserve ratio.
   */
  public async setSupplyCap(
    params: SetSupplyCapParams
  ): Promise<ethers.TransactionResponse> {
    if (!this.signer)
      throw new ValidationError("Signer required for supply cap update");

    const validation = SetSupplyCapParamsSchema.safeParse(params);
    if (!validation.success) {
      throw new ValidationError(
        "Invalid supply cap parameters",
        validation.error
      );
    }

    return AdminHandler.setSupplyCap(this.contract, this.signer, params);
  }

  /**
   * Configure or update a minter with an explicit allowance.
   *
   * **Why this exists**
   * Regulated issuers rarely trust a single hot wallet with unlimited mint rights. Instead, they
   * grant per-minter allowances that must be replenished via governance. This helper mirrors that
   * workflow by requiring you to specify:
   * - `minter`: the address receiving permissions (hardware wallet, MPC signer, etc.).
   * - `allowance`: how many SBirr they may mint before needing another approval cycle.
   * - `canBurn`: whether they may also initiate redemption burns.
   *
   * **Allowance input format**
   * - Provide a decimal string such as `"2500000"` to represent 2.5M SBirr. The SDK converts it to
   *   wei internally before calling the contract.
   * - Passing `"max"` (case-insensitive) translates to `2^256 - 1`, effectively unlimited. Reserve
   *   that for Schnl Operator bootstrap or emergency signers that already require policy approvals.
   *
   * **Safety guarantees**
   * - The payload is validated via Zod before the transaction is crafted.
   * - Errors distinguish between client-side issues (missing signer, malformed address) and
   *   on-chain reverts so runbooks can respond appropriately.
   */
  public async configureMinter(
    params: ConfigureMinterParams
  ): Promise<ethers.TransactionResponse> {
    if (!this.signer)
      throw new ValidationError("Signer required for minter configuration");

    const validation = ConfigureMinterParamsSchema.safeParse(params);
    if (!validation.success) {
      throw new ValidationError(
        "Invalid configure minter parameters",
        validation.error
      );
    }

    return AdminHandler.configureMinter(this.contract, this.signer, params);
  }

  /**
   * Remove a minter entirely.
   *
   * **When to use**
   * - Rotating compromised keys out of circulation.
   * - Cleaning up temporary allowances issued for a specific issuance event.
   *
   * The helper validates the payload, ensures a signer is present, and delegates to the contract’s
   * `removeMinter` function so governance events are emitted on-chain.
   */
  public async removeMinter(
    params: RemoveMinterParams
  ): Promise<ethers.TransactionResponse> {
    if (!this.signer)
      throw new ValidationError("Signer required for removing minters");

    const validation = RemoveMinterParamsSchema.safeParse(params);
    if (!validation.success) {
      throw new ValidationError(
        "Invalid remove minter parameters",
        validation.error
      );
    }

    return AdminHandler.removeMinter(this.contract, this.signer, params);
  }

  /**
   * Check if an address is currently blacklisted.
   *
   * @param address - Address to check.
   * @returns Promise resolving to true if blacklisted, false otherwise.
   * @throws {ContractError} If the check fails.
   */
  public async isBlacklisted(address: string): Promise<boolean> {
    try {
      return await this.contract.isBlacklisted(address);
    } catch (error: unknown) {
      throw new ContractError("Failed to check blacklist status", error);
    }
  }

  /**
   * Check if an address is currently frozen. Helpful for dashboards that want to display “account
   * status” badges or for back-office scripts that decide whether to initiate manual reviews.
   *
   * @param address - Address to check.
   * @returns Promise resolving to true if frozen.
   * @throws {ContractError} If the check fails.
   */
  public async isFrozen(address: string): Promise<boolean> {
    try {
      return await this.contract.isFrozen(address);
    } catch (error: unknown) {
      throw new ContractError("Failed to check freeze status", error);
    }
  }

  /**
   * Determine whether an address is currently authorized as a minter.
   *
   * @param address Address to check.
   * @returns Promise resolving to true if the minter is active.
   */
  public async isMinter(address: string): Promise<boolean> {
    try {
      return await this.contract.isMinter(address);
    } catch (error: unknown) {
      throw new ContractError("Failed to check minter status", error);
    }
  }

  /**
   * Retrieve the remaining mint allowance for a minter. Returns the raw wei amount so you can
   * render it however you like (convert to decimals client-side).
   */
  public async minterAllowance(address: string): Promise<string> {
    try {
      const allowance = await this.contract.minterAllowance(address);
      return allowance.toString();
    } catch (error: unknown) {
      throw new ContractError("Failed to fetch minter allowance", error);
    }
  }

  /**
   * Check if a minter is also authorized to initiate burn flows.
   */
  public async minterCanBurn(address: string): Promise<boolean> {
    try {
      return await this.contract.minterCanBurn(address);
    } catch (error: unknown) {
      throw new ContractError("Failed to fetch canBurn flag", error);
    }
  }

  /**
   * Get the StableBirr balance of an address.
   *
   * @param address - Address to check balance for.
   * @returns Promise resolving to the balance as a string (in ether units).
   * @throws {ContractError} If the check fails.
   */
  public async getBalance(address: string): Promise<string> {
    try {
      const balance = await this.contract.balanceOf(address);
      return ethers.formatUnits(balance, 18);
    } catch (error: unknown) {
      throw new ContractError("Failed to get balance", error);
    }
  }

  /**
   * Get the total supply of StableBirr tokens.
   *
   * @returns Promise resolving to the total supply as a string (in ether units).
   * @throws {ContractError} If the check fails.
   */
  public async getTotalSupply(): Promise<string> {
    try {
      const supply = await this.contract.totalSupply();
      return ethers.formatUnits(supply, 18);
    } catch (error: unknown) {
      throw new ContractError("Failed to get total supply", error);
    }
  }
}
