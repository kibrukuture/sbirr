export interface ConversionRate {
  rate: number;
  timestamp: number;
  currency: string;
}

export interface ComplianceCheckParams {
  userId: string;
  amount: string;
  currency: string;
}

export interface ComplianceResult {
  allowed: boolean;
  reason?: string;
  limitRemaining?: string;
}

export interface ReportTransactionParams {
  txHash: string;
  amount: string;
  usdAmount: string;
  type: "MINT" | "BURN";
  timestamp: number;
}
