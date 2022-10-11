// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/Context.sol";

import {_auth} from "../../utils/auth.sol";
import {AppStorage} from "../../utils/AppStorage.sol";

import {IDAO} from "../IDAO.sol";

/// @title PluginCloneable
/// @author Aragon Association - 2022
/// @notice An abstract, non-upgradeable contract to inherit from when creating a plugin being deployed via the minimal clones pattern (see [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167)).
abstract contract PluginCloneable is Initializable, ERC165, Context, AppStorage {
    bytes4 public constant PLUGIN_CLONABLE_INTERFACE_ID = type(PluginCloneable).interfaceId;

    error ClonesInitAlreadyInitialized();

    /// @notice used by the aragon to call by default for PluginCloneable interfaces.
    /// @param _dao the dao address to set in a slot.
    function __PluginCloneable_init(address _dao) external {
        if (isInitialized()) {
            revert ClonesInitAlreadyInitialized();
        }
        initialized();
        setDAO(_dao);
    }

    /// @dev Auth modifier used in all components of a DAO to check the permissions.
    /// @param _permissionId The hash of the permission identifier
    modifier auth(bytes32 _permissionId) {
        IDAO dao = getDao();
        _auth(dao, address(this), _msgSender(), _permissionId, _msgData());
        _;
    }

    /// @notice Checks if this or the parent contract supports an interface by its ID.
    /// @param _interfaceId The ID of the interace.
    /// @return bool Returns true if the interface is supported.
    function supportsInterface(bytes4 _interfaceId) public view virtual override returns (bool) {
        return
            _interfaceId == PLUGIN_CLONABLE_INTERFACE_ID || super.supportsInterface(_interfaceId);
    }
}
