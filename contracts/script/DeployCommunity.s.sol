// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console2 as console} from "forge-std/Script.sol";
import {CommunityFactory} from "../src/CommunityFactory.sol";
import {CommunityRegistry} from "../src/CommunityRegistry.sol";

/// @notice Foundry deployment script for Base / Base Sepolia
/// - Deploys CommunityFactory (and Registry if needed)
/// - Creates one Community using DeploymentConfig
///
/// Usage examples:
/// forge script script/DeployCommunity.s.sol \
///   --rpc-url $BASE_SEPOLIA_RPC \
///   --broadcast --verify -vvvv \
///   --private-key $PRIVATE_KEY
///
/// Optional env overrides:
/// NAME, SYMBOL, BASE_URI, CREATOR, MAX_SUPPLY, VOTING_DELAY, VOTING_PERIOD,
/// PROPOSAL_THRESHOLD, QUORUM_NUMERATOR, DEPLOY_TIMELOCK (true/false), METADATA_URI
contract DeployCommunity is Script {
    function _envOr(string memory key, string memory fallback_) internal view returns (string memory) {
        return vm.envOr(key, fallback_);
    }

    function _envOrAddress(string memory key, address fallback_) internal view returns (address) {
        return vm.envOr(key, fallback_);
    }

    function _envOrUint(string memory key, uint256 fallback_) internal view returns (uint256) {
        return vm.envOr(key, fallback_);
    }

    function _envOrBool(string memory key, bool fallback_) internal view returns (bool) {
        return vm.envOr(key, fallback_);
    }

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        // Defaults aligned with README and flow-mvp-simple.md
        string memory name = _envOr("NAME", "TBD Access");
        string memory symbol = _envOr("SYMBOL", "TBD");
        string memory baseURI = _envOr("BASE_URI", "ipfs://base/");
        address creator = _envOrAddress("CREATOR", deployer);
        uint256 maxSupply = _envOrUint("MAX_SUPPLY", 0); // 0 = unlimited
        uint48 votingDelay = uint48(_envOrUint("VOTING_DELAY", 1));
        uint32 votingPeriod = uint32(_envOrUint("VOTING_PERIOD", 7200)); // ~24h on 12s blocks
        uint256 proposalThreshold = _envOrUint("PROPOSAL_THRESHOLD", 0);
        uint256 quorumNumerator = _envOrUint("QUORUM_NUMERATOR", 5);
        bool deployTimelock = _envOrBool("DEPLOY_TIMELOCK", false);
        string memory metadataURI = _envOr("METADATA_URI", "");
        
        // Chainlink ETH/USD aggregator addresses by network
        // Base Sepolia: 0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1
        // Base Mainnet: 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70
        // For local testing, use a mock address
        address priceFeedAddress = _envOrAddress("PRICE_FEED_ADDRESS", address(0));
        if (priceFeedAddress == address(0)) {
            // Default to Base Sepolia aggregator if not set
            if (block.chainid == 84532) {
                priceFeedAddress = 0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1;
            } else if (block.chainid == 8453) {
                priceFeedAddress = 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70;
            } else {
                revert("PRICE_FEED_ADDRESS must be set for this network");
            }
        }

        console.log("Deploying on chainId:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Creator:", creator);

        vm.startBroadcast(pk);

        CommunityFactory factory = new CommunityFactory(deployer, CommunityRegistry(address(0)));
        console.log("Factory:", address(factory));

        // Ensure registry exists (owner-only)
        CommunityRegistry registry = factory.createRegistryIfNone();
        console.log("Registry:", address(registry));

        // Build config
        CommunityFactory.DeploymentConfig memory cfg;
        cfg.name = name;
        cfg.symbol = symbol;
        cfg.baseURI = baseURI;
        cfg.creator = creator;
        cfg.maxSupply = maxSupply;
        cfg.votingDelay = votingDelay;
        cfg.votingPeriod = votingPeriod;
        cfg.proposalThreshold = proposalThreshold;
        cfg.quorumNumerator = quorumNumerator;
        cfg.deployTimelock = deployTimelock;
        cfg.metadataURI = metadataURI;
        cfg.priceFeedAddress = priceFeedAddress;

        (uint256 communityId, address nft, address governor, address timelock) = factory.createCommunity(cfg);

        vm.stopBroadcast();

        console.log("CommunityId:", communityId);
        console.log("AccessNFT:", nft);
        console.log("Governor:", governor);
        console.log("Timelock:", timelock);
        console.log("Registry total:", registry.totalCommunities());
    }
}
