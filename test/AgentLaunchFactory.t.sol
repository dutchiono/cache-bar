// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../contracts/foundry/AgentLaunchFactory.sol";
import "../contracts/foundry/AgentRegistry.sol";
import "../contracts/foundry/AgentToken.sol";
import "../contracts/foundry/AgentFeeProcessor.sol";
import "../contracts/foundry/interfaces/IAgentMarketAdapter.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockSettlementToken is ERC20 {
    constructor() ERC20("Platform", "PLATFORM") {}

    function mint(address recipient, uint256 amount) external {
        _mint(recipient, amount);
    }
}

contract MockMarket {
    uint256 public immutable agentId;
    address public immutable agentToken;
    address public immutable platformToken;
    address public immutable inferenceWallet;
    address public immutable feeProcessor;

    constructor(
        uint256 agentId_,
        address agentToken_,
        address platformToken_,
        address inferenceWallet_,
        address feeProcessor_
    ) {
        agentId = agentId_;
        agentToken = agentToken_;
        platformToken = platformToken_;
        inferenceWallet = inferenceWallet_;
        feeProcessor = feeProcessor_;
    }
}

contract MockMarketAdapter is IAgentMarketAdapter {
    bool public returnZeroMarket;

    function setReturnZeroMarket(bool value) external {
        returnZeroMarket = value;
    }

    function createMarket(
        uint256 agentId,
        address agentToken,
        address platformToken,
        address inferenceWallet,
        address feeProcessor
    ) external returns (address market) {
        if (returnZeroMarket) return address(0);
        return address(new MockMarket(agentId, agentToken, platformToken, inferenceWallet, feeProcessor));
    }
}

contract AgentLaunchFactoryTest {
    address private constant INFERENCE_WALLET = address(0x2000);
    address private constant RECIPIENT = address(0x3000);
    address private constant COLD_START_RESERVE = address(0x4000);
    address private constant PROTOCOL_OPERATIONS = address(0x5000);
    string private constant METADATA_URI = "ipfs://agent-afterimage";

    AgentToken private implementation;
    MockSettlementToken private platformToken;
    AgentLaunchFactory private factory;

    function setUp() public {
        implementation = new AgentToken();
        platformToken = new MockSettlementToken();
        factory = new AgentLaunchFactory(
            address(this),
            address(platformToken),
            address(implementation),
            COLD_START_RESERVE,
            PROTOCOL_OPERATIONS
        );
    }

    function testDefaultFeePolicyIsComplete() public view {
        (
            uint16 agentInferenceBps,
            uint16 coldStartReserveBps,
            uint16 protocolOperationsBps,
            uint16 creatorBps
        ) = factory.feePolicy();

        assertEq(agentInferenceBps, 6_000, "agent inference bps");
        assertEq(coldStartReserveBps, 2_000, "cold-start reserve bps");
        assertEq(protocolOperationsBps, 1_000, "protocol operations bps");
        assertEq(creatorBps, 1_000, "creator bps");
    }

    function testLaunchRegistersTokenAndQueuesMarketWhenAdapterIsMissing() public {
        (uint256 agentId, address tokenAddress, address feeProcessor) = factory.launchAgent(
            "Afterimage",
            "AFTR",
            1_000 ether,
            RECIPIENT,
            INFERENCE_WALLET,
            METADATA_URI
        );

        assertEq(agentId, 1, "first agent id");
        assertEq(factory.nextAgentId(), 2, "next agent id");

        AgentRegistry.AgentRecord memory record = factory.registry().getAgent(agentId);
        assertEq(record.creator, address(this), "creator");
        assertEq(record.token, tokenAddress, "registered token");
        assertEq(record.inferenceWallet, INFERENCE_WALLET, "inference wallet");
        assertEq(record.feeProcessor, feeProcessor, "fee processor");
        assertEq(record.market, address(0), "market awaits adapter");
        assertEq(
            uint256(record.runtimeStatus),
            uint256(AgentRegistry.RuntimeStatus.Provisioning),
            "runtime provisioning"
        );
        assertEq(factory.registry().agentIdByToken(tokenAddress), agentId, "reverse token lookup");

        AgentToken token = AgentToken(tokenAddress);
        assertEq(token.name(), "Afterimage", "name");
        assertEq(token.symbol(), "AFTR", "symbol");
        assertEq(token.totalSupply(), 1_000 ether, "supply");
        assertEq(token.balanceOf(RECIPIENT), 1_000 ether, "recipient balance");
        assertEq(token.creator(), address(this), "token creator");
    }

    function testConfiguredAdapterCreatesAndAttachesMarketAtomically() public {
        MockMarketAdapter adapter = new MockMarketAdapter();
        factory.setMarketAdapter(address(adapter));

        (uint256 agentId, address tokenAddress, address feeProcessor) = factory.launchAgent(
            "Cache",
            "CACHE",
            42 ether,
            RECIPIENT,
            INFERENCE_WALLET,
            "ipfs://agent-cache"
        );

        AgentRegistry.AgentRecord memory record = factory.registry().getAgent(agentId);
        assertNotEq(record.market, address(0), "market attached");

        MockMarket market = MockMarket(record.market);
        assertEq(market.agentId(), agentId, "market agent id");
        assertEq(market.agentToken(), tokenAddress, "market token");
        assertEq(market.platformToken(), address(platformToken), "market platform token");
        assertEq(market.inferenceWallet(), INFERENCE_WALLET, "market inference wallet");
        assertEq(market.feeProcessor(), feeProcessor, "market fee processor");
    }

    function testRoutesCollectedPlatformFeesWithLaunchPolicySnapshot() public {
        (uint256 agentId,, address feeProcessorAddress) = factory.launchAgent(
            "Afterimage",
            "AFTR",
            1_000 ether,
            RECIPIENT,
            INFERENCE_WALLET,
            METADATA_URI
        );

        AgentFeeProcessor feeProcessor = AgentFeeProcessor(feeProcessorAddress);
        platformToken.mint(feeProcessorAddress, 101);
        feeProcessor.routeFees();

        assertEq(feeProcessor.agentId(), agentId, "processor agent id");
        assertEq(platformToken.balanceOf(INFERENCE_WALLET), 61, "inference plus rounding dust");
        assertEq(platformToken.balanceOf(COLD_START_RESERVE), 20, "cold-start reserve");
        assertEq(platformToken.balanceOf(PROTOCOL_OPERATIONS), 10, "protocol operations");
        assertEq(platformToken.balanceOf(address(this)), 10, "creator revenue");
        assertEq(platformToken.balanceOf(feeProcessorAddress), 0, "processor fully drained");
    }

    function testRejectsRoutingWhenNoFeesAreAvailable() public {
        (,, address feeProcessorAddress) = factory.launchAgent(
            "Afterimage",
            "AFTR",
            1_000 ether,
            RECIPIENT,
            INFERENCE_WALLET,
            METADATA_URI
        );

        (bool success,) = feeProcessorAddress.call(
            abi.encodeCall(AgentFeeProcessor.routeFees, ())
        );
        require(!success, "empty fee routing");
    }

    function testRejectsMalformedLaunch() public {
        expectFailure(
            abi.encodeCall(
                factory.launchAgent,
                ("", "AFTR", 1_000 ether, RECIPIENT, INFERENCE_WALLET, METADATA_URI)
            ),
            "empty name"
        );
        expectFailure(
            abi.encodeCall(
                factory.launchAgent,
                ("Afterimage", "AFTR", 0, RECIPIENT, INFERENCE_WALLET, METADATA_URI)
            ),
            "zero supply"
        );
        expectFailure(
            abi.encodeCall(
                factory.launchAgent,
                ("Afterimage", "AFTR", 1_000 ether, RECIPIENT, INFERENCE_WALLET, "")
            ),
            "empty metadata"
        );
    }

    function testRejectsIncompleteFeePolicy() public {
        expectFailure(
            abi.encodeCall(
                factory.setFeePolicy,
                (AgentLaunchFactory.FeePolicy({
                    agentInferenceBps: 6_000,
                    coldStartReserveBps: 2_000,
                    protocolOperationsBps: 1_000,
                    creatorBps: 999
                }))
            ),
            "fee policy must total denominator"
        );
    }

    function testRejectsZeroAddressFromConfiguredAdapter() public {
        MockMarketAdapter adapter = new MockMarketAdapter();
        adapter.setReturnZeroMarket(true);
        factory.setMarketAdapter(address(adapter));

        expectFailure(
            abi.encodeCall(
                factory.launchAgent,
                ("Afterimage", "AFTR", 1_000 ether, RECIPIENT, INFERENCE_WALLET, METADATA_URI)
            ),
            "zero market"
        );
    }

    function testImplementationCannotBeInitializedDirectly() public {
        expectFailure(
            abi.encodeCall(
                implementation.initialize,
                ("Broken", "NOPE", 1 ether, RECIPIENT, address(this))
            ),
            "implementation initialization"
        );
    }

    function expectFailure(bytes memory callData, string memory message) private {
        (bool success,) = address(factory).call(callData);
        require(!success, message);
    }

    function assertEq(uint256 actual, uint256 expected, string memory message) private pure {
        require(actual == expected, message);
    }

    function assertEq(address actual, address expected, string memory message) private pure {
        require(actual == expected, message);
    }

    function assertEq(string memory actual, string memory expected, string memory message) private pure {
        require(keccak256(bytes(actual)) == keccak256(bytes(expected)), message);
    }

    function assertNotEq(address actual, address expected, string memory message) private pure {
        require(actual != expected, message);
    }
}
