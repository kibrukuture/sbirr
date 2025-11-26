// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title SchnlControlledUpgradeable
 * @notice Upgradeable access control mixin for Schnl (tolbel LLC).
 * @dev Mirrors the original SchnlControlled contract but exposes initializer hooks instead of a constructor.
 *      Designed to be composed with UUPS/Transparent proxy deployments where storage must be initialized via
 *      explicit functions.
 */
abstract contract SchnlControlledUpgradeable is Initializable {
    /// @notice Address of the Schnl Admin (has ultimate control)
    address public schnlAdmin;

    /// @notice Address of the Schnl Operator (can mint/burn depending on governance)
    address public schnlOperator;

    event SchnlAdminUpdated(address indexed oldAdmin, address indexed newAdmin);
    event SchnlOperatorUpdated(address indexed oldOperator, address indexed newOperator);

    error OnlySchnlAdmin();
    error OnlySchnlOperator();
    error ZeroAddress();

    /**
     * @notice Initialize Schnl control state.
     * @dev Should be called from the child contract’s initializer.
     */
    function __SchnlControlled_init(address admin, address operator) internal onlyInitializing {
        if (admin == address(0) || operator == address(0)) revert ZeroAddress();
        schnlAdmin = admin;
        schnlOperator = operator;

        emit SchnlAdminUpdated(address(0), admin);
        emit SchnlOperatorUpdated(address(0), operator);
    }

    modifier onlySchnlAdmin() {
        if (msg.sender != schnlAdmin) revert OnlySchnlAdmin();
        _;
    }

    modifier onlySchnlOperator() {
        if (msg.sender != schnlOperator) revert OnlySchnlOperator();
        _;
    }

    function updateSchnlAdmin(address newAdmin) external onlySchnlAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        address oldAdmin = schnlAdmin;
        schnlAdmin = newAdmin;
        emit SchnlAdminUpdated(oldAdmin, newAdmin);
    }

    function updateSchnlOperator(address newOperator) external onlySchnlAdmin {
        if (newOperator == address(0)) revert ZeroAddress();
        address oldOperator = schnlOperator;
        schnlOperator = newOperator;
        emit SchnlOperatorUpdated(oldOperator, newOperator);
    }

    uint256[48] private __gap;
}

