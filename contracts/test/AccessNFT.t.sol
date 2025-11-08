// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {AccessNFT} from "../src/AccessNFT.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {MockChainlinkAggregator} from "./mocks/MockChainlinkAggregator.sol";

contract AccessNFTTest is Test {
    AccessNFT internal accessNft;
    MockChainlinkAggregator internal priceFeed;

    address internal owner = address(0xA11CE);
    address internal minter = address(0xBEEF);

    string internal constant BASE_URI = "ipfs://base/";
    uint256 internal constant MAX_SUPPLY = 100;
    
    // Mock ETH/USD price: $3000 (3000 * 1e8)
    int256 internal constant MOCK_ETH_PRICE = 3000 * 1e8;

    function setUp() public {
        // Deploy mock price feed with $3000 ETH price
        priceFeed = new MockChainlinkAggregator(MOCK_ETH_PRICE);
        
        vm.prank(owner);
        accessNft = new AccessNFT(
            "Community Access",
            "COMM",
            BASE_URI,
            MAX_SUPPLY,
            owner,
            address(priceFeed)
        );
    }

    function testMintRequiresExactPrice() public {
        vm.deal(minter, 1 ether);
        uint256 requiredPrice = accessNft.getMintPrice();

        vm.expectRevert(abi.encodeWithSelector(AccessNFT.InvalidMintValue.selector, 0, requiredPrice));
        vm.prank(minter);
        accessNft.mint{value: 0}();
    }

    function testMintMintsTokenAndEmitsEvent() public {
        vm.deal(minter, 1 ether);
        uint256 price = accessNft.getMintPrice();

        vm.expectEmit(true, true, false, false, address(accessNft));
        emit AccessNFT.Minted(minter, 1);

        vm.prank(minter);
        uint256 tokenId = accessNft.mint{value: price}();

        assertEq(tokenId, 1);
        assertEq(accessNft.balanceOf(minter), 1);
        assertEq(accessNft.totalSupply(), 1);
        assertEq(address(accessNft).balance, price);
    }
    
    function testGetMintPriceCalculatesCorrectly() public {
        // With $1 USD price (100 cents) and $3000 ETH price, should be 1/3000 ETH
        // Calculation: (100 * 1e26) / (100 * 3000 * 1e8) = 1e28 / 3e13 = 333333333333333 wei
        uint256 price = accessNft.getMintPrice();
        // mintPriceUSD = 100, MOCK_ETH_PRICE = 3000 * 1e8
        // Formula: (mintPriceUSD * 1e26) / (100 * priceInWei)
        uint256 expectedPrice = (100 * 1e26) / (100 * uint256(MOCK_ETH_PRICE));
        assertEq(price, expectedPrice);
        // Verify it's approximately 1/3000 ETH = 333333333333333 wei
        assertEq(price, 333333333333333);
    }

    function testMintRevertsWhenMaxSupplyReached() public {
        vm.prank(owner);
        AccessNFT limited = new AccessNFT("Limited", "LIM", BASE_URI, 1, owner, address(priceFeed));

        vm.deal(minter, 2 ether);
        uint256 price = limited.getMintPrice();

        vm.prank(minter);
        limited.mint{value: price}();

        vm.deal(minter, 2 ether);
        vm.expectRevert(AccessNFT.MaxSupplyReached.selector);
        vm.prank(minter);
        limited.mint{value: price}();
    }

    function testOwnerCanAirdropToMultipleRecipients() public {
        address[] memory recipients = new address[](2);
        recipients[0] = address(0xF00D);
        recipients[1] = address(0xCAFE);

        vm.prank(owner);
        uint256[] memory tokenIds = accessNft.airdrop(recipients);

        assertEq(tokenIds.length, 2);
        assertEq(tokenIds[0], 1);
        assertEq(tokenIds[1], 2);
        assertEq(accessNft.balanceOf(recipients[0]), 1);
        assertEq(accessNft.balanceOf(recipients[1]), 1);
        assertEq(accessNft.totalSupply(), 2);
    }

    function testPauseBlocksMinting() public {
        vm.prank(owner);
        accessNft.pause();

        vm.deal(minter, 1 ether);
        uint256 price = accessNft.getMintPrice();

        vm.expectRevert(Pausable.EnforcedPause.selector);
        vm.prank(minter);
        accessNft.mint{value: price}();
    }

    function testSetBaseURIUpdatesTokenURI() public {
        vm.deal(minter, 1 ether);
        uint256 price = accessNft.getMintPrice();
        vm.prank(minter);
        uint256 tokenId = accessNft.mint{value: price}();

        string memory newBase = "ipfs://updated/";

        vm.prank(owner);
        accessNft.setBaseURI(newBase);

        string memory expected = string.concat(newBase, vm.toString(tokenId));
        assertEq(accessNft.tokenURI(tokenId), expected);
    }
    
    function testSetMintPriceUSD() public {
        uint256 initialPrice = accessNft.getMintPrice();
        assertEq(accessNft.mintPriceUSD(), 100); // Default $1.00
        
        // Change to $2.00
        vm.prank(owner);
        accessNft.setMintPriceUSD(200);
        
        assertEq(accessNft.mintPriceUSD(), 200);
        uint256 newPrice = accessNft.getMintPrice();
        // New price should be approximately double
        assertGt(newPrice, initialPrice);
    }
    
    function testMintRevertsWithStalePriceFeed() public {
        // Set price feed to be stale (more than 1 hour old)
        vm.warp(block.timestamp + 3601);
        priceFeed.setUpdatedAt(block.timestamp - 3601);
        
        vm.deal(minter, 1 ether);
        vm.expectRevert(AccessNFT.InvalidPriceFeed.selector);
        accessNft.getMintPrice();
    }
    
    function testMintRevertsWithInvalidPrice() public {
        // Set price to zero
        priceFeed.setPrice(0);
        
        vm.deal(minter, 1 ether);
        vm.expectRevert(AccessNFT.InvalidPriceFeed.selector);
        accessNft.getMintPrice();
    }

    function testWithdrawSendsFundsToOwner() public {
        vm.deal(minter, 1 ether);
        uint256 price = accessNft.getMintPrice();
        vm.prank(minter);
        accessNft.mint{value: price}();

        uint256 ownerBalanceBefore = owner.balance;

        vm.prank(owner);
        accessNft.withdraw(payable(owner));

        assertEq(owner.balance - ownerBalanceBefore, price);
        assertEq(address(accessNft).balance, 0);
    }

    function testWithdrawRevertsForZeroRecipient() public {
        vm.prank(owner);
        vm.expectRevert(bytes("AccessNFT: invalid recipient"));
        accessNft.withdraw(payable(address(0)));
    }
}

