// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TestERC721 is ERC721 {
    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}

    function mint(address account, uint256 tokenId) public {
        _mint(account, tokenId);
    }

    function burn(address /* account */, uint256 tokenId) public {
        _burn(tokenId);
    }
}
