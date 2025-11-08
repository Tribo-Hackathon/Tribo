// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {CommunityRegistry} from "../src/CommunityRegistry.sol";

contract CommunityRegistryTest is Test {
    address internal owner = address(0xA11CE);
    address internal factory = address(0xFACC);
    address internal other = address(0xBEEF);

    CommunityRegistry internal registry;

    function setUp() public {
        vm.prank(owner);
        registry = new CommunityRegistry(owner, factory);
    }

    function testOnlyFactoryCanRegister() public {
        vm.expectRevert(CommunityRegistry.NotFactory.selector);
        vm.prank(other);
        registry.registerCommunity(1, owner, address(1), address(2), address(0), "");
    }

    function testRegisterAndReadBack() public {
        vm.expectEmit(true, true, true, true);
        emit CommunityRegistry.CommunityRegistered(1, owner, address(1), address(2), address(0), "meta");

        vm.prank(factory);
        registry.registerCommunity(1, owner, address(1), address(2), address(0), "meta");

        CommunityRegistry.Community memory c = registry.getCommunity(1);
        assertEq(c.communityId, 1);
        assertEq(c.creator, owner);
        assertEq(c.nft, address(1));
        assertEq(c.governor, address(2));
        assertEq(c.timelock, address(0));
        assertEq(c.metadataURI, "meta");
        assertTrue(c.createdAt > 0);

        assertEq(registry.totalCommunities(), 1);

        CommunityRegistry.Community[] memory all = registry.getAllCommunities();
        assertEq(all.length, 1);
        assertEq(all[0].communityId, 1);
    }

    function testDuplicateIdReverts() public {
        vm.startPrank(factory);
        registry.registerCommunity(1, owner, address(1), address(2), address(0), "");
        vm.expectRevert(abi.encodeWithSelector(CommunityRegistry.CommunityExists.selector, 1));
        registry.registerCommunity(1, owner, address(1), address(2), address(0), "");
        vm.stopPrank();
    }

    function testUpdateMetadataFactoryOnly() public {
        vm.prank(factory);
        registry.registerCommunity(1, owner, address(1), address(2), address(0), "old");

        vm.expectRevert(CommunityRegistry.NotFactory.selector);
        vm.prank(other);
        registry.updateMetadata(1, "new");

        vm.expectEmit(true, false, false, true);
        emit CommunityRegistry.MetadataUpdated(1, "new");
        vm.prank(factory);
        registry.updateMetadata(1, "new");

        CommunityRegistry.Community memory c2 = registry.getCommunity(1);
        assertEq(c2.metadataURI, "new");
    }

    function testOwnerCanSetFactory() public {
        address newFactory = address(0xFAAA);
        vm.prank(owner);
        registry.setFactory(newFactory);

        vm.expectRevert(CommunityRegistry.NotFactory.selector);
        vm.prank(factory);
        registry.registerCommunity(2, owner, address(3), address(4), address(0), "");

        vm.prank(newFactory);
        registry.registerCommunity(2, owner, address(3), address(4), address(0), "");
        assertEq(registry.totalCommunities(), 1);
    }

    function testGetCommunityNotFoundReverts() public {
        vm.expectRevert(abi.encodeWithSelector(CommunityRegistry.CommunityNotFound.selector, 42));
        registry.getCommunity(42);
    }
}
