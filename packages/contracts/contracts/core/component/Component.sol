/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "../erc165/AdaptiveERC165.sol";
import "./../IDAO.sol";

abstract contract Component is UUPSUpgradeable, Initializable, AdaptiveERC165 {
    bytes32 public constant UPGRADE_ROLE = keccak256("UPGRADE_ROLE");

    IDAO internal dao; // Every component needs DAO at least for the permission management. See 'auth' modifier.
    
    modifier auth(bytes32 role)  {
        require(dao.hasPermission(address(this), msg.sender, role, msg.data), "auth: check");
        _;
    }

    function initialize(IDAO _dao) public virtual {
        dao = _dao;
        _registerStandard(type(Component).interfaceId);
    }

    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_ROLE) { }
}
