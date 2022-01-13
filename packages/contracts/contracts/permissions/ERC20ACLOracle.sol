/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../core/component/Component.sol";
import "../core/acl/IACLOracle.sol";

contract ERC20ACLOracle is Component, IACLOracle {
    IERC20 public token;

    function willPerform(
        address /* _where */, 
        address _who, 
        bytes32 /* _role */, 
        bytes calldata /* _data */
    ) external view override returns(bool allowed) {
        return token.balanceOf(_who) > 0;
    }
}
