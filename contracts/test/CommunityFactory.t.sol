// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {CommunityFactory} from "../src/CommunityFactory.sol";
import {CommunityRegistry} from "../src/CommunityRegistry.sol";
import {AccessNFT} from "../src/AccessNFT.sol";
import {CommunityGovernor} from "../src/CommunityGovernor.sol";
import {MockChainlinkAggregator} from "./mocks/MockChainlinkAggregator.sol";

contract CommunityFactoryTest is Test {
    address internal owner = address(0xA11CE);
    address internal creator = address(0xC0FFEE);
    MockChainlinkAggregator internal priceFeed;

    CommunityRegistry internal registry;
    CommunityFactory internal factory;
    
    // Mock ETH/USD price: $3000 (3000 * 1e8)
    int256 internal constant MOCK_ETH_PRICE = 3000 * 1e8;

    function setUp() public {
        // Deploy mock price feed
        priceFeed = new MockChainlinkAggregator(MOCK_ETH_PRICE);
        
        vm.prank(owner);
        registry = new CommunityRegistry(owner, address(0));
        vm.prank(owner);
        factory = new CommunityFactory(owner, registry);
        vm.prank(owner);
        registry.setFactory(address(factory));
    }

    function _defaultCfg(bool deployTimelock) internal view returns (CommunityFactory.DeploymentConfig memory cfg) {
        cfg.name = "TBD Access";
        cfg.symbol = "TBD";
        cfg.baseURI = "ipfs://base/";
        cfg.creator = creator;
        cfg.maxSupply = 0; // unlimited
        cfg.votingDelay = 1;
        cfg.votingPeriod = 5;
        cfg.proposalThreshold = 0;
        cfg.quorumNumerator = 5;
        cfg.deployTimelock = deployTimelock;
        cfg.metadataURI = "";
        cfg.priceFeedAddress = address(priceFeed);
    }

    function testCreateRegistryIfNone() public {
        CommunityFactory fac;
        vm.prank(owner);
        fac = new CommunityFactory(owner, CommunityRegistry(address(0)));

        assertEq(address(fac.registry()), address(0));
        vm.prank(owner);
        CommunityRegistry reg = fac.createRegistryIfNone();
        assertTrue(address(reg) != address(0));
        assertEq(address(fac.registry()), address(reg));

        // new registry should have factory set to this factory (constructor arg)
        // There is no direct getter for registry.factory(), but behavior is validated when we write via factory in createCommunity below.
    }

    function testCreateCommunitySuccess() public {
        CommunityFactory.DeploymentConfig memory cfg = _defaultCfg(false);

        vm.expectEmit(true, true, false, false, address(factory));
        emit CommunityFactory.CommunityCreated(cfg.creator, 1, address(0), address(0), address(0));

        (uint256 communityId, address nftAddr, address govAddr, address tlAddr) = factory.createCommunity(cfg);

        assertEq(communityId, 1);
        assertTrue(nftAddr != address(0));
        assertTrue(govAddr != address(0));
        assertEq(tlAddr, address(0));

        // NFT owner should be creator
        assertEq(AccessNFT(nftAddr).owner(), creator);

        // Governor params
        CommunityGovernor gov = CommunityGovernor(payable(govAddr));
        assertEq(gov.votingDelay(), cfg.votingDelay);
        assertEq(gov.votingPeriod(), cfg.votingPeriod);
        assertEq(gov.proposalThreshold(), cfg.proposalThreshold);

        // Registry should contain the entry
        CommunityRegistry.Community memory c = registry.getCommunity(communityId);
        assertEq(c.communityId, communityId);
        assertEq(c.nft, nftAddr);
        assertEq(c.governor, govAddr);
        assertEq(c.timelock, address(0));
    }

    function testCreateCommunityWithTimelock() public {
        CommunityFactory.DeploymentConfig memory cfg = _defaultCfg(true);
        (, , , address tlAddr) = factory.createCommunity(cfg);
        assertTrue(tlAddr != address(0));
    }

    function testCreateCommunityRevertsOnInvalidInputs() public {
        // No registry set
        CommunityFactory fac;
        vm.prank(owner);
        fac = new CommunityFactory(owner, CommunityRegistry(address(0)));

        CommunityFactory.DeploymentConfig memory cfg = _defaultCfg(false);
        vm.expectRevert(bytes("Factory: registry not set"));
        fac.createCommunity(cfg);

        // Invalid quorum
        vm.prank(owner);
        fac.setRegistry(registry);
        cfg.quorumNumerator = 0;
        vm.expectRevert(bytes("Factory: invalid quorum"));
        fac.createCommunity(cfg);

        // Invalid creator
        cfg = _defaultCfg(false);
        cfg.creator = address(0);
        vm.expectRevert(bytes("Factory: invalid creator"));
        fac.createCommunity(cfg);

        // Empty name
        cfg = _defaultCfg(false);
        cfg.name = "";
        vm.expectRevert(bytes("Factory: name/symbol required"));
        fac.createCommunity(cfg);
        
        // Invalid price feed address
        cfg = _defaultCfg(false);
        cfg.priceFeedAddress = address(0);
        vm.expectRevert(bytes("Factory: price feed address required"));
        fac.createCommunity(cfg);
    }
}
