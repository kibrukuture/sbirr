// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SchnlControlled
 * @notice Access control for Schnl (tolbel LLC)
 * @dev Provides modifiers and functions for Schnl-controlled operations.
 *      Schnl Admin has ultimate control, while Schnl Operator handles day-to-day operations.
 */
abstract contract SchnlControlled {
    // ============ State Variables ============

    /// @notice Address of the Schnl Admin (has ultimate control)
    address public schnlAdmin;

    /// @notice Address of the Schnl Operator (can mint/burn)
    address public schnlOperator;

    // ============ Events ============

    /**
     * @notice Emitted when Schnl Admin is updated
     * @param oldAdmin Previous admin address
     * @param newAdmin New admin address
     */
    event SchnlAdminUpdated(
        address indexed oldAdmin,
        address indexed newAdmin
    );

    /**
     * @notice Emitted when Schnl Operator is updated
     * @param oldOperator Previous operator address
     * @param newOperator New operator address
     */
    event SchnlOperatorUpdated(
        address indexed oldOperator,
        address indexed newOperator
    );

    // ============ Errors ============

    error OnlySchnlAdmin();
    error OnlySchnlOperator();
    error ZeroAddress();

    // ============ Constructor ============

    /**
     * @notice Initialize Schnl control
     * @param _schnlAdmin Initial Schnl Admin address
     * @param _schnlOperator Initial Schnl Operator address
     */
    constructor(address _schnlAdmin, address _schnlOperator) {
        if (_schnlAdmin == address(0) || _schnlOperator == address(0)) {
            revert ZeroAddress();
        }
        
        schnlAdmin = _schnlAdmin;
        schnlOperator = _schnlOperator;

        emit SchnlAdminUpdated(address(0), _schnlAdmin);
        emit SchnlOperatorUpdated(address(0), _schnlOperator);
    }

    // ============ Modifiers ============

    /**
     * @notice Restrict function to Schnl Admin only
     */
    modifier onlySchnlAdmin() {
        if (msg.sender != schnlAdmin) {
            revert OnlySchnlAdmin();
        }
        _;
    }

    /**
     * @notice Restrict function to Schnl Operator only
     */
    modifier onlySchnlOperator() {
        if (msg.sender != schnlOperator) {
            revert OnlySchnlOperator();
        }
        _;
    }

    // ============ Functions ============

    /**
     * @notice Update Schnl Admin address
     * @dev Only callable by current Schnl Admin
     * @param newAdmin New Schnl Admin address
     */
    function updateSchnlAdmin(address newAdmin) external onlySchnlAdmin {
        if (newAdmin == address(0)) {
            revert ZeroAddress();
        }

        address oldAdmin = schnlAdmin;
        schnlAdmin = newAdmin;

        emit SchnlAdminUpdated(oldAdmin, newAdmin);
    }

    /**
     * @notice Update Schnl Operator address
     * @dev Only callable by Schnl Admin
     * @param newOperator New Schnl Operator address
     */
    function updateSchnlOperator(address newOperator) external onlySchnlAdmin {
        if (newOperator == address(0)) {
            revert ZeroAddress();
        }

        address oldOperator = schnlOperator;
        schnlOperator = newOperator;

        emit SchnlOperatorUpdated(oldOperator, newOperator);
    }
}
