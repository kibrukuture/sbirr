import { z } from "zod/v4";
import { ethers } from "ethers";

// Reusable Schemas
const AddressSchema = z
  .string()
  .refine((val: string) => ethers.isAddress(val), {
    message: "Invalid Ethereum address",
  });

const AmountSchema = z.string().regex(/^\d+(\.\d+)?$/, "Invalid amount format");

const HexStringSchema = z
  .string()
  .refine((val: string) => ethers.isHexString(val), {
    message: "Invalid hex string",
  });

const ReasonSchema = z.string().min(3, "Reason is required");

// Contract Schemas
export const MintParamsSchema = z.object({
  to: AddressSchema,
  amount: AmountSchema,
  usdAmount: AmountSchema,
  rate: z.number().positive("Rate must be positive"),
});

export const BurnParamsSchema = z.object({
  from: AddressSchema,
  amount: AmountSchema,
  merchantId: z.string().min(1, "Merchant ID required"),
});

export const TransferParamsSchema = z.object({
  to: AddressSchema,
  amount: AmountSchema,
});

export const BlacklistParamsSchema = z.object({
  account: AddressSchema,
});

export const FreezeParamsSchema = z.object({
  account: AddressSchema,
  reason: ReasonSchema,
});

export const UnfreezeParamsSchema = z.object({
  account: AddressSchema,
  reason: ReasonSchema,
});

export const WipeFrozenParamsSchema = z.object({
  account: AddressSchema,
  caseId: ReasonSchema,
});

export const RescueParamsSchema = z.object({
  tokenAddress: AddressSchema,
  to: AddressSchema,
  amount: AmountSchema,
});

export const PermitParamsSchema = z.object({
  owner: AddressSchema,
  spender: AddressSchema,
  value: AmountSchema,
  deadline: z.number().positive("Deadline must be positive"),
  v: z.number().int().min(27).max(28),
  r: HexStringSchema,
  s: HexStringSchema,
});

export const UpdateAdminParamsSchema = z.object({
  newAdmin: AddressSchema,
});

export const UpdateOperatorParamsSchema = z.object({
  newOperator: AddressSchema,
});

export const UpdateOracleParamsSchema = z.object({
  oracle: AddressSchema,
});

export const SetRateToleranceParamsSchema = z.object({
  toleranceBps: z
    .number()
    .int()
    .min(0, "Tolerance must be >= 0")
    .max(10_000, "Tolerance cannot exceed 10,000 bps"),
});

export const SetOracleStalePeriodParamsSchema = z.object({
  periodSeconds: z.number().int().min(0, "Period must be >= 0"),
});

export const SetSupplyCapParamsSchema = z.object({
  cap: AmountSchema,
});

export const ConfigureMinterParamsSchema = z.object({
  minter: AddressSchema,
  allowance: AmountSchema,
  canBurn: z.boolean(),
});

export const RemoveMinterParamsSchema = z.object({
  minter: AddressSchema,
});

export const PauseParamsSchema = z.object({
  reason: ReasonSchema,
});

export const UnpauseParamsSchema = z.object({
  reason: ReasonSchema,
});
