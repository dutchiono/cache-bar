// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./AgentRegistry.sol";
import "./AgentToken.sol";

/// @title AgentLaunchFactory
/// @notice Deploys child agent tokens and emits durable work requests for the market and runtime layers.
/// @dev Uniswap V4 pool creation is intentionally delegated to a later audited market adapter.
contract AgentLaunchFactory is Ownable {
    using Clones for address;

    uint16 public constant BPS_DENOMINATOR = 10_000;

    struct FeePolicy {
        uint16 agentInferenceBps;
        uint16 coldStartReserveBps;
        uint16 protocolOperationsBps;
        uint16 creatorBps;
    }

    error InvalidAddress();
    error InvalidFeePolicy();
    error InvalidTokenConfiguration();
    error EmptyMetadataURI();

    address public immutable platformToken;
    address public immutable agentTokenImplementation;
    AgentRegistry public immutable registry;
    uint256 public nextAgentId = 1;
    FeePolicy public feePolicy;

    event AgentLaunchRequested(
        uint256 indexed agentId,
        address indexed creator,
        address indexed agentToken,
        address inferenceWallet,
        address platformToken,
        uint256 tokenSupply,
        string metadataURI
    );
    event MarketProvisioningRequested(
        uint256 indexed agentId,
        address indexed agentToken,
        address indexed platformToken
    );
    event RuntimeProvisioningRequested(
        uint256 indexed agentId,
        address indexed inferenceWallet,
        string metadataURI
    );
    event FeePolicyUpdated(
        uint16 agentInferenceBps,
        uint16 coldStartReserveBps,
        uint16 protocolOperationsBps,
        uint16 creatorBps
    );

    constructor(address owner_, address platformToken_, address agentTokenImplementation_) Ownable(owner_) {
        if (platformToken_ == address(0) || agentTokenImplementation_ == address(0)) {
            revert InvalidAddress();
        }

        platformToken = platformToken_;
        agentTokenImplementation = agentTokenImplementation_;
        registry = new AgentRegistry(address(this));
        _setFeePolicy(FeePolicy({
            agentInferenceBps: 6_000,
            coldStartReserveBps: 2_000,
            protocolOperationsBps: 1_000,
            creatorBps: 1_000
        }));
    }

    function launchAgent(
        string calldata name,
        string calldata symbol,
        uint256 tokenSupply,
        address tokenRecipient,
        address inferenceWallet,
        string calldata metadataURI
    ) external returns (uint256 agentId, address agentToken) {
        if (tokenRecipient == address(0) || inferenceWallet == address(0)) revert InvalidAddress();
        if (bytes(name).length == 0 || bytes(symbol).length == 0 || tokenSupply == 0) {
            revert InvalidTokenConfiguration();
        }
        if (bytes(metadataURI).length == 0) revert EmptyMetadataURI();

        agentId = nextAgentId++;
        agentToken = agentTokenImplementation.clone();
        AgentToken(agentToken).initialize(name, symbol, tokenSupply, tokenRecipient, msg.sender);
        registry.registerAgent(agentId, msg.sender, agentToken, inferenceWallet, metadataURI);

        emit AgentLaunchRequested(
            agentId,
            msg.sender,
            agentToken,
            inferenceWallet,
            platformToken,
            tokenSupply,
            metadataURI
        );
        emit MarketProvisioningRequested(agentId, agentToken, platformToken);
        emit RuntimeProvisioningRequested(agentId, inferenceWallet, metadataURI);
    }

    function attachMarket(uint256 agentId, address market) external onlyOwner {
        registry.attachMarket(agentId, market);
    }

    function setRuntimeStatus(uint256 agentId, AgentRegistry.RuntimeStatus status) external onlyOwner {
        registry.setRuntimeStatus(agentId, status);
    }

    function setFeePolicy(FeePolicy calldata nextPolicy) external onlyOwner {
        _setFeePolicy(nextPolicy);
    }

    function _setFeePolicy(FeePolicy memory nextPolicy) internal {
        uint256 total =
            uint256(nextPolicy.agentInferenceBps) +
            uint256(nextPolicy.coldStartReserveBps) +
            uint256(nextPolicy.protocolOperationsBps) +
            uint256(nextPolicy.creatorBps);
        if (total != BPS_DENOMINATOR) revert InvalidFeePolicy();

        feePolicy = nextPolicy;
        emit FeePolicyUpdated(
            nextPolicy.agentInferenceBps,
            nextPolicy.coldStartReserveBps,
            nextPolicy.protocolOperationsBps,
            nextPolicy.creatorBps
        );
    }
}
