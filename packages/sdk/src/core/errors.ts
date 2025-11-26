export class StableBirrError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = "StableBirrError";
  }
}

export class ValidationError extends StableBirrError {
  constructor(message: string, details?: any) {
    super(message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class ContractError extends StableBirrError {
  constructor(message: string, details?: any) {
    super(message, "CONTRACT_ERROR", details);
    this.name = "ContractError";
  }
}

export class NetworkError extends StableBirrError {
  constructor(message: string, details?: any) {
    super(message, "NETWORK_ERROR", details);
    this.name = "NetworkError";
  }
}
