// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.5.0
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessNFT} from "./AccessNFT.sol";
import {CommunityGovernor} from "./CommunityGovernor.sol";
import {CommunityRegistry} from "./CommunityRegistry.sol";
import {AccessNFTDeployer} from "./deployers/AccessNFTDeployer.sol";
import {GovernorDeployer} from "./deployers/GovernorDeployer.sol";
import {TimelockDeployer} from "./deployers/TimelockDeployer.sol";

/// @title CommunityFactory
/// @notice One-click deployment for AccessNFT + Governor (+ optional Timelock)
contract CommunityFactory is Ownable {
    struct DeploymentConfig {
        string name;
        string symbol;
        string baseURI;
        address creator;
        uint256 maxSupply; // 0 = unlimited
        // Governance params
        uint48 votingDelay; // blocks
        uint32 votingPeriod; // blocks
        uint256 proposalThreshold; // votes
        uint256 quorumNumerator; // percent out of 100
        bool deployTimelock; // optional
        string metadataURI; // optional
        // Chainlink integration
        address priceFeedAddress; // Chainlink ETH/USD aggregator address
    }

    CommunityRegistry public registry;
    AccessNFTDeployer public nftDeployer;
    GovernorDeployer public govDeployer;
    TimelockDeployer public tlDeployer;
    uint256 public nextCommunityId = 1;

    event CommunityCreated(
        address indexed creator,
        uint256 indexed communityId,
        address nft,
        address governor,
        address timelock
    );

    constructor(address initialOwner, CommunityRegistry registry_) Ownable(initialOwner) {
        registry = registry_;
        // deploy small helper contracts to keep this factory runtime code small
        nftDeployer = new AccessNFTDeployer();
        govDeployer = new GovernorDeployer();
        tlDeployer = new TimelockDeployer();
    }

    function setRegistry(CommunityRegistry newRegistry) external onlyOwner {
        registry = newRegistry;
    }

    function createRegistryIfNone() external onlyOwner returns (CommunityRegistry) {
        if (address(registry) == address(0)) {
            registry = new CommunityRegistry(owner(), address(this));
        }
        return registry;
    }

    function createCommunity(DeploymentConfig calldata cfg)
        external
        returns (uint256 communityId, address nft, address governor, address timelock)
    {
        require(address(registry) != address(0), "Factory: registry not set");
        require(cfg.creator != address(0), "Factory: invalid creator");
        require(bytes(cfg.name).length > 0 && bytes(cfg.symbol).length > 0, "Factory: name/symbol required");
        require(cfg.quorumNumerator > 0 && cfg.quorumNumerator <= 100, "Factory: invalid quorum");
        require(cfg.priceFeedAddress != address(0), "Factory: price feed address required");

        // Deploy NFT (Ownable set to creator)
        // Extract values to avoid stack too deep
        string memory name_ = cfg.name;
        string memory symbol_ = cfg.symbol;
        string memory baseURI_ = cfg.baseURI;
        uint256 maxSupply_ = cfg.maxSupply;
        address creator_ = cfg.creator;
        address priceFeed_ = cfg.priceFeedAddress;
        
        AccessNFT nftContract = nftDeployer.deploy(
            name_,
            symbol_,
            baseURI_,
            maxSupply_,
            creator_,
            priceFeed_
        );

        // Deploy Governor; 1 NFT = 1 vote via ERC721Votes snapshot
        // Extract values to avoid stack too deep
        uint48 votingDelay_ = cfg.votingDelay;
        uint32 votingPeriod_ = cfg.votingPeriod;
        uint256 proposalThreshold_ = cfg.proposalThreshold;
        uint256 quorumNumerator_ = cfg.quorumNumerator;
        
        CommunityGovernor governorContract = govDeployer.deploy(
            nftContract,
            votingDelay_,
            votingPeriod_,
            proposalThreshold_,
            quorumNumerator_
        );

        address timelockAddr = address(0);
        if (cfg.deployTimelock) {
            // Optional timelock wiring (kept dormant unless needed)
            // NOTE: Not wired to the Governor in this minimal version; placeholder for future execution flows
            timelockAddr = address(tlDeployer.deploy(0, address(governorContract), owner()));
        }

        communityId = nextCommunityId++;
        nft = address(nftContract);
        governor = address(governorContract);
        timelock = timelockAddr;

        // Registry write
        registry.registerCommunity(
            communityId,
            cfg.creator,
            nft,
            governor,
            timelock,
            cfg.metadataURI
        );

        emit CommunityCreated(cfg.creator, communityId, nft, governor, timelock);
    }
}
