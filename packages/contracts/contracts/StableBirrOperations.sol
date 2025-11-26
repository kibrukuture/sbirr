// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./StableBirrCompliance.sol";
import "./libraries/Conversion.sol";

/**
 * @title StableBirrOperations
 * @notice Contains the revenue-generating flows: minting, burning, transfers, and record lookups.
 *
 * **Where this sits in the stack**
 * All defensive checks (oracle validation, freeze/blacklist enforcement, pause state) happen in the
 * lower modules. By the time execution reaches `StableBirrOperations`, we can focus solely on
 * economic actions: mint, burn, transfer, and read audit trails.
 *
 * **Key responsibilities**
 * - Mint only when oracle rate, deviation tolerance, and supply cap all agree with the operator’s request.
 * - Burn with complete metadata (`merchantId`) so fiat redemptions can be reconciled.
 * - Override `transfer`/`transferFrom` to surface friendly error messages while still delegating to OZ.
 * - Provide read helpers for mint/burn records so dashboards can fetch provenance without indexing.
 *
 * Each public function below documents the “Why” as well as the “How” so operators and auditors know
 * exactly which invariants are enforced.
 */
abstract contract StableBirrOperations is StableBirrCompliance {
    /**
     * @notice Mint new SBirr tokens against a verified fiat inflow.
     *
     * **Context**
     * Each mint corresponds to an off-chain deposit into Schnl’s banking stack. This function is
     * only callable by addresses that Schnl Admin has explicitly configured via `configureMinter`,
     * each with their own allowance and optional burn permission. That allowance is consumed on
     * every successful mint to enforce the “trust but verify” principle adopted by institutional
     * stablecoins.
     *
     * **Validation pipeline**
     * 1. Reject zero addresses, blacklisted recipients, and frozen accounts.
     * 2. Fetch the oracle rate, ensure it’s fresh (`oracleStalePeriod`), and compare it against the
     *    operator-supplied `rate` using the deviation tolerance guardrail.
     * 3. Enforce conversion math (USD → ETB) so the provided `amount` matches the oracle-derived
     *    expectation down to the wei.
     * 4. Ensure the optional supply cap will not be exceeded.
     * 5. Record the mint in `mintRecords` and emit `Minted` for indexing/audit.
     * 6. Consume the caller’s allowance (unless configured for unlimited issuance).
     *
     * **Parameters**
     * @param to Recipient address.
     * @param amount Token amount (18 decimals) requested by the operator.
     * @param usdAmount Fiat value (18 decimals) that landed in custody.
     * @param rate Manually captured FX rate snapshot the operator observed when the deposit arrived.
     */
    function mint(
        address to,
        uint256 amount,
        uint256 usdAmount,
        uint256 rate
    ) external override onlyAuthorizedMinter whenNotPaused nonReentrant {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0 || usdAmount == 0) revert InvalidAmount();
        if (_blacklisted[to]) revert AccountBlacklisted(to);
        if (_frozen[to]) revert AccountFrozenState(to);

        if (supplyCap != 0) {
            uint256 newSupply = totalSupply() + amount;
            if (newSupply > supplyCap) {
                revert SupplyCapExceeded(supplyCap, newSupply);
            }
        }

        bytes32 recordId = keccak256(
            abi.encodePacked(to, amount, usdAmount, rate, block.timestamp)
        );

        mintRecords[recordId] = MintRecord({
            to: to,
            amount: amount,
            usdAmount: usdAmount,
            rate: rate,
            timestamp: block.timestamp,
            exists: true
        });

        totalUSDConverted += usdAmount;
        _mint(to, amount);
        _consumeMintAllowance(msg.sender, amount);

        emit Minted(to, amount, usdAmount, rate, block.timestamp);
    }

    /**
     * @notice Burn SBirr tokens as part of a fiat redemption / merchant payout.
     *
     * **Why burning matters**
     * StableBirr keeps liabilities and reserves in lockstep. Whenever fiat leaves custody (merchant
     * payout, institutional redemption, operational correction), the matching on-chain amount must
     * be destroyed. Burn access is therefore limited to Schnl Operator and any minter explicitly
     * flagged with `canBurn = true`.
     *
     * **Parameters**
     * @param from Address whose balance will be reduced.
     * @param amount Amount of SBirr (18 decimals) to retire.
     * @param merchantId Identifier tying the burn to an off-chain payout request (used by auditors).
     */
    function burn(
        address from,
        uint256 amount,
        string calldata merchantId
    ) external override whenNotPaused nonReentrant {
        if (!_hasBurnPermission(msg.sender)) {
            revert NotAuthorizedMinter(msg.sender);
        }
        if (from == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (balanceOf(from) < amount) revert InsufficientBalance();
        if (_blacklisted[from]) revert AccountBlacklisted(from);
        if (_frozen[from]) revert AccountFrozenState(from);

        bytes32 recordId = keccak256(
            abi.encodePacked(from, amount, merchantId, block.timestamp)
        );

        burnRecords[recordId] = BurnRecord({
            from: from,
            amount: amount,
            merchantId: merchantId,
            timestamp: block.timestamp,
            exists: true
        });

        totalBurned += amount;
        _burn(from, amount);

        emit Burned(from, amount, merchantId, block.timestamp);
    }

    /**
     * @notice Retrieve a previously stored mint record.
     * @param recordId keccak256 hash calculated during `mint`.
     *
     * @dev Useful for auditors or SDKs that want to display operator metadata without running an
     *      off-chain indexer. The struct includes recipient, USD amount, oracle rate, and timestamp.
     */
    function getMintRecord(bytes32 recordId) external view returns (MintRecord memory) {
        return mintRecords[recordId];
    }

    /**
     * @notice Retrieve a previously stored burn record.
     * @param recordId keccak256 hash calculated during `burn`.
     *
     * @dev Mirrors `getMintRecord` but for redemptions. `merchantId` links this on-chain action to
     *      off-chain payout tickets.
     */
    function getBurnRecord(bytes32 recordId) external view returns (BurnRecord memory) {
        return burnRecords[recordId];
    }

    /**
     * @notice ERC20 transfer override that enforces freeze/blacklist checks at the method level.
     *
     * @dev While `_beforeTokenTransfer` already guards transfers, overriding the public method gives
     *      friendlier error messages (e.g., `AccountFrozenState`). Wallets and exchanges commonly call
     *      `transfer` directly, so surfacing explicit errors improves UX.
     */
    function transfer(address to, uint256 amount)
        public
        override(ERC20Upgradeable, IERC20)
        returns (bool)
    {
        address sender = _msgSender();
        if (_blacklisted[sender]) revert AccountBlacklisted(sender);
        if (_frozen[sender]) revert AccountFrozenState(sender);
        if (to != address(0) && _blacklisted[to]) revert AccountBlacklisted(to);
        if (to != address(0) && _frozen[to]) revert AccountFrozenState(to);
        return super.transfer(to, amount);
    }

    /**
     * @notice ERC20 transferFrom override with the same compliance guards as `transfer`.
     *
     * @dev Prevents allowance-based transfers (DEXes, custodial wallets) from bypassing the freeze
     *      checks. Also ensures `whenNotPaused` applies consistently.
     */
    function transferFrom(address from, address to, uint256 amount)
        public
        override(ERC20Upgradeable, IERC20)
        returns (bool)
    {
        if (_blacklisted[from]) revert AccountBlacklisted(from);
        if (_frozen[from]) revert AccountFrozenState(from);
        if (to != address(0) && _blacklisted[to]) revert AccountBlacklisted(to);
        if (to != address(0) && _frozen[to]) revert AccountFrozenState(to);
        return super.transferFrom(from, to, amount);
    }

}