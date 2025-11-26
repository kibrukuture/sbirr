import { z } from "zod";

export const ComplianceCheckSchema = z.object({
  userId: z.string().min(1, "User ID required"),
  amount: z.string().regex(/^\d+(\.\d+)?$/, "Invalid amount format"),
  currency: z.string().length(3, "Currency code must be 3 characters"),
});

export const ReportTransactionSchema = z.object({
  txHash: z.string().startsWith("0x", "Invalid transaction hash"),
  amount: z.string().regex(/^\d+(\.\d+)?$/, "Invalid amount format"),
  usdAmount: z.string().regex(/^\d+(\.\d+)?$/, "Invalid USD amount format"),
  type: z.enum(["MINT", "BURN"]),
  timestamp: z.number().positive(),
});
