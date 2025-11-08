// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.5.0
pragma solidity ^0.8.27;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721Pausable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721Votes} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Votes.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract AccessNFT is 
    ERC721, 
    ERC721Enumerable, 
    ERC721URIStorage, 
    ERC721Pausable, 
    Ownable, 
    ERC721Burnable, 
    EIP712, 
    ERC721Votes,
    ReentrancyGuard 
{
    uint256 private _nextTokenId = 1;
    uint256 public immutable maxSupply;
    string private _baseTokenURI;
    
    /// @notice Chainlink ETH/USD price feed aggregator
    AggregatorV3Interface public immutable priceFeed;
    
    /// @notice Mint price in USD cents (e.g., 100 = $1.00)
    uint256 public mintPriceUSD;
    
    /// @notice Maximum staleness for price feed (in seconds)
    uint256 public constant MAX_PRICE_STALENESS = 3600; // 1 hour

    /// @notice Emitted when a token is minted
    event Minted(address indexed to, uint256 indexed tokenId);
    
    /// @notice Emitted when mint price in USD is updated
    event MintPriceUpdated(uint256 oldPrice, uint256 newPrice);

    /// @notice Error thrown when mint payment is incorrect
    error InvalidMintValue(uint256 sent, uint256 required);
    
    /// @notice Error thrown when max supply is reached
    error MaxSupplyReached();
    
    /// @notice Error thrown when price feed data is stale or invalid
    error InvalidPriceFeed();

    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI,
        uint256 _maxSupply,
        address initialOwner,
        address priceFeedAddress
    )
        ERC721(name, symbol)
        Ownable(initialOwner)
        EIP712(name, "1")
    {
        maxSupply = _maxSupply;
        _baseTokenURI = baseURI;
        priceFeed = AggregatorV3Interface(priceFeedAddress);
        mintPriceUSD = 100; // Default: $1.00
    }

    /// @notice Get current mint price in ETH based on Chainlink price feed
    /// @return The required ETH amount to mint
    function getMintPrice() public view returns (uint256) {
        (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();
        
        // Check for stale price
        if (updatedAt == 0 || block.timestamp - updatedAt > MAX_PRICE_STALENESS) {
            revert InvalidPriceFeed();
        }
        
        // Check for invalid price
        if (price <= 0) {
            revert InvalidPriceFeed();
        }
        
        // Price feed returns ETH/USD with 8 decimals
        // We need: (mintPriceUSD / 100) USD / (price / 1e8) USD per ETH
        // = (mintPriceUSD * 1e8 * 1e18) / (100 * price)
        // = (mintPriceUSD * 1e26) / (100 * price)
        uint256 priceInWei = uint256(price);
        uint256 usdAmount = mintPriceUSD * 1e26; // mintPriceUSD cents * 1e8 (feed decimals) * 1e18 (wei)
        uint256 ethAmount = usdAmount / (100 * priceInWei);
        
        return ethAmount;
    }

    /// @notice Public mint function - anyone can mint by paying the current mint price
    /// @return tokenId The ID of the newly minted token
    function mint() public payable whenNotPaused nonReentrant returns (uint256) {
        uint256 requiredPrice = getMintPrice();
        if (msg.value != requiredPrice) {
            revert InvalidMintValue(msg.value, requiredPrice);
        }

        uint256 currentSupply = totalSupply();
        if (maxSupply > 0 && currentSupply >= maxSupply) {
            revert MaxSupplyReached();
        }

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        emit Minted(msg.sender, tokenId);
        
        return tokenId;
    }

    /// @notice Owner can airdrop tokens to multiple recipients
    /// @param recipients Array of addresses to receive tokens
    /// @return tokenIds Array of token IDs that were minted
    function airdrop(address[] memory recipients) public onlyOwner returns (uint256[] memory) {
        uint256 length = recipients.length;
        uint256[] memory tokenIds = new uint256[](length);
        
        uint256 currentSupply = totalSupply();
        if (maxSupply > 0 && currentSupply + length > maxSupply) {
            revert MaxSupplyReached();
        }

        for (uint256 i = 0; i < length; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(recipients[i], tokenId);
            tokenIds[i] = tokenId;
            emit Minted(recipients[i], tokenId);
        }

        return tokenIds;
    }

    /// @notice Owner can set the base URI for token metadata
    /// @param newBaseURI The new base URI
    function setBaseURI(string memory newBaseURI) public onlyOwner {
        _baseTokenURI = newBaseURI;
    }
    
    /// @notice Owner can set the mint price in USD cents
    /// @param newPriceUSD The new price in cents (e.g., 100 = $1.00, 200 = $2.00)
    function setMintPriceUSD(uint256 newPriceUSD) public onlyOwner {
        require(newPriceUSD > 0, "AccessNFT: price must be > 0");
        uint256 oldPrice = mintPriceUSD;
        mintPriceUSD = newPriceUSD;
        emit MintPriceUpdated(oldPrice, newPriceUSD);
    }

    /// @notice Owner can withdraw collected funds
    /// @param recipient Address to receive the funds
    function withdraw(address payable recipient) public onlyOwner {
        if (recipient == address(0)) {
            revert("AccessNFT: invalid recipient");
        }
        uint256 balance = address(this).balance;
        (bool success, ) = recipient.call{value: balance}("");
        require(success, "AccessNFT: withdrawal failed");
    }

    /// @notice Owner can pause minting
    function pause() public onlyOwner {
        _pause();
    }

    /// @notice Owner can unpause minting
    function unpause() public onlyOwner {
        _unpause();
    }

    // The following functions are overrides required by Solidity.

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable, ERC721Pausable, ERC721Votes)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable, ERC721Votes)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
