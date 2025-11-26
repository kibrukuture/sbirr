// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IStableBirr.sol";
import "./interfaces/IPriceFeed.sol";
import "./access/SchnlControlledUpgradeable.sol";
import "./libraries/Conversion.sol";

/**
 * @title StableBirrBase
 * @notice Foundational storage + utility layer shared by every StableBirr module.
 *
 * **Why this file exists**
 * StableBirr is now split across multiple single-purpose contracts. Something still has to hold
 * all shared storage (balances, audit ledgers, oracle config) and wire in OpenZeppelin’s ERC20,
 * Permit, Pausable, and Schnl governance mixins. `StableBirrBase` is that backbone.
 *
 * **What lives here**
 * - Every state variable that must remain at a fixed storage slot.
 * - Shared structs (`MintRecord`, `BurnRecord`) and custom errors.
 * - Tiny helper functions required by multiple modules (e.g., `_requireIncidentReason`).
 *
 * **How to read this file**
 * Treat it like a hardware schematic. No complex business logic runs here; you’re just seeing the
 * wires that connect higher-level modules. Each variable is annotated so even someone unfamiliar
 * with Ethiopian FX policy can map the storage slot to the operational process it supports.
 */
abstract contract StableBirrBase is
    ERC20Upgradeable,
    ERC20PermitUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    SchnlControlledUpgradeable,
    IStableBirr
{
    using SafeERC20 for IERC20;

    // -------------------------------------------------------------------------
    // --------------------------- Monetary Tracking --------------------------
    // -------------------------------------------------------------------------

    /**
     * @notice Aggregate USD value that has been converted into SBirr circulation.
     * @dev Acts as the on-chain mirror of fiat inflows held in custody. Treasury,
     *      auditors, and off-chain banking dashboards reconcile against this value.
     */
    uint256 public totalUSDConverted;

    /**
     * @notice Total SBirr destroyed through routine merchant / partner redemptions.
     * @dev Provides a clean separation between “economic” burns (settlements) and
     *      “compliance” burns (court ordered wipes) so reports stay intelligible.
     */
    uint256 public totalBurned;

    /**
     * @notice Sum of tokens wiped because of legal freezes (distinct from `totalBurned`).
     * @dev Regulators often require that seizure events be tracked separately from
     *      customer-initiated redemptions. Keeping this counter isolated enables that.
     */
    uint256 public totalFrozenWiped;

    // -------------------------------------------------------------------------
    // --------------------------- Compliance State ---------------------------
    // -------------------------------------------------------------------------

    /// @notice Sanctions / compliance blacklist. Blocks transfers, mint receipts, and burns.
    mapping(address => bool) internal _blacklisted;

    /// @notice Freeze registry used to immobilize funds while investigations run their course.
    mapping(address => bool) internal _frozen;

    /// @notice Audit-friendly mint ledger. Record IDs are keccak hashes emitted in events.
    mapping(bytes32 => MintRecord) public mintRecords;

    /// @notice Audit-friendly burn ledger mirroring the mint ledger semantics.
    mapping(bytes32 => BurnRecord) public burnRecords;

    /// @notice Role + allowance configuration for authorized minters/burners.
    mapping(address => MinterConfig) internal _minters;

    // -------------------------------------------------------------------------
    // --------------------------- Oracle & Supply -----------------------------
    // -------------------------------------------------------------------------

    /// @notice External FX oracle surfacing the authoritative USD/ETB rate (e.g., Chainlink).
    IPriceFeed public fxOracle;

    /**
     * @notice Maximum deviation (in basis points) tolerated between the Schnl operator’s
     *         supplied rate and the oracle rate.
     * @dev Defaults to 1% (100 bps). Setting to 0 requires an exact match, setting to 10_000
     *      tolerates 100% deviation. Guards against manual data entry mistakes.
     */
    uint256 public rateDeviationToleranceBps;

    /**
     * @notice Maximum allowable age (seconds) of oracle answers before mints halt.
     * @dev Prevents issuing tokens based on stale FX data. When set to zero the staleness
     *      check is disabled (useful for testing or when the oracle provides liveness guards).
     */
    uint256 public oracleStalePeriod;

    /**
     * @notice Maximum circulating supply allowed. Zero disables the cap.
     * @dev Helps enforce reserve discipline: set this to the attested fiat balance (minus
     *      operational buffers) so that even if an operator mistakes the inflow, the contract
     *      refuses to exceed the cap.
     */
    uint256 public supplyCap;

    /// @notice Cached oracle decimals for scaling the feed answer into 18 decimals.
    uint8 internal _oracleDecimals;

    /// @notice Snapshot of the last oracle rate used during mint operations (scaled to 18 decimals).
    uint256 public lastOracleRate;

    /// @notice Timestamp reported by the oracle for `lastOracleRate`. Useful for dashboards.
    uint256 public oracleLastUpdatedAt;

    /// @notice Denominator used when dealing with basis points math.
    uint256 internal constant BPS_DENOMINATOR = 10_000;

    // -------------------------------------------------------------------------
    // ------------------------------ Structs ---------------------------------
    // -------------------------------------------------------------------------

    /**
     * @notice Captures provenance for every minted allocation.
     * @dev `exists` allows cheap existence checks without needing to examine other fields.
     */
    struct MintRecord {
        address to;
        uint256 amount;
        uint256 usdAmount;
        uint256 rate;
        uint256 timestamp;
        bool exists;
    }

    /**
     * @notice Captures provenance for every redemption / burn event.
     * @dev `merchantId` acts as the link to off-chain payout requests.
     */
    struct BurnRecord {
        address from;
        uint256 amount;
        string merchantId;
        uint256 timestamp;
        bool exists;
    }

    /**
     * @notice Configuration for authorized minters/burners.
     * @dev `allowance` tracks remaining mint capacity. `canBurn` gates redemption flows. Setting
     *      `allowance` to type(uint256).max effectively grants unlimited minting (use sparingly).
     */
    struct MinterConfig {
        uint256 allowance;
        bool canBurn;
        bool active;
    }

    // -------------------------------------------------------------------------
    // -------------------------------- Events ---------------------------------
    // -------------------------------------------------------------------------
    // Note: Events are defined in IStableBirr interface to avoid duplication

    // -------------------------------------------------------------------------
    // ------------------------------- Errors ---------------------------------
    // -------------------------------------------------------------------------

    error InvalidAmount();
    error InvalidAddress();
    error InsufficientBalance();
    error AccountBlacklisted(address account);
    error AccountFrozenState(address account);
    error AccountAlreadyFrozen(address account);
    error AccountNotFrozen(address account);
    error IncidentReasonRequired();
    error AmountMismatch(uint256 expected, uint256 provided);
    error SupplyCapExceeded(uint256 cap, uint256 attempted);
    error OracleNotConfigured();
    error OracleRateInvalid();
    error OracleStale();
    error RateToleranceExceeded(uint256 oracleRate, uint256 providedRate);
    error InvalidTolerance();
    error OracleDecimalsNotSet();
    error NotAuthorizedMinter(address account);
    error MintAllowanceExceeded(address account, uint256 allowance, uint256 requested);

    modifier onlyAuthorizedMinter() {
        if (!_minters[msg.sender].active) {
            revert NotAuthorizedMinter(msg.sender);
        }
        _;
    }

    // -------------------------------------------------------------------------
    // ---------------------------- Initialization ----------------------------
    // -------------------------------------------------------------------------



    /**
     * @notice StableBirr always uses 18 decimals to align with most DeFi tooling.
     */
    function decimals() public pure override(ERC20Upgradeable, IERC20Metadata) returns (uint8) {
        return 18;
    }

    /**
     * @dev Utility ensuring operational actions always provide an audit-traceable reason.
     * @param reason Human-readable text or case ID reference.
     */
    function _requireIncidentReason(string calldata reason) internal pure {
        if (bytes(reason).length == 0) {
            revert IncidentReasonRequired();
        }
    }

    /**
     * @dev Internal initializer chaining all parent initializers.
     */
    function __StableBirrBase_init(address admin, address operator) internal onlyInitializing {
        __ERC20_init("StableBirr", "SBirr");
        __ERC20Permit_init("StableBirr");
        __Pausable_init();
        __ReentrancyGuard_init();
        __SchnlControlled_init(admin, operator);

        // Set default oracle parameters
        rateDeviationToleranceBps = 100; // 1%
        oracleStalePeriod = 3600; // 1 hour

        _pause();

        _minters[operator] = MinterConfig({
            allowance: type(uint256).max,
            canBurn: true,
            active: true
        });
        emit MinterConfigured(operator, type(uint256).max, true);
    }

    // -------------------------------------------------------------------------
    // ------------------------- Minter Configuration --------------------------
    // -------------------------------------------------------------------------

    /**
     * @notice Configure or update an authorized minter with an explicit allowance.
     *
     * **Operational guidance**
     * - Use large but finite allowances for day-to-day treasury wallets, forcing periodic manual
     *   reviews before more capacity is granted.
     * - Reserve `type(uint256).max` (effectively unlimited) for emergency or cold-storage signers
     *   that already require multi-sig approvals.
     * - Toggle `canBurn` when the signer should also handle redemption flows; otherwise they can
     *   only mint.
     *
     * Emits `MinterConfigured` so downstream systems log the governance change.
     */
    function configureMinter(
        address minter,
        uint256 allowance,
        bool canBurn
    ) external onlySchnlAdmin {
        if (minter == address(0)) revert InvalidAddress();
        _minters[minter] = MinterConfig({
            allowance: allowance,
            canBurn: canBurn,
            active: true
        });
        emit MinterConfigured(minter, allowance, canBurn);
    }

    /**
     * @notice Remove a minter entirely, revoking all rights and zeroing the allowance.
     *
     * Use this when rotating keys, decommissioning temporary issuers, or responding to compromises.
     * Idempotent: calling it multiple times has no side effects beyond the first invocation.
     */
    function removeMinter(address minter) external onlySchnlAdmin {
        if (!_minters[minter].active) return;
        delete _minters[minter];
        emit MinterRemoved(minter);
    }

    /**
     * @notice Check whether an address is currently configured as a minter.
     */
    function isMinter(address minter) external view returns (bool) {
        return _minters[minter].active;
    }

    /**
     * @notice Read the remaining mint allowance for a minter.
     */
    function minterAllowance(address minter) external view returns (uint256) {
        return _minters[minter].allowance;
    }

    /**
     * @notice Check if a minter is allowed to initiate burns.
     */
    function minterCanBurn(address minter) external view returns (bool) {
        return _minters[minter].canBurn && _minters[minter].active;
    }

    /**
     * @dev Consume allowance after a mint. Unlimited minters (MAX) bypass deduction.
     */
    function _consumeMintAllowance(address minter, uint256 amount) internal {
        MinterConfig storage config = _minters[minter];
        if (!config.active) revert NotAuthorizedMinter(minter);
        if (config.allowance == type(uint256).max) {
            // Unlimited allowance, nothing to deduct.
            return;
        }
        if (config.allowance < amount) {
            revert MintAllowanceExceeded(minter, config.allowance, amount);
        }
        config.allowance -= amount;
        emit MintAllowanceUsed(minter, config.allowance);
    }

    /**
     * @dev Helper used by burn logic to verify the caller has burn permissions.
     */
    function _hasBurnPermission(address account) internal view returns (bool) {
        if (account == schnlOperator) {
            return true;
        }
        MinterConfig storage config = _minters[account];
        return config.active && config.canBurn;
    }

    uint256[25] private __stablebirr_gap;
}

