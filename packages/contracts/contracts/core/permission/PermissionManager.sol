// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./IPermissionOracle.sol";
import "./BulkPermissionsLib.sol";

/// @title PermissionManager
/// @author Aragon Association - 2021, 2022
/// @notice The permission manager used in a DAO and its associated components.
contract PermissionManager is Initializable {
    /// @notice The ID of the permission required for the `grant`, `grantWithOracle`, `revoke`, `makeImmutable`, and `bulk` function.
    bytes32 public constant ROOT_PERMISSION_ID = keccak256("ROOT_PERMISSION_ID");

    /// @notice A special address encoding permissions that are valid for any address.
    address internal constant ANY_ADDR = address(type(uint160).max);

    /// @notice A special address encoding if a permissions is not set and therefore not allowed.
    address internal constant UNSET_FLAG = address(0);

    /// @notice A special address encoding if a permission is allowed.
    address internal constant ALLOW_FLAG = address(2);

    /// @notice A mapping storing permissions as hashes (i.e., `permissionHash(where, who, permission)`) and their status (unset, allowed, or redirect to a `PermissionOracle`).
    mapping(bytes32 => address) internal permissions;

    /// @notice A mapping storing immutable permissions as hashes (i.e., `immutablePermissionHash(where, permission)`) and their status (`true` = immutable, `false` = mutable).
    mapping(bytes32 => bool) internal immutablePermissions;

    /// @notice Thrown if a permission is missing.
    /// @param here The context in which the authorization reverted.
    /// @param where The contract requiring the permission.
    /// @param who The address (EOA or contract) missing the permission.
    /// @param permissionID The permission identifier.
    error PermissionMissing(address here, address where, address who, bytes32 permissionID);

    /// @notice Thrown if a permission has been already granted.
    /// @param where The address of the target contract to grant `who` permission to.
    /// @param who The address (EOA or contract) to which the permission has already been granted.
    /// @param permissionID The permission identifier.
    error PermissionAlreadyGranted(address where, address who, bytes32 permissionID);

    /// @notice Thrown if a permission has been already revoked.
    /// @param where The address of the target contract to revoke `who`s permission from.
    /// @param who The address (EOA or contract) from which the permission has already been revoked.
    /// @param permissionID The permission identifier.
    error PermissionAlreadyRevoked(address where, address who, bytes32 permissionID);

    /// @notice Thrown if a permission is immutable.
    /// @param where The address of the target contract for which the permission is immutable.
    /// @param permissionID The permission identifier.
    error PermissionImmutable(address where, bytes32 permissionID);

    // Events

    /// @notice Emitted when a permission `permission` is granted in the context `here` to the address `who` for the contract `where`.
    /// @param permissionID The permission identifier.
    /// @param here The address of the context in which the permission is granted.
    /// @param who The address (EOA or contract) receiving the permission.
    /// @param where The address of the target contract for which `who` receives permission.
    /// @param oracle The address `ALLOW_FLAG` for regular permissions or, alternatively, the `PermissionOracle` to be used.
    event Granted(
        bytes32 indexed permissionID,
        address indexed here,
        address indexed who,
        address where,
        IPermissionOracle oracle
    );

    /// @notice Emitted when a permission `permission` is revoked in the context `here` from the address `who` for the contract `where`.
    /// @param permissionID The permission identifier.
    /// @param here The address of the context in which the permission is revoked.
    /// @param who The address (EOA or contract) losing the permission.
    /// @param where The address of the target contract for which `who` loses permission
    event Revoked(
        bytes32 indexed permissionID,
        address indexed here,
        address indexed who,
        address where
    );

    /// @notice Emitted when a `permission` is made immutable to the address `here` by the contract `where`.
    /// @param permissionID The permission identifier.
    /// @param here The address of the context in which the permission is immutable.
    /// @param where The address of the target contract for which the permission is immutable.
    event MadeImmutable(bytes32 indexed permissionID, address indexed here, address where);

    /// @notice A modifier to be used to check permissions on a target contract.
    /// @param _where The address of the target contract for which the permission is required.
    /// @param _permissionID The permission identifier required to call the method this modifier is applied to.
    modifier auth(address _where, bytes32 _permissionID) {
        if (
            !(checkPermissions(_where, msg.sender, _permissionID, msg.data) ||
                checkPermissions(address(this), msg.sender, _permissionID, msg.data))
        )
            revert PermissionMissing({
                here: address(this),
                where: _where,
                who: msg.sender,
                permissionID: _permissionID
            });
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
    /// @param _permissionID The permission identifier.
    function grant(
        address _where,
        address _who,
        bytes32 _permissionID
    ) external auth(_where, ROOT_PERMISSION_ID) {
        _grant(_where, _who, _permissionID);
    }

    /// @notice Grants permission to an address to call methods in a target contract guarded by an auth modifier with the specified permission identifier if the referenced oracle permits it.
    /// @dev Requires the `ROOT_PERMISSION_ID` permission
    /// @param _where The address of the target contract for which `who` recieves permission.
    /// @param _who The address (EOA or contract) receiving the permission.
    /// @param _permissionID The permission identifier.
    /// @param _oracle The `PermissionOracle` that will be asked for authorization on calls connected to the specified permission identifier.
    function grantWithOracle(
        address _where,
        address _who,
        bytes32 _permissionID,
        IPermissionOracle _oracle
    ) external auth(_where, ROOT_PERMISSION_ID) {
        _grantWithOracle(_where, _who, _permissionID, _oracle);
    }

    /// @notice Revokes permission from an address to call methods in a target contract guarded by an auth modifier with the specified permission identifier.
    /// @dev Requires the `ROOT_PERMISSION_ID` permission.
    /// @param _where The address of the target contract for which `who` loses permission.
    /// @param _who The address (EOA or contract) losing the permission.
    /// @param _permissionID The permission identifier.
    function revoke(
        address _where,
        address _who,
        bytes32 _permissionID
    ) external auth(_where, ROOT_PERMISSION_ID) {
        _revoke(_where, _who, _permissionID);
    }

    /// @notice Makes the current permission settings of a target contract immutable. This is a permanent operation and permissions on the specified contract with the specified permission identifier can never be granted or revoked again.
    /// @dev Requires the `ROOT_PERMISSION_ID` permission.
    /// @param _where The address of the target contract for which the permission are made immutable.
    /// @param _permissionID The permission identifier.
    function makeImmutable(address _where, bytes32 _permissionID)
        external
        auth(_where, ROOT_PERMISSION_ID)
    {
        _makeImmutable(_where, _permissionID);
    }

    /// @notice Processes bulk items on the permission manager.
    /// @dev Requires the `ROOT_PERMISSION_ID` permission.
    /// @param _where The address of the contract.
    /// @param items The array of bulk items to process.
    function bulk(address _where, BulkPermissionsLib.Item[] calldata items)
        external
        auth(_where, ROOT_PERMISSION_ID)
    {
        for (uint256 i = 0; i < items.length; i++) {
            BulkPermissionsLib.Item memory item = items[i];

            if (item.operation == BulkPermissionsLib.Operation.Grant)
                _grant(_where, item.who, item.permissionID);
            else if (item.operation == BulkPermissionsLib.Operation.Revoke)
                _revoke(_where, item.who, item.permissionID);
            else if (item.operation == BulkPermissionsLib.Operation.MakeImmutable)
                _makeImmutable(_where, item.permissionID);
        }
    }

    /// @notice Checks if an address has permission on a contract via a permission identifier and considers if `ANY_ADDRESS` was used in the granting process.
    /// @param _where The address of the target contract for which `who` recieves permission.
    /// @param _who The address (EOA or contract) for which the permission is checked.
    /// @param _permissionID The permission identifier.
    /// @param _data The optional data passed to the `PermissionOracle` registered.
    /// @return bool Returns true if `who` has the permissions on the target contract via the specified permission identifier.
    function checkPermissions(
        address _where,
        address _who,
        bytes32 _permissionID,
        bytes memory _data
    ) public returns (bool) {
        return
            _checkPermission(_where, _who, _permissionID, _data) || // check if _who has permission for _permissionID on _where
            _checkPermission(_where, ANY_ADDR, _permissionID, _data) || // check if anyone has permission for _permissionID on _where
            _checkPermission(ANY_ADDR, _who, _permissionID, _data); // check if _who has permission for _permissionID on any contract
    }

    /// @notice This method is used to check if permissions for a given permission identifier on a contract are immutable.
    /// @param _where The address of the target contract for which `who` recieves permission.
    /// @param _permissionID The permission identifier.
    /// @return bool Returns true if the permission identifier is immutable for the contract address.
    function isImmutable(address _where, bytes32 _permissionID) public view returns (bool) {
        return immutablePermissions[immutablePermissionHash(_where, _permissionID)];
    }

    /// @notice Grants the `ROOT_PERMISSION_ID` permission to the initial owner during initialization of the permission manager.
    /// @param _initialOwner The initial owner of the permission manager.
    function _initializePermissionManager(address _initialOwner) internal {
        _grant(address(this), _initialOwner, ROOT_PERMISSION_ID);
    }

    /// @notice This method is used in the public `grant` method of the permission manager.
    /// @param _where The address of the target contract for which `who` recieves permission.
    /// @param _who The address (EOA or contract) owning the permission.
    /// @param _permissionID The permission identifier.
    function _grant(
        address _where,
        address _who,
        bytes32 _permissionID
    ) internal {
        _grantWithOracle(_where, _who, _permissionID, IPermissionOracle(ALLOW_FLAG));
    }

    /// @notice This method is used in the internal `_grant` method of the permission manager.
    /// @param _where The address of the target contract for which `who` recieves permission.
    /// @param _who The address (EOA or contract) owning the permission.
    /// @param _permissionID The permission identifier.
    /// @param _oracle The PermissionOracle to be used or it is just the ALLOW_FLAG.
    function _grantWithOracle(
        address _where,
        address _who,
        bytes32 _permissionID,
        IPermissionOracle _oracle
    ) internal {
        if (isImmutable(_where, _permissionID))
            revert PermissionImmutable({where: _where, permissionID: _permissionID});

        bytes32 permission = permissionHash(_where, _who, _permissionID);

        if (permissions[permission] != UNSET_FLAG) {
            revert PermissionAlreadyGranted({
                where: _where,
                who: _who,
                permissionID: _permissionID
            });
        }
        permissions[permission] = address(_oracle);

        emit Granted(_permissionID, msg.sender, _who, _where, _oracle);
    }

    /// @notice This method is used in the public `revoke` method of the permission manager.
    /// @param _where The address of the target contract for which `who` recieves permission.
    /// @param _who The address (EOA or contract) owning the permission.
    /// @param _permissionID The permission identifier.
    function _revoke(
        address _where,
        address _who,
        bytes32 _permissionID
    ) internal {
        if (isImmutable(_where, _permissionID)) {
            revert PermissionImmutable({where: _where, permissionID: _permissionID});
        }

        bytes32 permission = permissionHash(_where, _who, _permissionID);
        if (permissions[permission] == UNSET_FLAG) {
            revert PermissionAlreadyRevoked({
                where: _where,
                who: _who,
                permissionID: _permissionID
            });
        }
        permissions[permission] = UNSET_FLAG;

        emit Revoked(_permissionID, msg.sender, _who, _where);
    }

    /// @notice This method is used in the public `makeImmutable` method of the permission manager.
    /// @param _where The address of the target contract for which the permission is immutable.
    /// @param _permissionID The permission identifier.
    function _makeImmutable(address _where, bytes32 _permissionID) internal {
        bytes32 permission = immutablePermissionHash(_where, _permissionID);
        if (immutablePermissions[permission]) {
            revert PermissionImmutable({where: _where, permissionID: _permissionID});
        }
        immutablePermissions[immutablePermissionHash(_where, _permissionID)] = true;

        emit MadeImmutable(_permissionID, msg.sender, _where);
    }

    /// @notice Checks if a caller has the permissions on a contract via a permission identifier and redirects the approval to an `PermissionOracle` if this was in the setup.
    /// @param _where The address of the target contract for which `who` recieves permission.
    /// @param _who The address (EOA or contract) owning the permission.
    /// @param _permissionID The permission identifier.
    /// @param _data The optional data passed to the `PermissionOracle` registered..
    /// @return bool Returns true if `who` has the permissions on the contract via the specified permissionID identifier.
    function _checkPermission(
        address _where,
        address _who,
        bytes32 _permissionID,
        bytes memory _data
    ) internal returns (bool) {
        address accessFlagOrAclOracle = permissions[permissionHash(_where, _who, _permissionID)];

        if (accessFlagOrAclOracle == UNSET_FLAG) return false;
        if (accessFlagOrAclOracle == ALLOW_FLAG) return true;

        // Since it's not a flag, assume it's an PermissionOracle and try-catch to skip failures
        try
            IPermissionOracle(accessFlagOrAclOracle).checkPermissions(
                _where,
                _who,
                _permissionID,
                _data
            )
        returns (bool allowed) {
            if (allowed) return true;
        } catch {}

        return false;
    }

    /// @notice Generates the hash for the `authPermissions` mapping obtained from the word "PERMISSION", the contract address, the address owning the permission, and the permission identifier.
    /// @param _where The address of the target contract for which `who` recieves permission.
    /// @param _who The address (EOA or contract) owning the permission.
    /// @param _permissionID The permission identifier.
    /// @return bytes32 The permission hash.
    function permissionHash(
        address _where,
        address _who,
        bytes32 _permissionID
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("PERMISSION", _who, _where, _permissionID));
    }

    /// @notice Generates the hash for the `immutablePermissions` mapping obtained from the word "IMMUTABLE", the contract address, and the permission identifier.
    /// @param _where The address of the target contract for which `who` recieves permission.
    /// @param _permissionID The permission identifier.
    /// @return bytes32 The hash used in the `immutablePermissions` mapping.
    function immutablePermissionHash(address _where, bytes32 _permissionID)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked("IMMUTABLE", _where, _permissionID));
    }
}
