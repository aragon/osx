pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

import "../IDAO.sol";
import "../permission/PermissionManager.sol";

import "../../utils/AppStorage.sol";

/// @title AragonUpgradablePlugin
/// @author Aragon Association - Giorgi Lagidze - 2022
/// @notice An Abtract Aragon Plugin(UUPS-UPGRADABLE) that plugin developers have to inherit from.
abstract contract AragonUpgradablePlugin is Initializable, AppStorage, ContextUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADE_PERMISSION_ID = keccak256("UPGRADE_PERMISSION");

    /// @notice Emitted only when the plugin gets updated && `update` initialization was called.
    event PluginUpdated(uint8[3] oldVersion, uint8[3] newVersion, bytes data);

    /// @dev Auth modifier used in all components of a DAO to check the permissions.
    /// @param _permissionId The hash of the permission identifier
    modifier auth(bytes32 _permissionId)  {
        IDAO dao = dao(); 
        if(!dao.hasPermission(address(this), _msgSender(), _permissionId, _msgData())) {
            revert PermissionManager.Unauthorized({
                here: address(this), 
                where: address(this), 
                who: _msgSender(), 
                permissionId: _permissionId
            });
        }
        _;
    }

    /// @dev Used to check the permissions within the upgradability pattern implementation of OZ
    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_PERMISSION_ID) { }

    /// @notice the function logic contract has to include for the custom update logic.
    /// @dev Dev has a full responsibility whether or not to override it.
    /// @param oldVersion The old version of logic contract from which contract is upgrading.
    /// @param newVersion The new version of logic contract to which contract is upgrading.
    /// @param data the init data for the update
    function _update(
        uint8[3] calldata oldVersion, 
        uint8[3] calldata newVersion, 
        bytes memory data
    ) internal virtual;
    
    /// @notice allows to call `update` through `reinitializer` modifier if it was not called with this version yet.
    /// @dev dev can override this and increment it if he/she wants update to be allowed to be called.
    /// Used also by UI to detect when it can call `update` and when not.
    /// ex: If the updateVersion(in the new base) > updateVersion(current one), update must be called.
    /// @return the update version
    function updateVersion() public virtual returns (uint8) { return 1; }

    /// @notice The `initialize` type of function that can be called per upgrade.
    /// @dev Inheritting contracts must override _update to include what logic they want to run per each update.
    /// @param oldVersion The old version of logic contract from which contract is upgrading.
    /// @param newVersion The new version of logic contract to which contract is upgrading.
    /// @param data update initialize data.. update logic should decode this per its rules...
    /// NOTE that It's recommended for security to pass `abi.encodeWithSelector(update.selector, data)` to upgradeToAndCall..
    function update(
        uint8[3] calldata oldVersion, 
        uint8[3] calldata newVersion, 
        bytes memory data
    ) external virtual reinitializer(updateVersion()) onlyProxy {
        _update(oldVersion, newVersion, data);

        emit PluginUpdated(oldVersion, newVersion, data);
    } 

    /// @notice Used by UI to detect what arguments it needs to provide to the update function.
    /// @dev Expects append-only ABI for each update. 
    /// If 1.x version needed `uint param1`, and 2.x only needed `address param2`
    /// It's required 3.x have both in the ABI as appended in the same sequence = (uint param1, address param2)
    /// @return the Human-Readable ABI for the update function.
    function updateSignatureABI() external view virtual returns(string memory) { 
        return "";
    }

    /// @notice Used by AragonUpgradablePlugin to reserve storage space in 
    /// case of state variable additions for this contract.
    /// @dev Note that after adding one or multiple state variables, 
    /// _gap size below + all state variables this contract uses should be 50.
    uint256[50] private __gap;
}
