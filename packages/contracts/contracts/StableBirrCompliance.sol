// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./StableBirrBase.sol";

/**
 * @title StableBirrCompliance
 * @notice Houses every function that enforces policy controls: blacklist, freeze, rescue, pause.
 *
 * **Why this file matters**
 * Compliance levers evolve faster than mint logic. By isolating them here, auditors and regulators
 * can review every enforcement primitive (freeze, unfreeze, wipe, blacklist, pause) without digging
 * through oracle or mint code.
 *
 * **How to read this file**
 * - Section "Blacklist" mirrors sanctions workflows.
 * - Section "Freeze" covers investigative holds + legal seizure (`wipeFrozenBalance`).
 * - Section "Rescue & Pause" handles operational safeguards (token recovery, circuit breaker).
 *
 * Every function requires `onlySchnlAdmin`, emits structured events, and includes narrative
 * documentation so even a non-engineer can follow the business process being enforced.
 */
abstract contract StableBirrCompliance is StableBirrBase {
    using SafeERC20 for IERC20;

    // -------------------------------------------------------------------------
    // ----------------------------- Blacklist --------------------------------
    // -------------------------------------------------------------------------

    /**
     * @notice Flag an address so it can neither send nor receive SBirr.
     * @param account Address to blacklist.
     *
     * @dev Blacklisting is a blunt instrument reserved for sanctions or fraud cases. Frozen
     *      accounts can eventually be restored; blacklisted accounts cannot interact at all until
     *      explicitly unblacklisted. We still allow idempotent calls to avoid griefing.
     */
    function blacklist(address account) external override onlySchnlAdmin {
        if (_blacklisted[account]) return;
        _blacklisted[account] = true;
        emit Blacklisted(account);
    }

    /**
     * @notice Remove an address from the blacklist.
     * @param account Address to unblacklist.
     *
     * @dev Emits `UnBlacklisted` so monitoring systems can pick up remediation events. No revert
     *      when the account is already clean to keep the function ergonomic during bulk actions.
     */
    function unblacklist(address account) external override onlySchnlAdmin {
        if (!_blacklisted[account]) return;
        _blacklisted[account] = false;
        emit UnBlacklisted(account);
    }

    /**
     * @notice Check whether an address is blacklisted.
     */
    function isBlacklisted(address account) external view override returns (bool) {
        return _blacklisted[account];
    }

    // -------------------------------------------------------------------------
    // ------------------------------- Freeze ---------------------------------
    // -------------------------------------------------------------------------

    /**
     * @notice Freeze an address so its funds cannot move while a compliance case is active.
     * @param account Address to freeze.
     * @param reason Case identifier or written explanation. Required for audit trails.
     *
     * @dev Freezing is softer than blacklisting: tokens remain in the user’s balance, but every
     *      mint/burn/transfer hook reverts. This mirrors how regulated issuers respond to subpoenas
     *      or fraud investigations—they immobilize funds pending instruction instead of deleting them.
     */
    function freeze(address account, string calldata reason) external override onlySchnlAdmin {
        if (account == address(0)) revert InvalidAddress();
        if (_frozen[account]) revert AccountAlreadyFrozen(account);
        _requireIncidentReason(reason);

        _frozen[account] = true;
        emit AccountFrozen(account, msg.sender, reason, block.timestamp);
    }

    /**
     * @notice Lift an existing freeze once the case has been resolved.
     * @param account Address to unfreeze.
     * @param reason Case closure reason (appears in events for full traceability).
     *
     * @dev Requires the same reason discipline as `freeze` so that an auditor can always tie a
     *      freeze/unfreeze pair back to a specific ticket, subpoena, or internal incident.
     */
    function unfreeze(address account, string calldata reason) external override onlySchnlAdmin {
        if (!_frozen[account]) revert AccountNotFrozen(account);
        _requireIncidentReason(reason);

        _frozen[account] = false;
        emit AccountUnfrozen(account, msg.sender, reason, block.timestamp);
    }

    /**
     * @notice Irreversibly wipe the balance of a frozen address under a regulatory order.
     * @param account Address whose balance is being wiped.
     * @param caseId Case identifier or warrant reference (stored on-chain for accountability).
     *
     * @dev This action is designed for extreme cases (court-ordered seizures, AML escalations).
     *      It can only run when the account is frozen to avoid accidental wipes, updates the
     *      `totalFrozenWiped` counter, and emits a structured event for attestations.
     */
    function wipeFrozenBalance(address account, string calldata caseId) external override onlySchnlAdmin {
        if (!_frozen[account]) revert AccountNotFrozen(account);
        _requireIncidentReason(caseId);

        uint256 balance = balanceOf(account);
        if (balance == 0) revert InvalidAmount();

        totalFrozenWiped += balance;
        _burn(account, balance);

        emit FrozenBalanceWiped(account, msg.sender, balance, caseId, block.timestamp);
    }

    /**
     * @notice View helper for SDKs / dashboards to know whether an account is currently frozen.
     */
    function isFrozen(address account) external view override returns (bool) {
        return _frozen[account];
    }

    // -------------------------------------------------------------------------
    // -------------------------- Rescue & Pausing -----------------------------
    // -------------------------------------------------------------------------

    /**
     * @notice Rescue arbitrary ERC20 tokens that were accidentally sent to the contract.
     * @param tokenAddress Address of the token to recover (cannot be SBirr itself).
     * @param to Recipient of the rescued funds.
     * @param amount Amount to transfer.
     *
     * @dev Many users mistakenly send tokens directly to a contract. This function lets Schnl
     *      administrators recover those assets and return them to the rightful owner. SBirr itself
     *      cannot be rescued (mint/burn flows must be used instead).
     */
    function rescueERC20(
        address tokenAddress,
        address to,
        uint256 amount
    ) external override onlySchnlAdmin {
        if (tokenAddress == address(this)) revert InvalidAddress();
        IERC20(tokenAddress).safeTransfer(to, amount);
        emit Rescued(tokenAddress, to, amount);
    }

    /**
     * @notice Pause the entire token (mints, burns, transfers) with a human-readable reason.
     * @param reason Incident, maintenance window, or runbook reference string.
     *
     * @dev Emits `IncidentLogged` in addition to OpenZeppelin’s `Paused` event so downstream
     *      systems know *why* a pause occurred (e.g., “Custodian outage – change ticket #1234”).
     */
    function pause(string calldata reason) external override onlySchnlAdmin {
        _requireIncidentReason(reason);
        _pause();
        emit IncidentLogged("PAUSE", msg.sender, reason, block.timestamp);
    }

    /**
     * @notice Resume operations after an incident is resolved.
     * @param reason Resolution summary or change-management ticket ID.
     *
     * @dev Forces the operator to document how the incident was resolved. This makes on-chain logs
     *      a reliable source of truth for auditors reviewing incident management.
     */
    function unpause(string calldata reason) external override onlySchnlAdmin {
        _requireIncidentReason(reason);
        _unpause();
        emit IncidentLogged("UNPAUSE", msg.sender, reason, block.timestamp);
    }

    /**
     * @dev Hook invoked before any transfer/mint/burn. Enforces blacklist + freeze status in addition
     *      to the inherited pause checks. Centralizing the guard here guarantees that even low-level
     *      ERC20 operations respect compliance constraints.
     *      
     *      Note: OpenZeppelin v5 uses _update instead of _beforeTokenTransfer.
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override {
        // Check pause status first
        if (paused()) revert EnforcedPause();
        
        // Check blacklist and freeze for sender (skip for minting from zero address)
        if (from != address(0)) {
            if (_blacklisted[from]) revert AccountBlacklisted(from);
            if (_frozen[from]) revert AccountFrozenState(from);
        }
        
        // Check blacklist and freeze for recipient (skip for burning to zero address)
        if (to != address(0)) {
            if (_blacklisted[to]) revert AccountBlacklisted(to);
            if (_frozen[to]) revert AccountFrozenState(to);
        }

        super._update(from, to, amount);
    }
}

