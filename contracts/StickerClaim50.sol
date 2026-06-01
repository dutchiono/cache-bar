// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title StickerClaim50
/// @notice Minimal owner-minted ERC-721 for a 50-piece sticker proof drop.
contract StickerClaim50 is ERC721, Ownable {
    uint256 public constant MAX_SUPPLY = 50;

    error MaxSupplyReached();
    error EmptyBatch();
    error MetadataFrozen();

    uint256 public totalMinted;
    bool public metadataFrozen;
    string private baseTokenURI;

    constructor(
        string memory name_,
        string memory symbol_,
        address owner_,
        string memory initialBaseURI_
    ) ERC721(name_, symbol_) Ownable(owner_) {
        baseTokenURI = initialBaseURI_;
    }

    function mintTo(address recipient) external onlyOwner returns (uint256 tokenId) {
        tokenId = _mintOne(recipient);
    }

    function mintBatch(address[] calldata recipients) external onlyOwner {
        uint256 count = recipients.length;
        if (count == 0) revert EmptyBatch();

        for (uint256 index = 0; index < count; index++) {
            _mintOne(recipients[index]);
        }
    }

    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        if (metadataFrozen) revert MetadataFrozen();
        baseTokenURI = newBaseURI;
    }

    function freezeBaseURI() external onlyOwner {
        metadataFrozen = true;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    function _mintOne(address recipient) internal returns (uint256 tokenId) {
        if (totalMinted >= MAX_SUPPLY) revert MaxSupplyReached();

        tokenId = totalMinted + 1;
        totalMinted = tokenId;
        _safeMint(recipient, tokenId);
    }
}
