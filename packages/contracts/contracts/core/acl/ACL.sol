// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./IACLOracle.sol";

library ACLData {
    enum BulkOp {
        Grant,
        Revoke,
        Freeze
    }

    struct BulkItem {
        BulkOp op;
        bytes32 role;
        address who;
    }

    /// @notice Thrown if the function is not authorized
    /// @param here The contract containing the function
    /// @param where The contract being called
    /// @param who The address (EOA or contract) owning the permission
    /// @param role The role required to call the function
    error ACLAuth(address here, address where, address who, bytes32 role);

    /// @notice Thrown if the role was already granted to the address interacting with the target
    /// @param where The contract being called
    /// @param who The address (EOA or contract) owning the permission
    /// @param role The role required to call the function
    error ACLRoleAlreadyGranted(address where, address who, bytes32 role);

    /// @notice Thrown if the role was already revoked from the address interact with the target
    /// @param where The contract being called
    /// @param who The address (EOA or contract) owning the permission
    /// @param role The hash of the role identifier
    error ACLRoleAlreadyRevoked(address where, address who, bytes32 role);

    /// @notice Thrown if the address was already granted the role to interact with the target
    /// @param where The contract being called
    /// @param role The hash of the role identifier
    error ACLRoleFrozen(address where, bytes32 role);
}

/// @title The ACL used in the DAO contract to manage all permissions of a DAO.
/// @author Aragon Association - 2021
/// @notice This contract is used in the DAO contract and handles all the permissions of a DAO. This means it also handles the permissions of the processes or any custom component of the DAO.
contract ACL is Initializable {
    // @notice the ROOT_ROLE identifier used
    bytes32 public constant ROOT_ROLE = keccak256("ROOT_ROLE");

    // "Who" constants
    address internal constant ANY_ADDR = address(type(uint160).max);

    // "Access" flags
    address internal constant UNSET_ROLE = address(0);
    address internal constant ALLOW_FLAG = address(2);

    // hash(where, who, role) => Access flag(unset or allow) or ACLOracle (any other address denominates auth via ACLOracle)
    mapping(bytes32 => address) internal permissions;
    // hash(where, role) => true(role froze on the where), false(role is not frozen on the where)
    mapping(bytes32 => bool) internal frozenPermissions;

    // Events

    /// @notice Emitted when a permission `role` is granted to the address `actor` by the address `who` in the contract `where`
    /// @param role The hash of the role identifier
    /// @param actor The address receiving the new role
    /// @param who The address (EOA or contract) owning the permission
    /// @param where The address of the contract
    /// @param oracle The ACLOracle to be used or it is just the ALLOW_FLAG
    event Granted(
        bytes32 indexed role,
        address indexed actor,
        address indexed who,
        address where,
        IACLOracle oracle
    );

    /// @notice Emitted when a permission `role` is revoked to the address `actor` by the address `who` in the contract `where`
    /// @param role The hash of the role identifier
    /// @param actor The address receiving the revoked role
    /// @param who The address (EOA or contract) owning the permission
    /// @param where The address of the contract
    event Revoked(bytes32 indexed role, address indexed actor, address indexed who, address where);

    /// @notice Emitted when a `role` is frozen to the address `actor` by the contract `where`
    /// @param role The hash of the role identifier
    /// @param actor The address that is frozen
    /// @param where The address of the contract
    event Frozen(bytes32 indexed role, address indexed actor, address where);

    /// @notice The modifier to be used to check permissions.
    /// @param _where The address of the contract
    /// @param _role The hash of the role identifier required to call the method this modifier is applied to
    modifier auth(address _where, bytes32 _role) {
        if (
            !(willPerform(_where, msg.sender, _role, msg.data) ||
                willPerform(address(this), msg.sender, _role, msg.data))
        )
            revert ACLData.ACLAuth({
                here: address(this),
                where: _where,
                who: msg.sender,
                role: _role
            });
        _;
    }

    /// @notice Initialization method to set the initial owner of the ACL
    /// @dev The initial owner is granted the `ROOT_ROLE` permission
    /// @param _initialOwner The initial owner of the ACL
    function __ACL_init(address _initialOwner) internal onlyInitializing {
        _initializeACL(_initialOwner);
    }

    /// @notice Grants permission to call a contract address from another address via the specified role identifier
    /// @dev Requires the `ROOT_ROLE` permission
    /// @param _where The address of the contract
    /// @param _who The address (EOA or contract) owning the permission
    /// @param _role The hash of the role identifier
    function grant(
        address _where,
        address _who,
        bytes32 _role
    ) external auth(_where, ROOT_ROLE) {
        _grant(_where, _who, _role);
    }

    /// @notice Grants permission to call a contract address from another address via a role identifier and an `ACLOracle`
    /// @dev Requires the `ROOT_ROLE` permission
    /// @param _where The address of the contract
    /// @param _who The address (EOA or contract) owning the permission
    /// @param _role The hash of the role identifier
    /// @param _oracle The `ACLOracle` that will be asked for authorization on calls connected to the specified role identifier
    function grantWithOracle(
        address _where,
        address _who,
        bytes32 _role,
        IACLOracle _oracle
    ) external auth(_where, ROOT_ROLE) {
        _grantWithOracle(_where, _who, _role, _oracle);
    }

    /// @notice Revokes permissions of an address for a role identifier of a contract
    /// @dev Requires the `ROOT_ROLE` permission
    /// @param _where The address of the contract
    /// @param _who The address (EOA or contract) owning the permission
    /// @param _role The hash of the role identifier
    function revoke(
        address _where,
        address _who,
        bytes32 _role
    ) external auth(_where, ROOT_ROLE) {
        _revoke(_where, _who, _role);
    }

    /// @notice Freezes the current permission settings on a contract associated for the specified role identifier.
    ///         This is a permanent operation and permissions on the specified contract with the specified role identifier can never be granted or revoked again.
    /// @dev Requires the `ROOT_ROLE` permission
    /// @param _where The address of the contract
    /// @param _role The hash of the role identifier
    function freeze(address _where, bytes32 _role) external auth(_where, ROOT_ROLE) {
        _freeze(_where, _role);
    }

    /// @notice Method to do bulk operations on the ACL
    /// @dev Requires the `ROOT_ROLE` permission
    /// @param _where The address of the contract
    /// @param items A list of ACL operations to do
    function bulk(address _where, ACLData.BulkItem[] calldata items)
        external
        auth(_where, ROOT_ROLE)
    {
        for (uint256 i = 0; i < items.length; i++) {
            ACLData.BulkItem memory item = items[i];

            if (item.op == ACLData.BulkOp.Grant) _grant(_where, item.who, item.role);
            else if (item.op == ACLData.BulkOp.Revoke) _revoke(_where, item.who, item.role);
            else if (item.op == ACLData.BulkOp.Freeze) _freeze(_where, item.role);
        }
    }

    /// @notice Checks if an address has permission on a contract via a role identifier and considers if `ANY_ADDRESS` was used in the granting process.
    /// @param _where The address of the contract
    /// @param _who The address (EOA or contract) for which the permission is checked
    /// @param _role The hash of the role identifier
    /// @param _data The optional data passed to the `ACLOracle` registered
    /// @return bool Returns true if `who` has the permissions on the contract via the specified role identifier
    function willPerform(
        address _where,
        address _who,
        bytes32 _role,
        bytes memory _data
    ) public returns (bool) {
        return
            _checkRole(_where, _who, _role, _data) || // check if _who has permission for _role on _where
            _checkRole(_where, ANY_ADDR, _role, _data) || // check if anyone has permission for _role on _where
            _checkRole(ANY_ADDR, _who, _role, _data); // check if _who has permission for _role on any contract
    }

    /// @notice This method is used to check if permissions for a given role identifier on a contract are frozen
    /// @param _where The address of the contract
    /// @param _role The hash of the role identifier
    /// @return bool Returns true if the role identifier has been frozen for the contract address
    function isFrozen(address _where, bytes32 _role) public view returns (bool) {
        return frozenPermissions[freezeHash(_where, _role)];
    }

    /// @notice This method is used in the public `_grant` method of the ACL
    /// @notice Grants the `ROOT_ROLE` permission during initialization of the ACL
    /// @param _initialOwner The initial owner of the ACL
    function _initializeACL(address _initialOwner) internal {
        _grant(address(this), _initialOwner, ROOT_ROLE);
    }

    /// @notice This method is used in the public `grant` method of the ACL
    /// @param _where The address of the contract
    /// @param _who The address (EOA or contract) owning the permission
    /// @param _role The hash of the role identifier
    function _grant(
        address _where,
        address _who,
        bytes32 _role
    ) internal {
        _grantWithOracle(_where, _who, _role, IACLOracle(ALLOW_FLAG));
    }

    /// @notice This method is used in the internal `_grant` method of the ACL
    /// @param _where The address of the contract
    /// @param _who The address (EOA or contract) owning the permission
    /// @param _role The hash of the role identifier
    /// @param _oracle The ACLOracle to be used or it is just the ALLOW_FLAG
    function _grantWithOracle(
        address _where,
        address _who,
        bytes32 _role,
        IACLOracle _oracle
    ) internal {
        if (isFrozen(_where, _role)) revert ACLData.ACLRoleFrozen({where: _where, role: _role});

        bytes32 permission = permissionHash(_where, _who, _role);

        if (permissions[permission] != UNSET_ROLE) {
            revert ACLData.ACLRoleAlreadyGranted({where: _where, who: _who, role: _role});
        }
        permissions[permission] = address(_oracle);

        emit Granted(_role, msg.sender, _who, _where, _oracle);
    }

    /// @notice This method is used in the public `revoke` method of the ACL
    /// @param _where The address of the contract
    /// @param _who The address (EOA or contract) owning the permission
    /// @param _role The hash of the role identifier
    function _revoke(
        address _where,
        address _who,
        bytes32 _role
    ) internal {
        if (isFrozen(_where, _role)) revert ACLData.ACLRoleFrozen({where: _where, role: _role});

        bytes32 permission = permissionHash(_where, _who, _role);
        if (permissions[permission] == UNSET_ROLE) {
            revert ACLData.ACLRoleAlreadyRevoked({where: _where, who: _who, role: _role});
        }
        permissions[permission] = UNSET_ROLE;

        emit Revoked(_role, msg.sender, _who, _where);
    }

    /// @notice This method is used in the public `freeze` method of the ACL
    /// @param _where The address of the contract
    /// @param _role The hash of the role identifier
    function _freeze(address _where, bytes32 _role) internal {
        bytes32 permission = freezeHash(_where, _role);
        if (frozenPermissions[permission]) {
            revert ACLData.ACLRoleFrozen({where: _where, role: _role});
        }
        frozenPermissions[freezeHash(_where, _role)] = true;

        emit Frozen(_role, msg.sender, _where);
    }

    /// @notice Checks if a caller has the permissions on a contract via a role identifier and redirects the approval to an `ACLOracle` if this was in the setup
    /// @param _where The address of the contract
    /// @param _who The address (EOA or contract) owning the permission
    /// @param _role The hash of the role identifier
    /// @param _data The optional data passed to the ACLOracle registered.
    /// @return bool Returns true if `who` has the permissions on the contract via the specified role identifier
    function _checkRole(
        address _where,
        address _who,
        bytes32 _role,
        bytes memory _data
    ) internal returns (bool) {
        address accessFlagOrAclOracle = permissions[permissionHash(_where, _who, _role)];

        if (accessFlagOrAclOracle == UNSET_ROLE) return false;
        if (accessFlagOrAclOracle == ALLOW_FLAG) return true;

        // Since it's not a flag, assume it's an ACLOracle and try-catch to skip failures
        try IACLOracle(accessFlagOrAclOracle).willPerform(_where, _who, _role, _data) returns (
            bool allowed
        ) {
            if (allowed) return true;
        } catch {}

        return false;
    }

    /// @notice Generates the hash for the `authPermissions` mapping obtained from the workd "PERMISSION",
    ///         the contract address, the address owning the permission, and the role identifier.
    /// @param _where The address of the contract
    /// @param _who The address (EOA or contract) owning the permission
    /// @param _role The hash of the role identifier
    /// @return bytes32 The permission hash
    function permissionHash(
        address _where,
        address _who,
        bytes32 _role
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("PERMISSION", _who, _where, _role));
    }

    /// @notice Generates the hash for the `frozenPermissions` mapping obtained from the workd "PERMISSION",
    ///         the contract address, the address owning the permission, and the role identifier.
    /// @param _where The address of the contract
    /// @param _role The hash of the role identifier
    /// @return bytes32 The freeze hash used in the frozenPermissions mapping
    function freezeHash(address _where, bytes32 _role) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("FREEZE", _where, _role));
    }
}
