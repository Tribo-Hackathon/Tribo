// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.5.0
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title CommunityRegistry
/// @notice Lightweight index of communities for discovery and integrations
contract CommunityRegistry is Ownable {
    struct Community {
        uint256 communityId;
        address creator;
        address nft;
        address governor;
        address timelock; // optional; address(0) if not used
        string metadataURI; // optional
        uint64 createdAt;
    }

    // communityId => Community
    mapping(uint256 => Community) private _communities;
    // list of ids for enumeration
    uint256[] private _ids;

    // Only factory can write
    address public factory;

    event CommunityRegistered(
        uint256 indexed communityId,
        address indexed creator,
        address indexed nft,
        address governor,
        address timelock,
        string metadataURI
    );

    event MetadataUpdated(uint256 indexed communityId, string metadataURI);

    error NotFactory();
    error CommunityExists(uint256 id);
    error CommunityNotFound(uint256 id);

    constructor(address initialOwner, address factory_) Ownable(initialOwner) {
        factory = factory_;
    }

    modifier onlyFactory() {
        if (msg.sender != factory) revert NotFactory();
        _;
    }

    function setFactory(address newFactory) external onlyOwner {
        factory = newFactory;
    }

    function registerCommunity(
        uint256 communityId,
        address creator,
        address nft,
        address governor,
        address timelock,
        string calldata metadataURI
    ) external onlyFactory {
        if (_communities[communityId].communityId != 0) revert CommunityExists(communityId);

        Community memory c = Community({
            communityId: communityId,
            creator: creator,
            nft: nft,
            governor: governor,
            timelock: timelock,
            metadataURI: metadataURI,
            createdAt: uint64(block.timestamp)
        });
        _communities[communityId] = c;
        _ids.push(communityId);

        emit CommunityRegistered(communityId, creator, nft, governor, timelock, metadataURI);
    }

    function updateMetadata(uint256 communityId, string calldata metadataURI) external onlyFactory {
        if (_communities[communityId].communityId == 0) revert CommunityNotFound(communityId);
        _communities[communityId].metadataURI = metadataURI;
        emit MetadataUpdated(communityId, metadataURI);
    }

    // Views

    function getCommunity(uint256 communityId) external view returns (Community memory) {
        if (_communities[communityId].communityId == 0) revert CommunityNotFound(communityId);
        return _communities[communityId];
    }

    function getAllCommunities() external view returns (Community[] memory communities) {
        uint256 len = _ids.length;
        communities = new Community[](len);
        for (uint256 i = 0; i < len; i++) {
            communities[i] = _communities[_ids[i]];
        }
    }

    function totalCommunities() external view returns (uint256) {
        return _ids.length;
    }
}

