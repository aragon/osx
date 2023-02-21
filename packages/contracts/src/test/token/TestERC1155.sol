// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract TestERC1155 is ERC1155 {
    constructor(string memory URI_) ERC1155(URI_) {}

    function mint(address account, uint256 tokenId, uint256 amount) public {
        _mint(account, tokenId, amount, bytes(""));
    }

    function burn(address account, uint256 tokenId, uint256 amount) public {
        _burn(account, tokenId, amount);
    }
}
