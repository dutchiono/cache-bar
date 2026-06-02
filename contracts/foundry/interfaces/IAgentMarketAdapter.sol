// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAgentMarketAdapter
/// @notice Audited boundary between launch identity and chain-specific market creation.
interface IAgentMarketAdapter {
    function createMarket(
        uint256 agentId,
        address agentToken,
        address platformToken,
        address inferenceWallet,
        address feeProcessor
    ) external returns (address market);
}
