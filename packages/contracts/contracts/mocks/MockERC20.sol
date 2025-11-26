// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title MockERC20
 * @dev Simple ERC20 token for testing rescue functionality.
 */
contract MockERC20 is Initializable, ERC20Upgradeable {
    function initialize(string memory name_, string memory symbol_, uint256 initialSupply, address owner) public initializer {
        __ERC20_init(name_, symbol_);
        _mint(owner, initialSupply);
    }

    // Mint function for tests if needed
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
