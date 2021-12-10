/*
 * SPDX-License-Identifier:    MIT
 */


pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./TimeHelpers.sol";
import "./IDAO.sol";

abstract contract Component is TimeHelpers {
    IDAO internal dao;
    
    function initialize(IDAO _dao) public virtual  {
        dao = _dao;
    }

    modifier authP(bytes32 role)  {
        require(dao.hasPermission(address(this), msg.sender, role, msg.data), "auth: check");
        _;
    }
}
