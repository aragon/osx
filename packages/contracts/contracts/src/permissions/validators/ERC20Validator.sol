/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity ^0.8.0;

import "../../../lib/permissions/PermissionValidator.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ERC20Validator is PermissionValidator {

    function isValid(address caller, bytes memory data) external view override returns(bool) {
        (address token, uint256 amount) = abi.decode(data, (address, uint256));

        return IERC20(token).balanceOf(caller) >= amount;
    }
    
}
