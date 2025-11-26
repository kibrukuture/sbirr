// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Conversion
 * @notice Library for USD/ETB conversion calculations
 * @dev Handles exchange rate math with proper scaling
 */
library Conversion {
    // ============ Constants ============

    /// @notice Scaling factor for exchange rates (18 decimals)
    uint256 public constant RATE_SCALE = 1e18;

    /// @notice Minimum allowed exchange rate (1 ETB/USD)
    uint256 public constant MIN_RATE = 1 * RATE_SCALE;

    /// @notice Maximum allowed exchange rate (1000 ETB/USD)
    uint256 public constant MAX_RATE = 1000 * RATE_SCALE;

    // ============ Errors ============

    error InvalidRate();
    error InvalidAmount();

    // ============ Functions ============

    /**
     * @notice Convert USD to ETB
     * @dev amount_etb = amount_usd * rate
     * @param usdAmount Amount in USD (scaled by 1e18)
     * @param rate Exchange rate (ETB per USD, scaled by 1e18)
     * @return Amount in ETB (scaled by 1e18)
     */
    function usdToEtb(
        uint256 usdAmount,
        uint256 rate
    ) internal pure returns (uint256) {
        if (usdAmount == 0) revert InvalidAmount();
        if (rate < MIN_RATE || rate > MAX_RATE) revert InvalidRate();

        // usdAmount * rate / RATE_SCALE
        return (usdAmount * rate) / RATE_SCALE;
    }

    /**
     * @notice Convert ETB to USD
     * @dev amount_usd = amount_etb / rate
     * @param etbAmount Amount in ETB (scaled by 1e18)
     * @param rate Exchange rate (ETB per USD, scaled by 1e18)
     * @return Amount in USD (scaled by 1e18)
     */
    function etbToUsd(
        uint256 etbAmount,
        uint256 rate
    ) internal pure returns (uint256) {
        if (etbAmount == 0) revert InvalidAmount();
        if (rate < MIN_RATE || rate > MAX_RATE) revert InvalidRate();

        // etbAmount * RATE_SCALE / rate
        return (etbAmount * RATE_SCALE) / rate;
    }

    /**
     * @notice Validate exchange rate is within acceptable bounds
     * @param rate Exchange rate to validate
     * @return True if valid, reverts otherwise
     */
    function validateRate(uint256 rate) internal pure returns (bool) {
        if (rate < MIN_RATE || rate > MAX_RATE) revert InvalidRate();
        return true;
    }

    /**
     * @notice Calculate ETB amount from USD with validation
     * @param usdAmount USD amount
     * @param rate Exchange rate
     * @return ETB amount
     */
    function calculateEtbAmount(
        uint256 usdAmount,
        uint256 rate
    ) internal pure returns (uint256) {
        validateRate(rate);
        return usdToEtb(usdAmount, rate);
    }
}
