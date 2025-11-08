// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {AccessNFT} from "../AccessNFT.sol";

contract AccessNFTDeployer {
    function deploy(
        string memory name,
        string memory symbol,
        string memory baseURI,
        uint256 maxSupply,
        address creator,
        address priceFeedAddress
    ) external returns (AccessNFT nft) {
        nft = new AccessNFT(name, symbol, baseURI, maxSupply, creator, priceFeedAddress);
    }
}

