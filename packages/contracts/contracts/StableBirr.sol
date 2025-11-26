// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./StableBirrOperations.sol";
import "./StableBirrBase.sol";
 

/**
 * @title StableBirr
 * @notice Upgradeable facade composing the StableBirr modules behind a UUPS proxy.
 *
 * @dev Deploy via `initialize` rather than a constructor. The initializer wires Schnl governance,
 *      sets the initial oracle (optional), and leaves the contract paused until Schnl Admin calls
 *      `unpause` with a reason. Upgrades are restricted to Schnl Admin through `_authorizeUpgrade`.
 */
contract StableBirr is Initializable, UUPSUpgradeable, StableBirrOperations {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the StableBirr proxy.
     * @param schnlAdmin_ Schnl Admin address.
     * @param schnlOperator_ Schnl Operator address.
     * @param oracle Optional oracle address to configure immediately (use address(0) to skip).
     */
    function initialize(
        address schnlAdmin_,
        address schnlOperator_,
        address oracle
    ) public initializer {
        __StableBirrBase_init(schnlAdmin_, schnlOperator_);
        __UUPSUpgradeable_init();
        if (oracle != address(0)) {
            _setFxOracle(oracle);
        }
    }

    /**
     * @dev UUPS authorization hook.
     */
    function _authorizeUpgrade(address) internal override onlySchnlAdmin {}
}

