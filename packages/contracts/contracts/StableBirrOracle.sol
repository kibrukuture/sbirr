// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./StableBirrBase.sol";

/**
 * @title StableBirrOracle
 * @notice Encapsulates every concern related to FX oracle consumption and supply caps.
 *
 * **What “oracle” means here**
 * A trusted smart contract (Chainlink, custom Schnl feed, etc.) that publishes the USD/ETB rate.
 * Because SBirr must stay 1:1 collateralized, every mint references that feed to determine the
 * number of tokens to issue for each USD deposited.
 *
 * **Responsibilities covered**
 * 1. Validate the oracle address + decimals and cache them for fast scaling to 18 decimals.
 * 2. Guard against stale data via `oracleStalePeriod` so paused feeds halt minting instantly.
 * 3. Enforce a deviation tolerance so an operator’s manual FX snapshot can’t diverge wildly from
 *    the oracle (protects against fat fingers and timing mismatches).
 * 4. Track and emit the latest oracle rate for transparency dashboards.
 * 5. Apply an optional `supplyCap` so circulation can never exceed attested reserves.
 *
 * **How to reason about this file**
 * Whenever someone asks “How exactly does the oracle influence minting?”, this is the only file
 * they need to read. Compliance logic, freeze controls, and mint accounting live elsewhere.
 */
abstract contract StableBirrOracle is StableBirrBase {
    /**
     * @notice Point the contract at a new FX oracle (e.g., swapping from a sandbox feed to the production feed).
     * @param newOracle Address of the contract implementing `IPriceFeed` (Chainlink-style interface).
     *
     * @dev Validation steps:
     *        - Rejects zero addresses so we never fall back to “no oracle”.
     *        - Reads the oracle’s `decimals()` value and rejects 0 to avoid divide-by-zero disasters.
     *        - Emits `FxOracleUpdated` so monitoring systems can log the governance change.
     *
     *      This function is intentionally admin-only because whoever controls the oracle controls
     *      how many tokens can be minted for each USD. Treat it like a root-of-trust update.
     */
    function updateFxOracle(address newOracle) external override onlySchnlAdmin {
        _setFxOracle(newOracle);
    }

    /**
     * @dev Internal function to set oracle, used during initialization and by updateFxOracle.
     */
    function _setFxOracle(address newOracle) internal {
        if (newOracle == address(0)) revert InvalidAddress();

        fxOracle = IPriceFeed(newOracle);
        try fxOracle.decimals() returns (uint8 decimals) {
            if (decimals == 0) revert OracleRateInvalid();
            _oracleDecimals = decimals;
        } catch {
            revert OracleRateInvalid();
        }

        emit FxOracleUpdated(newOracle);
    }

    /**
     * @notice Configure how far the operator’s manual rate snapshot may deviate from the oracle feed.
     * @param toleranceBps Basis points tolerance (0 = exact match, 100 = ±1%, 10_000 = ±100%).
     *
     * @dev Operators record the FX rate observed on banking portals when a fiat deposit arrives, then
     *      call `mint`. This tolerance lets Schnl enforce “trust but verify”: you can allow a small
     *      drift (to account for bank cut-off times) yet automatically reject fat-finger errors.
     */
    function setRateDeviationTolerance(uint256 toleranceBps) external override onlySchnlAdmin {
        if (toleranceBps > BPS_DENOMINATOR) revert InvalidTolerance();
        rateDeviationToleranceBps = toleranceBps;
        emit RateToleranceUpdated(toleranceBps);
    }

    /**
     * @notice Define how old oracle data may be before mints halt.
     * @param newPeriod Seconds since last oracle update. Set to zero to disable the staleness gate.
     *
     * @dev If the oracle stalls (e.g., Chainlink keeps returning the same round), this guard
     *      ensures no new SBirr enters circulation until data freshness is restored.
     */
    function setOracleStalePeriod(uint256 newPeriod) external override onlySchnlAdmin {
        oracleStalePeriod = newPeriod;
        emit OracleStalePeriodUpdated(newPeriod);
    }

    /**
     * @notice Set the maximum circulating supply allowed (0 disables the guard).
     * @param newCap New supply cap expressed in wei (18 decimals).
     *
     * @dev This is a belt-and-suspenders mechanism: even if the oracle stays healthy, Schnl can
     *      enforce “do not exceed the attested reserves” by setting `newCap` to the latest proof-of-funds.
     *      Treasury teams usually update this cap after every attestation report.
     */
    function setSupplyCap(uint256 newCap) external override onlySchnlAdmin {
        supplyCap = newCap;
        emit SupplyCapUpdated(newCap);
    }

    /**
     * @notice Expose the current oracle rate (scaled to 18 decimals) so dashboards / SDKs can display it.
     *
     * @dev Returns `(rate, updatedAt)` internally but only the rate is surfaced here to keep the
     *      public ABI compact. Use `oracleLastUpdatedAt` for the timestamp.
     */
    function currentOracleRate() external view override returns (uint256) {
        (uint256 rate, ) = _fetchOracleRate();
        return rate;
    }

    /**
     * @dev Reads the oracle, verifies the response is trustworthy, and normalizes it.
     * @return rate USD/ETB price scaled to 18 decimals.
     * @return updatedAt Timestamp provided by the oracle feed (not `block.timestamp`).
     */
    function _fetchOracleRate() internal view returns (uint256 rate, uint256 updatedAt) {
        if (address(fxOracle) == address(0)) revert OracleNotConfigured();

        (
            ,
            int256 answer,
            ,
            uint256 oracleUpdatedAt,
            uint80 answeredInRound
        ) = fxOracle.latestRoundData();

        if (answer <= 0 || answeredInRound == 0 || oracleUpdatedAt == 0) revert OracleRateInvalid();
        if (oracleUpdatedAt > block.timestamp) revert OracleRateInvalid();

        if (oracleStalePeriod != 0 && block.timestamp - oracleUpdatedAt > oracleStalePeriod) {
            revert OracleStale();
        }

        rate = _scaleOracleAnswer(uint256(answer));
        updatedAt = oracleUpdatedAt;
    }

    /**
     * @dev Scales the oracle answer into 18 decimals regardless of the feed’s native precision.
     *      Chainlink, for example, returns 8 decimals by default — this helper makes sure the
     *      rest of the contract can treat every rate uniformly.
     */
    function _scaleOracleAnswer(uint256 answer) internal view returns (uint256) {
        if (_oracleDecimals == 0) revert OracleDecimalsNotSet();

        if (_oracleDecimals == 18) {
            return answer;
        } else if (_oracleDecimals < 18) {
            uint256 exponentUp = uint256(18 - _oracleDecimals);
            uint256 factorUp = 10 ** exponentUp;
            return answer * factorUp;
        } else {
            uint256 exponentDown = uint256(_oracleDecimals - 18);
            uint256 factorDown = 10 ** exponentDown;
            return answer / factorDown;
        }
    }

    /**
     * @dev Checks whether the operator-provided rate is within the configured tolerance.
     *      Keeping this logic in one place ensures both `mint` and any future features use the
     *      exact same comparison math (absolute difference scaled by basis points).
     */
    function _withinRateTolerance(uint256 oracleRate, uint256 providedRate) internal view returns (bool) {
        if (rateDeviationToleranceBps == 0) {
            return oracleRate == providedRate;
        }

        uint256 difference = oracleRate > providedRate
            ? oracleRate - providedRate
            : providedRate - oracleRate;

        return difference * BPS_DENOMINATOR <= oracleRate * rateDeviationToleranceBps;
    }
}

