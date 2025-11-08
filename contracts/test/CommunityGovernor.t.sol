// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {CommunityGovernor} from "../src/CommunityGovernor.sol";
import {AccessNFT} from "../src/AccessNFT.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {MockChainlinkAggregator} from "./mocks/MockChainlinkAggregator.sol";

contract ERC721ReceiverMock is IERC721Receiver {
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}

contract Noop {
    event Ping();
    function doNothing() external { emit Ping(); }
}

contract CommunityGovernorTest is Test {
    AccessNFT internal nft;
    CommunityGovernor internal gov;
    MockChainlinkAggregator internal priceFeed;

    address internal owner = address(0xA11CE);
    address internal voter;
    
    // Mock ETH/USD price: $3000 (3000 * 1e8)
    int256 internal constant MOCK_ETH_PRICE = 3000 * 1e8;

    function setUp() public {
        // Deploy mock price feed
        priceFeed = new MockChainlinkAggregator(MOCK_ETH_PRICE);
        
        vm.prank(owner);
        nft = new AccessNFT("TBD Access", "TBD", "ipfs://base/", 0, owner, address(priceFeed));

        // votingDelay=1 block, votingPeriod=5 blocks, proposalThreshold=0, quorum=5%
        gov = new CommunityGovernor(nft, 1, 5, 0, 5);

        // prepare voter as a receiver contract with ETH for mint
        voter = address(new ERC721ReceiverMock());
        vm.deal(voter, 1 ether);
        uint256 price = nft.getMintPrice();
        vm.prank(voter);
        nft.mint{value: price}();

        // delegate to self to activate voting power
        vm.prank(voter);
        nft.delegate(voter);
    }

    function testProposalLifecycleNoopExecute() public {
        Noop noop = new Noop();
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        targets[0] = address(noop);
        values[0] = 0;
        calldatas[0] = abi.encodeWithSignature("doNothing()");
        string memory description = "Demo proposal";

        vm.prank(voter);
        uint256 proposalId = gov.propose(targets, values, calldatas, description);

        // Initially pending until votingDelay passes
        assertEq(uint256(gov.state(proposalId)), uint256(IGovernor.ProposalState.Pending));

        // Advance 1 block into voting period
        vm.roll(block.number + 2);
        assertEq(uint256(gov.state(proposalId)), uint256(IGovernor.ProposalState.Active));

        // Cast vote: support = 1 (For)
        vm.prank(voter);
        gov.castVote(proposalId, 1);

        // Advance past voting period
        vm.roll(block.number + gov.votingPeriod());
        assertEq(uint256(gov.state(proposalId)), uint256(IGovernor.ProposalState.Succeeded));

        // Execute no-op proposal
        bytes32 descHash = keccak256(bytes(description));
        gov.execute(targets, values, calldatas, descHash);
        assertEq(uint256(gov.state(proposalId)), uint256(IGovernor.ProposalState.Executed));
    }
}
