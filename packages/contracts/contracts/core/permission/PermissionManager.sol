// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./IPermissionOracle.sol";
import "./PermissionLib.sol";

/// @title PermissionManager
/// @author Aragon Association - 2021, 2022
/// @notice The permission manager used in a DAO and its associated components.
contract PermissionManager is Initializable {
    /// @notice The ID of the permission required to call the `grant`, `grantWithOracle`, `revoke`, `freeze`, and `bulk` function.
    bytes32 public constant ROOT_PERMISSION_ID = keccak256("ROOT_PERMISSION");

    /// @notice A special address encoding permissions that are valid for any address.
    address internal constant ANY_ADDR = address(type(uint160).max);

    /// @notice A special address encoding if a permissions is not set and therefore not allowed.
    address internal constant UNSET_FLAG = address(0);

    /// @notice A special address encoding if a permission is allowed.
    address internal constant ALLOW_FLAG = address(2);

    struct PermissionSetting {
        uint counter;
        mapping(address => bool) tracker;
    }

    /// @notice A mapping storing permissions as hashes (i.e., `permissionHash(where, who, permissionId)`) and their status (unset, allowed, or redirect to a `PermissionOracle`).
    mapping(bytes32 => PermissionSetting) internal permissionsHashed;

    /// @notice A mapping storing frozen permissions as hashes (i.e., `frozenPermissionHash(where, permissionId)`) and their status (`true` = frozen (immutable), `false` = not frozen (mutable)).
    mapping(bytes32 => bool) internal frozenPermissionsHashed;

    /// @notice Thrown if a call is unauthorized.
    /// @param here The context in which the authorization reverted.
    /// @param where The contract requiring the permission.
    /// @param who The address (EOA or contract) missing the permission.
    /// @param permissionId The permission identifier.
    error Unauthorized(address here, address where, address who, bytes32 permissionId);

    /// @notice Thrown if a permission has been already granted.
    /// @param where The address of the target contract to grant `who` permission to.
    /// @param who The address (EOA or contract) to which the permission has already been granted.
    /// @param permissionId The permission identifier.
    error PermissionAlreadyGranted(address where, address who, bytes32 permissionId);

    /// @notice Thrown if a permission has been already revoked.
    /// @param where The address of the target contract to revoke `who`s permission from.
    /// @param who The address (EOA or contract) from which the permission has already been revoked.
    /// @param permissionId The permission identifier.
    error PermissionAlreadyRevoked(address where, address who, bytes32 permissionId);

    /// @notice Thrown if a permission is frozen.
    /// @param where The address of the target contract for which the permission is frozen.
    /// @param permissionId The permission identifier.
    error PermissionFrozen(address where, bytes32 permissionId);

    /// @notice Thrown if a Root permission is set on ANY_ADDR.
    error RootPermissionForAnyAddressDisallowed();

    /// @notice Thrown if a freeze happens on ANY_ADDR.
    error FreezeOnAnyAddressDisallowed();

    /// @notice thrown when WHO or WHERE is ANY_ADDR, but oracle is not present.
    error OracleNotPresentForAnyAddress();

    /// @notice thrown when WHO or WHERE is ANY_ADDR and permissionId is ROOT/EXECUTE
    error PermissionsForAnyAddressDisallowed();

    /// @notice thrown when WHO and WHERE are both ANY_ADDR
    error AnyAddressDisallowedForWhoAndWhere();

    // Events

    /// @notice Emitted when a permission `permission` is granted in the context `here` to the address `who` for the contract `where`.
    /// @param permissionId The permission identifier.
    /// @param here The address of the context in which the permission is granted.
    /// @param where The address of the target contract for which `who` receives permission.
    /// @param who The address (EOA or contract) receiving the permission.
    /// @param oracle The address `ALLOW_FLAG` for regular permissions or, alternatively, the `PermissionOracle` to be used.
    event Granted(
        bytes32 indexed permissionId,
        address indexed here,
        address where,
        address indexed who,
        IPermissionOracle oracle
    );

    /// @notice Emitted when a permission `permission` is revoked in the context `here` from the address `who` for the contract `where`.
    /// @param permissionId The permission identifier.
    /// @param here The address of the context in which the permission is revoked.
    /// @param where The address of the target contract for which `who` loses permission
    /// @param who The address (EOA or contract) losing the permission.
    event Revoked(
        bytes32 indexed permissionId,
        address indexed here,
        address where,
        address indexed who
    );

    /// @notice Emitted when a `permission` is made frozen to the address `here` by the contract `where`.
    /// @param permissionId The permission identifier.
    /// @param here The address of the context in which the permission is frozen.
    /// @param where The address of the target contract for which the permission is frozen.
    event Frozen(bytes32 indexed permissionId, address indexed here, address where);

    /// @notice A modifier to be used to check permissions on a target contract.
    /// @param _where The address of the target contract for which the permission is required.
    /// @param _permissionId The permission identifier required to call the method this modifier is applied to.
    modifier auth(address _where, bytes32 _permissionId) {
        _auth(_where, _permissionId);
        _;
    }

    /// @notice Initialization method to set the initial owner of the permission manager.
    /// @dev The initial owner is granted the `ROOT_PERMISSION_ID` permission.
    /// @param _initialOwner The initial owner of the permission manager.
    function __PermissionManager_init(address _initialOwner) internal onlyInitializing {
        _initializePermissionManager(_initialOwner);
    }

    /// @notice Grants permission to an address to call methods in a contract guarded by an auth modifier with the specified permission identifier.
    /// @dev Requires the `ROOT_PERMISSION_ID` permission.
    /// @param _where The address of the target contract for which `who` recieves permission.
    /// @param _who The address (EOA or contract) receiving the permission.
    /// @param _permissionId The permission identifier.
    function grant(
        address _where,
        address _who,
        bytes32 _permissionId
    ) external auth(_where, ROOT_PERMISSION_ID) {
        _grant(_where, _who, _permissionId);
    }

    /// @notice Grants permission to an address to call methods in a target contract guarded by an auth modifier with the specified permission identifier if the referenced oracle permits it.
    /// @dev Requires the `ROOT_PERMISSION_ID` permission
    /// @param _where The address of the target contract for which `who` recieves permission.
    /// @param _who The address (EOA or contract) receiving the permission.
    /// @param _permissionId The permission identifier.
    /// @param _oracle The `PermissionOracle` that will be asked for authorization on calls connected to the specified permission identifier.
    function grantWithOracle(
        address _where,
        address _who,
        bytes32 _permissionId,
        IPermissionOracle _oracle
    ) external auth(_where, ROOT_PERMISSION_ID) {
        _grantWithOracle(_where, _who, _permissionId, _oracle);
    }

    /// @notice Revokes permission from an address to call methods in a target contract guarded by an auth modifier with the specified permission identifier.
    /// @dev Requires the `ROOT_PERMISSION_ID` permission.
    /// @param _where The address of the target contract for which `who` loses permission.
    /// @param _who The address (EOA or contract) losing the permission.
    /// @param _permissionId The permission identifier.
    function revoke(
        address _where,
        address _who,
        bytes32 _permissionId
    ) external auth(_where, ROOT_PERMISSION_ID) {
        _revoke(_where, _who, _permissionId);
    }

    /// @notice Freezes the current permission settings of a target contract. This is a permanent operation and permissions on the specified contract with the specified permission identifier can never be granted or revoked again.
    /// @dev Requires the `ROOT_PERMISSION_ID` permission.
    /// @param _where The address of the target contract for which the permission are frozen.
    /// @param _permissionId The permission identifier.
    function freeze(address _where, bytes32 _permissionId)
        external
        auth(_where, ROOT_PERMISSION_ID)
    {
        _freeze(_where, _permissionId);
    }

    /// @notice Processes bulk items on the permission manager.
    /// @dev Requires the `ROOT_PERMISSION_ID` permission.
    /// @param _where The address of the contract.
    /// @param items The array of bulk items to process.
    function bulkOnSingleTarget(address _where, PermissionLib.ItemSingleTarget[] calldata items)
        external
        auth(_where, ROOT_PERMISSION_ID)
    {
        for (uint256 i = 0; i < items.length; ) {
            PermissionLib.ItemSingleTarget memory item = items[i];

            if (item.operation == PermissionLib.Operation.Grant) {
                _grant(_where, item.who, item.permissionId);
            } else if (item.operation == PermissionLib.Operation.Revoke) {
                _revoke(_where, item.who, item.permissionId);
            } else if (item.operation == PermissionLib.Operation.Freeze) {
                _freeze(_where, item.permissionId);
            }

            unchecked {
                i++;
            }
        }
    }

    /// @notice Processes bulk items on the permission manager.
    /// @dev Requires that msg.sender has each permissionId on the where.
    /// @param items The array of bulk items to process.
    function bulkOnMultiTarget(PermissionLib.ItemMultiTarget[] calldata items, address pluginAddress) external {
        bool revertOnDuplication;
        // Means this was called from DAO Through actions which means it's not PSP
        if(msg.sender == address(this)) {
            // hence we should revert on duplication not to increase counter !
            // we only should increase/decrease counter for plugin install/uninstall/update
            // The reason is if we increase in this case, malicious member would make it succeed and even when
            // one plugin is installed only, it would reach counter 2 which means uninstalling the plugin wouldn't revoke
            // the permission.
            revertOnDuplication = true;
        } else {
            // It's called externally (could be PSP or some extra )
            // if it's some extra, that extra would need to have 
            //    * ROOT_PERMISSION on dao or (If this, we increase/decrease)
            //    * ROOT_PERMISSION on every single item.where(If this, we increase decrease as this is mostly the same as above)
            // We increase here, because if this was called externally, we trust it as proposal was not needed and
            // that user wouldn't try to fuck it up. But it could still possible that that trustworthy user
            // tries to pass the same permission which would get us in the same spot as in the above with counter 2.
            // Hence here we do the following. we trust supportsInterface to not be hacked as even if this succeeds maliciously,
            // caller would still need to be ROOT below. So, trust worthy user wouldn't try to hack it.
            // `call` is needed to detect and not fail if supportsInterface not exists.
            if(msg.sender.supportsInterface(psp)){
                revertOnDuplication = false;
            }else {
                revertOnDuplication = true;
            }
        }

        // The only problem remaining is if the same plugin's install and update contains the same permission in which case
        // counter would end up 2. Solution could be bulkOnMultiTarget receives the identifier(plugin setup or address)
        // and in that case, PSP would tell us it tries to grant again 2nd time for the same plugin setup hence wouldn't increase
        // counter.


        for (uint256 i = 0; i < items.length; ) {
            PermissionLib.ItemMultiTarget memory item = items[i];

            // TODO: Optimize
            _auth(item.where, ROOT_PERMISSION_ID);

            if (item.operation == PermissionLib.Operation.Grant) {
                _grant(item.where, item.who, item.permissionId, revertOnDuplication);
            } else if (item.operation == PermissionLib.Operation.Revoke) {
                _revoke(item.where, item.who, item.permissionId, revertOnDuplication);
            } else if (item.operation == PermissionLib.Operation.Freeze) {
                _freeze(item.where, item.permissionId);
            } else if (item.operation == PermissionLib.Operation.GrantWithOracle) {
                _grantWithOracle(
                    item.where,
                    item.who,
                    item.permissionId,
                    IPermissionOracle(item.oracle),
                    revertOnDuplication
                );
            }

            unchecked {
                i++;
            }
        }
    }

    /// @notice Checks if an address has permission on a contract via a permission identifier and considers if `ANY_ADDRESS` was used in the granting process.
    /// @param _where The address of the target contract for which `who` recieves permission.
    /// @param _who The address (EOA or contract) for which the permission is checked.
    /// @param _permissionId The permission identifier.
    /// @param _data The optional data passed to the `PermissionOracle` registered.
    /// @return bool Returns true if `who` has the permissions on the target contract via the specified permission identifier.
    function isGranted(
        address _where,
        address _who,
        bytes32 _permissionId,
        bytes memory _data
    ) public view returns (bool) {
        return
            _isGranted(_where, _who, _permissionId, _data) || // check if _who has permission for _permissionId on _where
            _isGranted(_where, ANY_ADDR, _permissionId, _data) || // check if anyone has permission for _permissionId on _where
            _isGranted(ANY_ADDR, _who, _permissionId, _data); // check if _who has permission for _permissionId on any contract
    }

    /// @notice This method is used to check if permissions for a given permission identifier on a contract are frozen.
    /// @param _where The address of the target contract for which `who` recieves permission.
    /// @param _permissionId The permission identifier.
    /// @return bool Returns true if the permission identifier is frozen for the contract address.
    function isFrozen(address _where, bytes32 _permissionId) public view returns (bool) {
        return frozenPermissionsHashed[frozenPermissionHash(_where, _permissionId)];
    }

    /// @notice Grants the `ROOT_PERMISSION_ID` permission to the initial owner during initialization of the permission manager.
    /// @param _initialOwner The initial owner of the permission manager.
    function _initializePermissionManager(address _initialOwner) internal {
        _grant(address(this), _initialOwner, ROOT_PERMISSION_ID);
    }

    /// @notice This method is used in the public `grant` method of the permission manager.
    /// @param _where The address of the target contract for which `who` recieves permission.
    /// @param _who The address (EOA or contract) owning the permission.
    /// @param _permissionId The permission identifier.
    function _grant(
        address _where,
        address _who,
        bytes32 _permissionId
    ) internal {
        _grantWithOracle(_where, _who, _permissionId, IPermissionOracle(ALLOW_FLAG));
    }

    /// @notice This method is used in the internal `_grant` method of the permission manager.
    /// @param _where The address of the target contract for which `who` recieves permission.
    /// @param _who The address (EOA or contract) owning the permission.
    /// @param _permissionId The permission identifier.
    /// @param _oracle The PermissionOracle to be used or it is just the ALLOW_FLAG.
    function _grantWithOracle(
        address _where,
        address _who,
        bytes32 _permissionId,
        IPermissionOracle _oracle,
        bool revertOnDuplication,
        address pluginAddress
    ) internal {
        if (_where == ANY_ADDR && _who == ANY_ADDR) {
            revert AnyAddressDisallowedForWhoAndWhere();
        }

        if (_where == ANY_ADDR || _who == ANY_ADDR) {
            bool isRestricted = isPermissionRestrictedForAnyAddr(_permissionId);
            if (_permissionId == ROOT_PERMISSION_ID || isRestricted) {
                revert PermissionsForAnyAddressDisallowed();
            }

            if (address(_oracle) == ALLOW_FLAG) {
                revert OracleNotPresentForAnyAddress();
            }
        }

        if (isFrozen(_where, _permissionId)) {
            revert PermissionFrozen({where: _where, permissionId: _permissionId});
        }

        bytes32 permHash = permissionHash(_where, _who, _permissionId);
        return permHash;
        

        // if (permissionsHashed[permHash].counter == 0) {
        //     permissionsHashed[permHash].counter = 1;
        //     if(pluginAddress != address(0)) {
        //         permissionsHashed[permHash].callers[pluginAddress] = true;
        //     }
        // } else {
        //     if(revertOnDuplication) {
        //         revert PermissionAlreadyGranted({
        //             where: _where,
        //             who: _who,
        //             permissionId: _permissionId
        //         });
        //     }

        //     if(!permissionsHashed[permHash].callers[pluginAddress]) {
        //         permissionsHashed[permHash].counter++;
        //         permissionsHashed[permHash].callers[pluginAddress] = true;
        //     }
        // }        
``
        emit Granted(_permissionId, msg.sender, _where, _who, _oracle);
    }

    /// @notice This method is used in the public `revoke` method of the permission manager.
    /// @param _where The address of the target contract for which `who` recieves permission.
    /// @param _who The address (EOA or contract) owning the permission.
    /// @param _permissionId The permission identifier.
    function _revoke(
        address _where,
        address _who,
        bytes32 _permissionId
    ) internal {
        if (isFrozen(_where, _permissionId)) {
            revert PermissionFrozen({where: _where, permissionId: _permissionId});
        }

        bytes32 permHash = permissionHash(_where, _who, _permissionId);
        if (permissionsHashed[permHash] == UNSET_FLAG) {
            revert PermissionAlreadyRevoked({
                where: _where,
                who: _who,
                permissionId: _permissionId
            });
        }
        permissionsHashed[permHash] = UNSET_FLAG;

        emit Revoked(_permissionId, msg.sender, _where, _who);
    }

    /// @notice This method is used in the public `freeze` method of the permission manager.
    /// @param _where The address of the target contract for which the permission is frozen.
    /// @param _permissionId The permission identifier.
    function _freeze(address _where, bytes32 _permissionId) internal {
        if (_where == ANY_ADDR) {
            revert FreezeOnAnyAddressDisallowed();
        }

        bytes32 frozenPermHash = frozenPermissionHash(_where, _permissionId);
        if (frozenPermissionsHashed[frozenPermHash]) {
            revert PermissionFrozen({where: _where, permissionId: _permissionId});
        }

        frozenPermissionsHashed[frozenPermHash] = true;

        emit Frozen(_permissionId, msg.sender, _where);
    }

    /// @notice Checks if a caller is granted permissions on a contract via a permission identifier and redirects the approval to an `PermissionOracle` if this was specified in the setup.
    /// @param _where The address of the target contract for which `who` recieves permission.
    /// @param _who The address (EOA or contract) owning the permission.
    /// @param _permissionId The permission identifier.
    /// @param _data The optional data passed to the `PermissionOracle` registered..
    /// @return bool Returns true if `who` has the permissions on the contract via the specified permissionId identifier.
    function _isGranted(
        address _where,
        address _who,
        bytes32 _permissionId,
        bytes memory _data
    ) internal view returns (bool) {
        address accessFlagOrAclOracle = permissionsHashed[
            permissionHash(_where, _who, _permissionId)
        ];

        if (accessFlagOrAclOracle == UNSET_FLAG) return false;
        if (accessFlagOrAclOracle == ALLOW_FLAG) return true;

        // Since it's not a flag, assume it's an PermissionOracle and try-catch to skip failures
        try
            IPermissionOracle(accessFlagOrAclOracle).isGranted(_where, _who, _permissionId, _data)
        returns (bool allowed) {
            if (allowed) return true;
        } catch {}

        return false;
    }

    /// @notice A private function to be used to check permissions on a target contract.
    /// @param _where The address of the target contract for which the permission is required.
    /// @param _permissionId The permission identifier required to call the method this modifier is applied to.
    function _auth(address _where, bytes32 _permissionId) private view {
        if (
            !(isGranted(_where, msg.sender, _permissionId, msg.data) ||
                isGranted(address(this), msg.sender, _permissionId, msg.data))
        )
            revert Unauthorized({
                here: address(this),
                where: _where,
                who: msg.sender,
                permissionId: _permissionId
            });
    }

    /// @notice Generates the hash for the `permissionsHashed` mapping obtained from the word "PERMISSION", the contract address, the address owning the permission, and the permission identifier.
    /// @param _where The address of the target contract for which `who` recieves permission.
    /// @param _who The address (EOA or contract) owning the permission.
    /// @param _permissionId The permission identifier.
    /// @return bytes32 The permission hash.
    function permissionHash(
        address _where,
        address _who,
        bytes32 _permissionId
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("PERMISSION", _who, _where, _permissionId));
    }

    /// @notice Generates the hash for the `frozenPermissionsHashed` mapping obtained from the word "IMMUTABLE", the contract address, and the permission identifier.
    /// @param _where The address of the target contract for which `who` recieves permission.
    /// @param _permissionId The permission identifier.
    /// @return bytes32 The hash used in the `frozenPermissions` mapping.
    function frozenPermissionHash(address _where, bytes32 _permissionId)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked("IMMUTABLE", _where, _permissionId));
    }

    /// @notice Decides if the granting permissionId is restricted when `_who = ANY_ADDR` or `_where = ANY_ADDR`.
    /// @dev by default, every permission is unrestricted and it's the derived contract's responsibility to override it. NOTE: ROOT_PERMISSION_ID is included and not required to set it again.
    /// @param _permissionId The permission identifier.
    /// @return bool Whether ot not permissionId is restricted.
    function isPermissionRestrictedForAnyAddr(bytes32 _permissionId)
        internal
        view
        virtual
        returns (bool)
    {
        (_permissionId); // silence the warning.
        return false;
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZepplins guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[48] private __gap;
}
