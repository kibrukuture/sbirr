import type { TransactionOptions } from "@/types";

/**
 * Parameters for minting StableBirr tokens.
 */
export interface MintParams {
  /** Recipient address (must be a valid Ethereum address) */
  to: string;
  /** Amount of SBirr to mint (in wei) */
  amount: string;
  /** Corresponding USD amount deposited (for audit) */
  usdAmount: string;
  /** Human-provided exchange rate snapshot (must match oracle within tolerance) */
  rate: number;
  /** Optional transaction overrides */
  options?: TransactionOptions;
}

/**
 * Parameters for burning StableBirr tokens.
 */
export interface BurnParams {
  /** Address to burn tokens from */
  from: string;
  /** Amount of SBirr to burn (in wei) */
  amount: string;
  /** ID of the merchant initiating the burn (for audit) */
  merchantId: string;
  /** Optional transaction overrides */
  options?: TransactionOptions;
}

/**
 * Parameters for transferring StableBirr tokens.
 */
export interface TransferParams {
  /** Recipient address */
  to: string;
  /** Amount to transfer (in wei) */
  amount: string;
  /** Optional transaction overrides */
  options?: TransactionOptions;
}

/**
 * Parameters for blacklisting/unblacklisting an address.
 */
export interface BlacklistParams {
  /** Address to blacklist/unblacklist */
  account: string;
  /** Optional transaction overrides */
  options?: TransactionOptions;
}

/**
 * Parameters for freezing an address (compliance hold).
 */
export interface FreezeParams {
  /** Address to freeze */
  account: string;
  /** Reason / case reference to anchor the freeze */
  reason: string;
  /** Optional transaction overrides */
  options?: TransactionOptions;
}

/**
 * Parameters for unfreezing an address.
 */
export interface UnfreezeParams {
  /** Address to unfreeze */
  account: string;
  /** Reason describing why the freeze was lifted */
  reason: string;
  /** Optional transaction overrides */
  options?: TransactionOptions;
}

/**
 * Parameters for wiping a frozen balance.
 */
export interface WipeFrozenParams {
  /** Address whose frozen balance will be burned */
  account: string;
  /** Case identifier or warrant reference */
  caseId: string;
  /** Optional transaction overrides */
  options?: TransactionOptions;
}

/**
 * Parameters for rescuing tokens.
 */
export interface RescueParams {
  /** Address of the token to rescue */
  tokenAddress: string;
  /** Recipient address for the rescued tokens */
  to: string;
  /** Amount to rescue */
  amount: string;
  /** Optional transaction overrides */
  options?: TransactionOptions;
}

/**
 * Parameters for EIP-2612 Permit.
 */
export interface PermitParams {
  /** Token owner's address */
  owner: string;
  /** Spender's address */
  spender: string;
  /** Amount to approve */
  value: string;
  /** Timestamp until which the permit is valid */
  deadline: number;
  /** Recovery ID of the signature */
  v: number;
  /** R output of the signature */
  r: string;
  /** S output of the signature */
  s: string;
  /** Optional transaction overrides */
  options?: TransactionOptions;
}

/**
 * Parameters for updating Schnl Admin.
 */
export interface UpdateAdminParams {
  /** New Schnl Admin address */
  newAdmin: string;
  /** Optional transaction overrides */
  options?: TransactionOptions;
}

/**
 * Parameters for updating Schnl Operator.
 */
export interface UpdateOperatorParams {
  /** New Schnl Operator address */
  newOperator: string;
  /** Optional transaction overrides */
  options?: TransactionOptions;
}

/**
 * Parameters for updating the FX oracle contract.
 */
export interface UpdateOracleParams {
  /** Address of the oracle feed */
  oracle: string;
  /** Optional transaction overrides */
  options?: TransactionOptions;
}

/**
 * Parameters for updating rate deviation tolerance.
 */
export interface SetRateToleranceParams {
  /** Basis points tolerance (max 10_000) */
  toleranceBps: number;
  /** Optional transaction overrides */
  options?: TransactionOptions;
}

/**
 * Parameters for updating oracle stale period.
 */
export interface SetOracleStalePeriodParams {
  /** Seconds until oracle data is considered stale */
  periodSeconds: number;
  /** Optional transaction overrides */
  options?: TransactionOptions;
}

/**
 * Parameters for updating the supply cap.
 */
export interface SetSupplyCapParams {
  /** New cap amount expressed in whole tokens (18 decimals precision will be applied) */
  cap: string;
  /** Optional transaction overrides */
  options?: TransactionOptions;
}

/**
 * Parameters for configuring or updating an authorized minter.
 *
 * The SDK expects the allowance in human-readable token units (e.g., "1000000" for 1M SBirr). It
 * handles conversion to wei before invoking the contract. Set `allowance` to a very large number
 * (or `"max"`, handled upstream) only if this minter should have effectively unlimited authority.
 */
export interface ConfigureMinterParams {
  /** Address to authorize as a minter */
  minter: string;
  /** Allowance expressed in human-readable SBirr (string) */
  allowance: string;
  /** Whether this minter is also allowed to initiate burn flows */
  canBurn: boolean;
  /** Optional transaction overrides */
  options?: TransactionOptions;
}

/**
 * Parameters for removing a minter altogether.
 */
export interface RemoveMinterParams {
  /** Address to revoke */
  minter: string;
  /** Optional transaction overrides */
  options?: TransactionOptions;
}

/**
 * Parameters for pausing with an incident reason.
 */
export interface PauseParams {
  /** Human-readable incident reason */
  reason: string;
  /** Optional transaction overrides */
  options?: TransactionOptions;
}

/**
 * Parameters for unpausing with an incident reason.
 */
export interface UnpauseParams {
  /** Human-readable incident reason */
  reason: string;
  /** Optional transaction overrides */
  options?: TransactionOptions;
}

/**
 * Configuration for the StableBirrContract resource.
 */
export interface ContractConfig {
  /** Contract address override */
  address?: string;
}
