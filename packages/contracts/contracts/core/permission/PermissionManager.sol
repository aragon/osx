// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./IPermissionOracle.sol";

library PermissionLib {
    enum Operation {
        Grant,
        Revoke,
        Freeze
    }

    struct BulkItem {
        Operation operation;
        bytes32 permissionID;
        address who;
    }

    /// @notice Thrown if the function is not authorized
    /// @param here The contract containing the function
    /// @param where The contract being called
    /// @param who The address (EOA or contract) owning the permission
    /// @param permissionID The permission identifier required to call the function
    error PermissionUnauthorized(address here, address where, address who, bytes32 permissionID);

    /// @notice Thrown if the permissionID was already granted to the address interacting with the target
    /// @param where The contract being called
    /// @param who The address (EOA or contract) owning the permission
    /// @param permissionID The permission identifier required to call the function
    error PermissionAlreadyGranted(address where, address who, bytes32 permissionID);

    /// @notice Thrown if the permissionID was already revoked from the address interact with the target
    /// @param where The contract being called
    /// @param who The address (EOA or contract) owning the permission
    /// @param permissionID The permission identifier
    error PermissionAlreadyRevoked(address where, address who, bytes32 permissionID);

    /// @notice Thrown if the address was already granted the permissionID to interact with the target
    /// @param where The contract being called
    /// @param permissionID The permission identifier
    error PermissionFrozen(address where, bytes32 permissionID);
}

/// @title The permission manager used in the DAO contract.
/// @author Aragon Association - 2021
/// @notice This contract is used in the DAO contract and handles the permissions of a DAO and its associated components.
contract PermissionManager is Initializable {
    bytes32 public constant ROOT_PERMISSION_ID = keccak256("ROOT_PERMISSION_ID");

    // "Who" constants
    address internal constant ANY_ADDR = address(type(uint160).max);

    // "Access" flags
    address internal constant UNSET_FLAG = address(0);
    address internal constant ALLOW_FLAG = address(2);

    // hash(where, who, permission) => Access flag(unset or allow) or PermissionOracle (any other address denominates auth via PermissionOracle)
    mapping(bytes32 => address) internal permissions;
    // hash(where, permissionID) => true(permissionID froze on the where), false(permissionID is not frozen on the where)
    mapping(bytes32 => bool) internal frozenPermissions;

    // Events

    /// @notice Emitted when a permission `permissionID` is granted to the address `actor` by the address `who` in the contract `where`
    /// @param permissionID The permission identifier
    /// @param actor The address receiving the new permissionID
    /// @param who The address (EOA or contract) owning the permission
    /// @param where The address of the contract
    /// @param oracle The PermissionOracle to be used or it is just the ALLOW_FLAG
    event Granted(
        bytes32 indexed permissionID,
        address indexed actor,
        address indexed who,
        address where,
        IPermissionOracle oracle
    );

    /// @notice Emitted when a permission `permissionID` is revoked to the address `actor` by the address `who` in the contract `where`
    /// @param permissionID The permission identifier
    /// @param actor The address receiving the revoked permissionID
    /// @param who The address (EOA or contract) owning the permission
    /// @param where The address of the contract
    event Revoked(
        bytes32 indexed permissionID,
        address indexed actor,
        address indexed who,
        address where
    );

    /// @notice Emitted when a `permissionID` is frozen to the address `actor` by the contract `where`
    /// @param permissionID The permission identifier
    /// @param actor The address that is frozen
    /// @param where The address of the contract
    event Frozen(bytes32 indexed permissionID, address indexed actor, address where);

    /// @notice The modifier to be used to check permissions.
    /// @param _where The address of the contract
    /// @param _permissionID The permission identifier required to call the method this modifier is applied to
    modifier auth(address _where, bytes32 _permissionID) {
        if (
            !(checkPermissions(_where, msg.sender, _permissionID, msg.data) ||
                checkPermissions(address(this), msg.sender, _permissionID, msg.data))
        )
            revert PermissionLib.PermissionUnauthorized({
                here: address(this),
                where: _where,
                who: msg.sender,
                permissionID: _permissionID
            });
        _;
    }

    /// @notice Initialization method to set the initial owner of the permission manager
    /// @dev The initial owner is granted the `ROOT_PERMISSION_ID` permission
    /// @param _initialOwner The initial owner of the permission manager
    function __PermissionManager_init(address _initialOwner) internal onlyInitializing {
        _initializePermissionManager(_initialOwner);
    }

    /// @notice Grants permission to call a contract address from another address via the specified permissionID identifier
    /// @dev Requires the `ROOT_PERMISSION_ID` permission
    /// @param _where The address of the contract
    /// @param _who The address (EOA or contract) owning the permission
    /// @param _permissionID The permission identifier
    function grant(
        address _where,
        address _who,
        bytes32 _permissionID
    ) external auth(_where, ROOT_PERMISSION_ID) {
        _grant(_where, _who, _permissionID);
    }

    /// @notice Grants permission to call a contract address from another address via a permissionID identifier and an `ACLOracle`
    /// @dev Requires the `ROOT_PERMISSION_ID` permission
    /// @param _where The address of the contract
    /// @param _who The address (EOA or contract) owning the permission
    /// @param _permissionID The permission identifier
    /// @param _oracle The `PermissionOracle` that will be asked for authorization on calls connected to the specified permissionID identifier
    function grantWithOracle(
        address _where,
        address _who,
        bytes32 _permissionID,
        IPermissionOracle _oracle
    ) external auth(_where, ROOT_PERMISSION_ID) {
        _grantWithOracle(_where, _who, _permissionID, _oracle);
    }

    /// @notice Revokes permissions of an address for a permissionID identifier of a contract
    /// @dev Requires the `ROOT_PERMISSION_ID` permission
    /// @param _where The address of the contract
    /// @param _who The address (EOA or contract) owning the permission
    /// @param _permissionID The permission identifier
    function revoke(
        address _where,
        address _who,
        bytes32 _permissionID
    ) external auth(_where, ROOT_PERMISSION_ID) {
        _revoke(_where, _who, _permissionID);
    }

    /// @notice Freezes the current permission settings on a contract associated for the specified permissionID identifier.
    ///         This is a permanent operation and permissions on the specified contract with the specified permissionID identifier can never be granted or revoked again.
    /// @dev Requires the `ROOT_PERMISSION_ID` permission
    /// @param _where The address of the contract
    /// @param _permissionID The permission identifier
    function freeze(address _where, bytes32 _permissionID)
        external
        auth(_where, ROOT_PERMISSION_ID)
    {
        _freeze(_where, _permissionID);
    }

    /// @notice Processes bulk items on the permission manager
    /// @dev Requires the `ROOT_PERMISSION_ID` permission
    /// @param _where The address of the contract
    /// @param items The array of bulk items to process
    function bulk(address _where, PermissionLib.BulkItem[] calldata items)
        external
        auth(_where, ROOT_PERMISSION_ID)
    {
        for (uint256 i = 0; i < items.length; i++) {
            PermissionLib.BulkItem memory item = items[i];

            if (item.operation == PermissionLib.Operation.Grant)
                _grant(_where, item.who, item.permissionID);
            else if (item.operation == PermissionLib.Operation.Revoke)
                _revoke(_where, item.who, item.permissionID);
            else if (item.operation == PermissionLib.Operation.Freeze)
                _freeze(_where, item.permissionID);
        }
    }

    /// @notice Checks if an address has permission on a contract via a permissionID identifier and considers if `ANY_ADDRESS` was used in the granting process.
    /// @param _where The address of the contract
    /// @param _who The address (EOA or contract) for which the permission is checked
    /// @param _permissionID The permission identifier
    /// @param _data The optional data passed to the `PermissionOracle` registered
    /// @return bool Returns true if `who` has the permissions on the contract via the specified permission identifier
    function checkPermissions(
        address _where,
        address _who,
        bytes32 _permissionID,
        bytes memory _data
    ) public returns (bool) {
        return
            _checkRole(_where, _who, _permissionID, _data) || // check if _who has permission for _permissionID on _where
            _checkRole(_where, ANY_ADDR, _permissionID, _data) || // check if anyone has permission for _permissionID on _where
            _checkRole(ANY_ADDR, _who, _permissionID, _data); // check if _who has permission for _permissionID on any contract
    }

    /// @notice This method is used to check if permissions for a given permissionID identifier on a contract are frozen
    /// @param _where The address of the contract
    /// @param _permissionID The permission identifier
    /// @return bool Returns true if the permissionID identifier has been frozen for the contract address
    function isFrozen(address _where, bytes32 _permissionID) public view returns (bool) {
        return frozenPermissions[freezeHash(_where, _permissionID)];
    }

    /// @notice Grants the `ROOT_PERMISSION_ID` permission during initialization of the permission manager
    /// @param _initialOwner The initial owner of the permission manager
    function _initializePermissionManager(address _initialOwner) internal {
        _grant(address(this), _initialOwner, ROOT_PERMISSION_ID);
    }

    /// @notice This method is used in the public `grant` method of the permission manager
    /// @param _where The address of the contract
    /// @param _who The address (EOA or contract) owning the permission
    /// @param _permissionID The permission identifier
    function _grant(
        address _where,
        address _who,
        bytes32 _permissionID
    ) internal {
        _grantWithOracle(_where, _who, _permissionID, IPermissionOracle(ALLOW_FLAG));
    }

    /// @notice This method is used in the internal `_grant` method of the permission manager
    /// @param _where The address of the contract
    /// @param _who The address (EOA or contract) owning the permission
    /// @param _permissionID The permission identifier
    /// @param _oracle The PermissionOracle to be used or it is just the ALLOW_FLAG
    function _grantWithOracle(
        address _where,
        address _who,
        bytes32 _permissionID,
        IPermissionOracle _oracle
    ) internal {
        if (isFrozen(_where, _permissionID))
            revert PermissionLib.PermissionFrozen({where: _where, permissionID: _permissionID});

        bytes32 permission = permissionHash(_where, _who, _permissionID);

        if (permissions[permission] != UNSET_FLAG) {
            revert PermissionLib.PermissionAlreadyGranted({
                where: _where,
                who: _who,
                permissionID: _permissionID
            });
        }
        permissions[permission] = address(_oracle);

        emit Granted(_permissionID, msg.sender, _who, _where, _oracle);
    }

    /// @notice This method is used in the public `revoke` method of the permission manager
    /// @param _where The address of the contract
    /// @param _who The address (EOA or contract) owning the permission
    /// @param _permissionID The permission identifier
    function _revoke(
        address _where,
        address _who,
        bytes32 _permissionID
    ) internal {
        if (isFrozen(_where, _permissionID)) {
            revert PermissionLib.PermissionFrozen({where: _where, permissionID: _permissionID});
        }

        bytes32 permission = permissionHash(_where, _who, _permissionID);
        if (permissions[permission] == UNSET_FLAG) {
            revert PermissionLib.PermissionAlreadyRevoked({
                where: _where,
                who: _who,
                permissionID: _permissionID
            });
        }
        permissions[permission] = UNSET_FLAG;

        emit Revoked(_permissionID, msg.sender, _who, _where);
    }

    /// @notice This method is used in the public `freeze` method of the permission manager
    /// @param _where The address of the contract
    /// @param _permissionID The permission identifier
    function _freeze(address _where, bytes32 _permissionID) internal {
        bytes32 permission = freezeHash(_where, _permissionID);
        if (frozenPermissions[permission]) {
            revert PermissionLib.PermissionFrozen({where: _where, permissionID: _permissionID});
        }
        frozenPermissions[freezeHash(_where, _permissionID)] = true;

        emit Frozen(_permissionID, msg.sender, _where);
    }

    /// @notice Checks if a caller has the permissions on a contract via a permissionID identifier and redirects the approval to an `PermissionOracle` if this was in the setup
    /// @param _where The address of the contract
    /// @param _who The address (EOA or contract) owning the permission
    /// @param _permissionID The permission identifier
    /// @param _data The optional data passed to the `PermissionOracle` registered.
    /// @return bool Returns true if `who` has the permissions on the contract via the specified permissionID identifier
    function _checkRole(
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

    /// @notice Generates the hash for the `authPermissions` mapping obtained from the workd "PERMISSION",
    ///         the contract address, the address owning the permission, and the permissionID identifier.
    /// @param _where The address of the contract
    /// @param _who The address (EOA or contract) owning the permission
    /// @param _permissionID The permission identifier
    /// @return bytes32 The permission hash
    function permissionHash(
        address _where,
        address _who,
        bytes32 _permissionID
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("PERMISSION", _who, _where, _permissionID));
    }

    /// @notice Generates the hash for the `frozenPermissions` mapping obtained from the workd "PERMISSION",
    ///         the contract address, the address owning the permission, and the permissionID identifier.
    /// @param _where The address of the contract
    /// @param _permissionID The permission identifier
    /// @return bytes32 The freeze hash used in the frozenPermissions mapping
    function freezeHash(address _where, bytes32 _permissionID) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("FREEZE", _where, _permissionID));
    }
}
