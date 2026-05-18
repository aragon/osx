// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

/// @notice A mock [ERC-1155](https://eips.ethereum.org/EIPS/eip-1155) token that can be minted and burned by everyone.
/// @dev DO NOT USE IN PRODUCTION!
contract ERC1155Mock is ERC1155 {
    constructor(string memory _uri) ERC1155(_uri) {}

    function mint(address account, uint256 tokenId, uint256 amount) public {
        _mint(account, tokenId, amount, bytes(""));
    }

    function burn(address account, uint256 tokenId, uint256 amount) public {
        _burn(account, tokenId, amount);
    }
}
