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
    
    /// @notice Mint price: 0.0001 ETH (10^10 wei)
    uint256 public constant MINT_PRICE = 0.0001 ether;

    /// @notice Emitted when a token is minted
    event Minted(address indexed to, uint256 indexed tokenId);

    /// @notice Error thrown when mint payment is incorrect
    error InvalidMintValue(uint256 sent);
    
    /// @notice Error thrown when max supply is reached
    error MaxSupplyReached();

    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI,
        uint256 _maxSupply,
        address initialOwner
    )
        ERC721(name, symbol)
        Ownable(initialOwner)
        EIP712(name, "1")
    {
        maxSupply = _maxSupply;
        _baseTokenURI = baseURI;
    }

    /// @notice Public mint function - anyone can mint by paying MINT_PRICE
    /// @return tokenId The ID of the newly minted token
    function mint() public payable whenNotPaused nonReentrant returns (uint256) {
        if (msg.value != MINT_PRICE) {
            revert InvalidMintValue(msg.value);
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
