// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "../core/component/Component.sol";
import "hardhat/console.sol";

contract TestComponent is Component {
    bytes32 public constant DO_SOMETHING_ROLE = keccak256("DO_SOMETHING_ROLE");
    function initialize(IDAO _dao) external initializer {
        __Component_init(_dao);
    }

    function addPermissioned(uint256 _param1, uint256 _param2) external auth(DO_SOMETHING_ROLE) returns(uint256) {
        return _param1 + _param2;
    }
 
    function subPermissioned(uint256 _param1, uint256 _param2) external auth(DO_SOMETHING_ROLE) returns(uint256) {
        return _param1 - _param2;
    }

    function msgSender() external view returns (address) {
        return _msgSender();
    }
}
