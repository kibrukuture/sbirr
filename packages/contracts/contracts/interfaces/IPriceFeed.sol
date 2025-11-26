// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPriceFeed
 * @notice Minimal interface for external FX oracles (e.g., Chainlink AggregatorV3).
 */
interface IPriceFeed {
    function decimals() external view returns (uint8);

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

