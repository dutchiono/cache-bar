// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title AgentFeeProcessor
/// @notice Per-agent protocol-fee recipient with an immutable launch-time distribution policy.
contract AgentFeeProcessor {
    using SafeERC20 for IERC20;

    uint16 public constant BPS_DENOMINATOR = 10_000;

    error AlreadyInitialized();
    error InvalidAddress();
    error InvalidFeePolicy();
    error NoFeesAvailable();

    bool public initialized;
    uint256 public agentId;
    IERC20 public settlementToken;
    address public inferenceWallet;
    address public coldStartReserve;
    address public protocolOperations;
    address public creator;
    uint16 public agentInferenceBps;
    uint16 public coldStartReserveBps;
    uint16 public protocolOperationsBps;
    uint16 public creatorBps;

    event FeesRouted(
        uint256 indexed agentId,
        address indexed settlementToken,
        uint256 totalAmount,
        uint256 agentInferenceAmount,
        uint256 coldStartReserveAmount,
        uint256 protocolOperationsAmount,
        uint256 creatorAmount
    );

    constructor() {
        // The implementation contract cannot be initialized directly. Clone storage starts empty.
        initialized = true;
    }

    function initialize(
        uint256 agentId_,
        address settlementToken_,
        address inferenceWallet_,
        address coldStartReserve_,
        address protocolOperations_,
        address creator_,
        uint16 agentInferenceBps_,
        uint16 coldStartReserveBps_,
        uint16 protocolOperationsBps_,
        uint16 creatorBps_
    ) external {
        if (initialized) revert AlreadyInitialized();
        if (
            settlementToken_ == address(0) ||
            inferenceWallet_ == address(0) ||
            coldStartReserve_ == address(0) ||
            protocolOperations_ == address(0) ||
            creator_ == address(0)
        ) {
            revert InvalidAddress();
        }

        uint256 totalBps =
            uint256(agentInferenceBps_) +
            uint256(coldStartReserveBps_) +
            uint256(protocolOperationsBps_) +
            uint256(creatorBps_);
        if (totalBps != BPS_DENOMINATOR) revert InvalidFeePolicy();

        initialized = true;
        agentId = agentId_;
        settlementToken = IERC20(settlementToken_);
        inferenceWallet = inferenceWallet_;
        coldStartReserve = coldStartReserve_;
        protocolOperations = protocolOperations_;
        creator = creator_;
        agentInferenceBps = agentInferenceBps_;
        coldStartReserveBps = coldStartReserveBps_;
        protocolOperationsBps = protocolOperationsBps_;
        creatorBps = creatorBps_;
    }

    function routeFees() external {
        uint256 totalAmount = settlementToken.balanceOf(address(this));
        if (totalAmount == 0) revert NoFeesAvailable();

        uint256 coldStartReserveAmount = totalAmount * coldStartReserveBps / BPS_DENOMINATOR;
        uint256 protocolOperationsAmount = totalAmount * protocolOperationsBps / BPS_DENOMINATOR;
        uint256 creatorAmount = totalAmount * creatorBps / BPS_DENOMINATOR;
        // Assign rounding dust to the agent that generated the revenue.
        uint256 agentInferenceAmount =
            totalAmount - coldStartReserveAmount - protocolOperationsAmount - creatorAmount;

        settlementToken.safeTransfer(inferenceWallet, agentInferenceAmount);
        settlementToken.safeTransfer(coldStartReserve, coldStartReserveAmount);
        settlementToken.safeTransfer(protocolOperations, protocolOperationsAmount);
        settlementToken.safeTransfer(creator, creatorAmount);

        emit FeesRouted(
            agentId,
            address(settlementToken),
            totalAmount,
            agentInferenceAmount,
            coldStartReserveAmount,
            protocolOperationsAmount,
            creatorAmount
        );
    }
}
