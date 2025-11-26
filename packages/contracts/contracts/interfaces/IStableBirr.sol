// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./IPriceFeed.sol";

/**
 * @title IStableBirr
 * @notice Interface for the StableBirr (SBirr) stablecoin
 * @dev Defines all external functions for StableBirr operations including
 *      standard ERC20, Schnl controls, blacklisting, and gasless approvals.
 */
interface IStableBirr is IERC20, IERC20Metadata {
    // ============ Events ============
    
    /**
     * @notice Emitted when StableBirr is minted
     * @param to Recipient address
     * @param amount Amount minted
     * @param usdAmount USD collateral amount
     * @param rate Exchange rate used
     * @param timestamp Block timestamp
     */
    event Minted(
        address indexed to,
        uint256 amount,
        uint256 usdAmount,
        uint256 rate,
        uint256 timestamp
    );

    /**
     * @notice Emitted when StableBirr is burned
     * @param from Address burned from
     * @param amount Amount burned
     * @param merchantId Merchant ID associated with burn
     * @param timestamp Block timestamp
     */
    event Burned(
        address indexed from,
        uint256 amount,
        string merchantId,
        uint256 timestamp
    );

    /**
     * @notice Emitted when an address is blacklisted
     * @param account Address blacklisted
     */
    event Blacklisted(address indexed account);

    /**
     * @notice Emitted when an address is unblacklisted
     * @param account Address unblacklisted
     */
    event UnBlacklisted(address indexed account);

    /**
     * @notice Emitted when tokens are rescued from the contract
     * @param token Token address rescued
     * @param to Recipient address
     * @param amount Amount rescued
     */
    event Rescued(address indexed token, address indexed to, uint256 amount);

    /**
     * @notice Emitted when the maximum circulating supply is updated
     * @param newCap New cap in SBirr (18 decimals). Zero disables the cap.
     */
    event SupplyCapUpdated(uint256 newCap);

    /**
     * @notice Emitted when an address is frozen for compliance reasons
     * @param account Address frozen
     * @param triggeredBy Schnl Admin who executed the freeze
     * @param reason Case reference or explanation
     * @param timestamp Block timestamp
     */
    event AccountFrozen(
        address indexed account,
        address indexed triggeredBy,
        string reason,
        uint256 timestamp
    );

    /**
     * @notice Emitted when an address is unfrozen
     * @param account Address unfrozen
     * @param triggeredBy Schnl Admin who executed the unfreeze
     * @param reason Case reference or explanation
     * @param timestamp Block timestamp
     */
    event AccountUnfrozen(
        address indexed account,
        address indexed triggeredBy,
        string reason,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a frozen balance is wiped following a regulatory order
     * @param account Address whose balance was wiped
     * @param triggeredBy Schnl Admin who executed the wipe
     * @param amount Amount burned
     * @param caseId Case identifier or warrant reference
     * @param timestamp Block timestamp
     */
    event FrozenBalanceWiped(
        address indexed account,
        address indexed triggeredBy,
        uint256 amount,
        string caseId,
        uint256 timestamp
    );

    /**
     * @notice Emitted whenever the contract is paused or unpaused with a reason
     * @param action "PAUSE" or "UNPAUSE"
     * @param triggeredBy Schnl Admin who executed the action
     * @param reason Incident or maintenance reference
     * @param timestamp Block timestamp
     */
    event IncidentLogged(
        string action,
        address indexed triggeredBy,
        string reason,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a minter configuration changes.
     * @param minter Address being configured.
     * @param allowance Remaining mint allowance.
     * @param canBurn Whether the minter can initiate burns.
     */
    event MinterConfigured(
        address indexed minter,
        uint256 allowance,
        bool canBurn
    );

    /**
     * @notice Emitted when a minter is removed entirely.
     * @param minter Address removed.
     */
    event MinterRemoved(address indexed minter);

    /**
     * @notice Emitted after each mint to track allowance consumption.
     * @param minter Address that performed the mint.
     * @param newAllowance Remaining allowance.
     */
    event MintAllowanceUsed(address indexed minter, uint256 newAllowance);

    // ============ Core Stablecoin Functions ============

    /**
     * @notice Mint new StableBirr tokens against a verified fiat inflow.
     * @dev Only callable by the Schnl Operator. Implementations must enforce oracle alignment,
     *      deviation tolerance, and supply caps so the peg remains intact.
     * @param to Recipient address.
     * @param amount Token amount (18 decimals) to mint.
     * @param usdAmount USD collateral amount (18 decimals) used for audit transparency.
     * @param rate Operator-supplied FX snapshot that must match the oracle within tolerance.
     */
    function mint(
        address to,
        uint256 amount,
        uint256 usdAmount,
        uint256 rate
    ) external;

    /**
     * @notice Burn StableBirr tokens for merchant payout / redemption.
     * @dev Only callable by the Schnl Operator. Burning must emit structured metadata so fiat
     *      banking flows can be reconciled.
     * @param from Address whose balance will be reduced.
     * @param amount Amount to burn (18 decimals).
     * @param merchantId Merchant ID or payout reference for audit linking.
     */
    function burn(
        address from,
        uint256 amount,
        string calldata merchantId
    ) external;

    // ============ Schnl Control Functions ============

    /**
     * @notice Pause all token operations with an incident reason.
     * @dev Only callable by Schnl Admin. Implementations should emit human-readable metadata for audits.
     * @param reason Explanation or incident reference.
     */
    function pause(string calldata reason) external;

    /**
     * @notice Unpause all token operations with an incident reason.
     * @dev Only callable by Schnl Admin.
     * @param reason Explanation or resolution reference.
     */
    function unpause(string calldata reason) external;

    /**
     * @notice Blacklist an address (prevent transfers)
     * @dev Only callable by Schnl Admin
     * @param account Address to blacklist
     */
    function blacklist(address account) external;

    /**
     * @notice Unblacklist an address
     * @dev Only callable by Schnl Admin
     * @param account Address to unblacklist
     */
    function unblacklist(address account) external;

    /**
     * @notice Check if an address is blacklisted
     * @param account Address to check
     * @return bool True if blacklisted
     */
    function isBlacklisted(address account) external view returns (bool);

    /**
     * @notice Freeze an address to block transfers without removing funds.
     * @dev Only callable by Schnl Admin. Must emit structured events for downstream monitoring.
     * @param account Address to freeze.
     * @param reason Compliance or incident reference string.
     */
    function freeze(address account, string calldata reason) external;

    /**
     * @notice Remove a freeze from an address.
     * @dev Only callable by Schnl Admin.
     * @param account Address to unfreeze.
     * @param reason Compliance or incident reference.
     */
    function unfreeze(address account, string calldata reason) external;

    /**
     * @notice Permanently wipe the balance of a frozen address.
     * @dev Only callable by Schnl Admin and only when the address is frozen. Used for legal seizures.
     * @param account Address whose balance will be burned.
     * @param caseId Case identifier tying the wipe to an external order.
     */
    function wipeFrozenBalance(address account, string calldata caseId) external;

    /**
     * @notice Check if an address is currently frozen
     * @param account Address to check
     * @return bool True if frozen
     */
    function isFrozen(address account) external view returns (bool);

    /**
     * @notice Configure maximum circulating supply (0 disables enforcement).
     * @param newCap New max supply in wei.
     */
    function setSupplyCap(uint256 newCap) external;

    /**
     * @notice Configure or update an authorized minter.
     * @param minter Address to authorize.
     * @param allowance Remaining mint capacity (set to max for unlimited).
     * @param canBurn Whether the minter is allowed to initiate burns.
     */
    function configureMinter(
        address minter,
        uint256 allowance,
        bool canBurn
    ) external;

    /**
     * @notice Remove a minter entirely.
     * @param minter Address to revoke.
     */
    function removeMinter(address minter) external;

    /**
     * @notice Check whether an address is currently an active minter.
     */
    function isMinter(address minter) external view returns (bool);

    /**
     * @notice Fetch the remaining allowance for a minter.
     */
    function minterAllowance(address minter) external view returns (uint256);

    /**
     * @notice Check if a minter is authorized to burn.
     */
    function minterCanBurn(address minter) external view returns (bool);

    /**
     * @notice Rescue ERC20 tokens sent to this contract by mistake
     * @dev Only callable by Schnl Admin
     * @param tokenAddress Address of token to rescue
     * @param to Address to send rescued tokens to
     * @param amount Amount to rescue
     */
    function rescueERC20(address tokenAddress, address to, uint256 amount) external;

    // ============ Access Control Views ============
    // Note: schnlAdmin() and schnlOperator() are provided by public state variables
    // in SchnlControlledUpgradeable, which automatically generate getter functions


    // Note: paused() is provided by PausableUpgradeable
}
