import type { StableBirrConfig } from "@/types";
import { StableBirrContract } from "@/resources/contract";
import { NBE } from "@/resources/nbe";
import * as Utils from "@/utils/formatting";
import * as Conversion from "@/utils/conversion";

/**
 * High-level SDK facade for interacting with the StableBirr ecosystem.
 *
 * The StableBirr SDK intentionally mirrors the ergonomic layering used by mature stablecoin
 * platforms: a single client exposes specialized resources that separate on-chain
 * contract interactions from off-chain central bank APIs (National Bank of Ethiopia reporting).
 * This class wires up those resources using a shared configuration object so that integrators
 * can:
 *
 *   1. Bootstrap an ethers.js-powered contract resource that encapsulates mint/burn/transfer,
 *      Schnl governance controls, blacklist administration, and observability helper methods.
 *   2. Access National Bank of Ethiopia reporting endpoints to synchronize capital controls
 *      and statutory disclosures alongside on-chain state transitions.
 *   3. Reuse deterministic utility helpers (formatting, conversion) that guarantee parity
 *      between treasury dashboards, API request payloads, and smart contract parameters.
 *
 * By colocating those primitives, integrators can reproduce the operational posture of
 * production-grade stablecoins (role separation, deterministic conversions, audit-grade logs)
 * without needing to stitch together bespoke modules themselves.
 */
export class StableBirr {
  public static Utils = Utils;
  public static Conversion = Conversion;
  /**
   * Resource that wraps every permissioned or permissionless interaction with the SBirr contract.
   * Handles signer wiring, schema validation, structured error handling, and transaction helpers.
   */
  public contract: StableBirrContract;

  /**
   * Resource for National Bank of Ethiopia (NBE) supervisory APIs. Enables reporting hooks and
   * compliance data synchronization required before Schnl can unpause circulation.
   */
  public nbe: NBE;

  /**
   * Collection of deterministic helpers (formatting + conversion) exposed under a single namespace
   * so integrators can perform client-side calculations that exactly match the Solidity library.
   */
  public utils = { ...Utils, ...Conversion };

  /**
   * Create a StableBirr SDK instance using a single configuration envelope.
   *
   * @param config - Shared configuration describing how to reach the SBirr contract + NBE APIs.
   * @param config.network - Target chain identifier (`mainnet`, `polygon`, `amoy`, or `local`).
   * @param config.rpcUrl - Optional custom RPC endpoint if public infrastructure is insufficient.
   * @param config.privateKey - Optional EOA private key; required for privileged calls like mint/burn.
   * @param config.contractAddress - Optional override for the deployed SBirr contract address.
   */
  constructor(config: StableBirrConfig) {
    this.contract = new StableBirrContract(config);
    this.nbe = new NBE(config);
  }
}
