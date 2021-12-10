/*
 * SPDX-License-Identifier:    MIT
 */


pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./Component.sol";

abstract contract UpgradableComponent is Component, UUPSUpgradeable, Initializable {

    bytes32 public constant UPGRADE_ROLE = keccak256("UPGRADE_ROLE");
    
    function _authorizeUpgrade(address /*_newImplementation*/) internal virtual override authP(UPGRADE_ROLE) {
    
    }

}
