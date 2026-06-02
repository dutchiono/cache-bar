// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/// @title AgentToken
/// @notice Cloneable fixed-supply token deployed once for each launched agent.
contract AgentToken is IERC20Metadata {
    error AlreadyInitialized();
    error InvalidRecipient();
    error InvalidSender();
    error InsufficientBalance();
    error InsufficientAllowance();

    bool public initialized;
    address public creator;
    string private tokenName;
    string private tokenSymbol;
    uint256 private tokenSupply;
    mapping(address account => uint256 balance) private balances;
    mapping(address owner => mapping(address spender => uint256 amount)) private allowances;

    constructor() {
        // The implementation contract cannot be initialized directly. Clone storage starts empty.
        initialized = true;
    }

    function initialize(
        string calldata name_,
        string calldata symbol_,
        uint256 supply_,
        address recipient_,
        address creator_
    ) external {
        if (initialized) revert AlreadyInitialized();
        if (recipient_ == address(0) || creator_ == address(0)) revert InvalidRecipient();

        initialized = true;
        creator = creator_;
        tokenName = name_;
        tokenSymbol = symbol_;
        tokenSupply = supply_;
        balances[recipient_] = supply_;

        emit Transfer(address(0), recipient_, supply_);
    }

    function name() external view returns (string memory) {
        return tokenName;
    }

    function symbol() external view returns (string memory) {
        return tokenSymbol;
    }

    function decimals() external pure returns (uint8) {
        return 18;
    }

    function totalSupply() external view returns (uint256) {
        return tokenSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return allowances[owner][spender];
    }

    function approve(address spender, uint256 value) external returns (bool) {
        if (spender == address(0)) revert InvalidRecipient();
        allowances[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 currentAllowance = allowances[from][msg.sender];
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < value) revert InsufficientAllowance();
            unchecked {
                allowances[from][msg.sender] = currentAllowance - value;
            }
            emit Approval(from, msg.sender, allowances[from][msg.sender]);
        }

        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        if (from == address(0)) revert InvalidSender();
        if (to == address(0)) revert InvalidRecipient();

        uint256 fromBalance = balances[from];
        if (fromBalance < value) revert InsufficientBalance();
        unchecked {
            balances[from] = fromBalance - value;
            balances[to] += value;
        }

        emit Transfer(from, to, value);
    }
}
