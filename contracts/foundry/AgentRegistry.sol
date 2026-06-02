// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title AgentRegistry
/// @notice Canonical onchain identity record for every tokenized agent launch.
contract AgentRegistry is Ownable {
    enum RuntimeStatus {
        None,
        Provisioning,
        Online,
        Degraded,
        Suspended
    }

    struct AgentRecord {
        uint256 agentId;
        address creator;
        address token;
        address inferenceWallet;
        address market;
        RuntimeStatus runtimeStatus;
        string metadataURI;
    }

    error AgentAlreadyRegistered();
    error AgentNotRegistered();
    error InvalidAddress();

    mapping(uint256 agentId => AgentRecord) private agents;
    mapping(address token => uint256 agentId) public agentIdByToken;

    event AgentRegistered(
        uint256 indexed agentId,
        address indexed creator,
        address indexed token,
        address inferenceWallet,
        string metadataURI
    );
    event MarketAttached(uint256 indexed agentId, address indexed market);
    event RuntimeStatusUpdated(uint256 indexed agentId, RuntimeStatus status);

    constructor(address owner_) Ownable(owner_) {}

    function registerAgent(
        uint256 agentId,
        address creator,
        address token,
        address inferenceWallet,
        string calldata metadataURI
    ) external onlyOwner {
        if (creator == address(0) || token == address(0) || inferenceWallet == address(0)) {
            revert InvalidAddress();
        }
        if (agents[agentId].token != address(0)) revert AgentAlreadyRegistered();

        agents[agentId] = AgentRecord({
            agentId: agentId,
            creator: creator,
            token: token,
            inferenceWallet: inferenceWallet,
            market: address(0),
            runtimeStatus: RuntimeStatus.Provisioning,
            metadataURI: metadataURI
        });
        agentIdByToken[token] = agentId;

        emit AgentRegistered(agentId, creator, token, inferenceWallet, metadataURI);
    }

    function attachMarket(uint256 agentId, address market) external onlyOwner {
        if (agents[agentId].token == address(0)) revert AgentNotRegistered();
        if (market == address(0)) revert InvalidAddress();

        agents[agentId].market = market;
        emit MarketAttached(agentId, market);
    }

    function setRuntimeStatus(uint256 agentId, RuntimeStatus status) external onlyOwner {
        if (agents[agentId].token == address(0)) revert AgentNotRegistered();

        agents[agentId].runtimeStatus = status;
        emit RuntimeStatusUpdated(agentId, status);
    }

    function getAgent(uint256 agentId) external view returns (AgentRecord memory) {
        if (agents[agentId].token == address(0)) revert AgentNotRegistered();
        return agents[agentId];
    }
}
