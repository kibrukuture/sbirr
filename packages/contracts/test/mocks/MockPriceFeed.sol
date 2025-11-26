// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../contracts/interfaces/IPriceFeed.sol";

/**
 * @title MockPriceFeed
 * @notice Chainlink-compatible mock oracle for testing StableBirr.
 * 
 * **Why this exists**
 * Testing mint/burn flows requires a functioning oracle, but we can't rely on live Chainlink feeds
 * during unit tests. This mock lets us simulate:
 * - Valid oracle responses with configurable rates
 * - Stale data scenarios (old timestamps)
 * - Invalid data (negative answers, zero rounds)
 * - Oracle failures (revert on latestRoundData)
 * 
 * **How to use**
 * 1. Deploy MockPriceFeed with desired decimals (typically 8 for Chainlink)
 * 2. Call `setLatestAnswer()` to configure the rate and timestamp
 * 3. Pass the mock address to StableBirr's `updateFxOracle()`
 * 4. Manipulate the mock state to test edge cases
 */
contract MockPriceFeed is IPriceFeed {
    uint8 private _decimals;
    int256 private _latestAnswer;
    uint256 private _latestTimestamp;
    uint80 private _latestRound;
    bool private _shouldRevert;

    /**
     * @notice Initialize the mock with a specific decimal precision.
     * @param decimals_ Number of decimals (8 for Chainlink USD pairs).
     */
    constructor(uint8 decimals_) {
        _decimals = decimals_;
        _latestRound = 1;
        _latestTimestamp = block.timestamp;
        _latestAnswer = 0;
    }

    /**
     * @notice Configure the mock to return specific data.
     * @param answer The price answer (scaled by decimals).
     * @param timestamp When this data was "updated" (use block.timestamp for fresh data).
     */
    function setLatestAnswer(int256 answer, uint256 timestamp) external {
        _latestAnswer = answer;
        _latestTimestamp = timestamp;
        _latestRound++;
    }

    /**
     * @notice Force the mock to revert on latestRoundData() calls.
     * @param shouldRevert True to enable revert behavior.
     * 
     * @dev Use this to simulate oracle outages or network failures.
     */
    function setShouldRevert(bool shouldRevert) external {
        _shouldRevert = shouldRevert;
    }

    /**
     * @notice Simulate stale data by setting an old timestamp.
     * @param secondsAgo How many seconds in the past the data should appear.
     */
    function setStaleData(uint256 secondsAgo) external {
        _latestTimestamp = block.timestamp - secondsAgo;
    }

    /**
     * @notice Return the configured decimal precision.
     */
    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Return mock oracle data in Chainlink's format.
     * @return roundId The round ID (increments with each update).
     * @return answer The price (scaled by decimals).
     * @return startedAt Always returns the same as updatedAt for simplicity.
     * @return updatedAt Timestamp when the answer was "updated".
     * @return answeredInRound Same as roundId (Chainlink convention).
     */
    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        if (_shouldRevert) {
            revert("MockPriceFeed: forced revert");
        }

        return (
            _latestRound,
            _latestAnswer,
            _latestTimestamp,
            _latestTimestamp,
            _latestRound
        );
    }

    /**
     * @notice Helper to set invalid data (negative answer, zero round).
     * @dev Use this to test StableBirr's validation logic.
     */
    function setInvalidData() external {
        _latestAnswer = -1;
        _latestRound = 0;
        _latestTimestamp = 0;
    }
}
