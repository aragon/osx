// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

import {IPermissionCondition} from "@aragon/osx-commons-contracts/src/permission/condition/IPermissionCondition.sol";
import {PermissionCondition} from "@aragon/osx-commons-contracts/src/permission/condition/PermissionCondition.sol";
import {PermissionLib} from "@aragon/osx-commons-contracts/src/permission/PermissionLib.sol";

/// @title PermissionManager
/// @author Aragon Association - 2021-2023
/// @notice The abstract permission manager used in a DAO, its associated plugins, and other framework-related components.
/// @custom:security-contact sirt@aragon.org
abstract contract PermissionManager is Initializable {
    using AddressUpgradeable for address;

    /// @notice The ID of the permission required to call the `grant`, `grantWithCondition`, `revoke`, and `bulk` function.
    bytes32 public constant ROOT_PERMISSION_ID = keccak256("ROOT_PERMISSION");

    /// @notice The ID of the permission required to call the `grant`, `grantWithCondition`, `revoke`, and `bulk` function.
    bytes32 public constant APPLY_TARGET_PERMISSION_ID = keccak256("APPLY_TARGET_PERMISSION_ID");

    /// @notice A special address encoding permissions that are valid for any address `who` or `where`.
    address internal constant ANY_ADDR = address(type(uint160).max);

    /// @notice A special address encoding if a permissions is not set and therefore not allowed.
    address internal constant UNSET_FLAG = address(0);

    /// @notice A special address encoding if a permission is allowed.
    address internal constant ALLOW_FLAG = address(2);

    /// @notice A mapping storing permissions as hashes (i.e., `permissionHash(where, who, permissionId)`) and their status encoded by an address (unset, allowed, or redirecting to a `PermissionCondition`).
    mapping(bytes32 => address) internal permissionsHashed;

    enum Option {
        NONE,
        grantOwner,
        revokeOwner
    }

    struct Permission {
        mapping(address => mapping(bytes32 => uint256)) delegations; // Owners can delegate the permission so delegatees can only grant it one time only.
        mapping(address => uint256) owners;
        bool created;
        uint64 grantCounter;
        uint64 revokeCounter;
    }

    mapping(bytes32 => Permission) internal permissions;

    /// @notice Thrown if a call is unauthorized.
    /// @param where The context in which the authorization reverted.
    /// @param who The address (EOA or contract) missing the permission.
    /// @param permissionId The permission identifier.
    error Unauthorized(address where, address who, bytes32 permissionId);

    /// @notice Thrown if a permission has been already granted with a different condition.
    /// @dev This makes sure that condition on the same permission can not be overwriten by a different condition.
    /// @param where The address of the target contract to grant `_who` permission to.
    /// @param who The address (EOA or contract) to which the permission has already been granted.
    /// @param permissionId The permission identifier.
    /// @param currentCondition The current condition set for permissionId.
    /// @param newCondition The new condition it tries to set for permissionId.
    error PermissionAlreadyGrantedForDifferentCondition(
        address where,
        address who,
        bytes32 permissionId,
        address currentCondition,
        address newCondition
    );

    /// @notice Thrown if a condition address is not a contract.
    /// @param condition The address that is not a contract.
    error ConditionNotAContract(IPermissionCondition condition);

    /// @notice Thrown if a condition contract does not support the `IPermissionCondition` interface.
    /// @param condition The address that is not a contract.
    error ConditionInterfacNotSupported(IPermissionCondition condition);

    /// @notice Thrown for `ROOT_PERMISSION_ID` or `EXECUTE_PERMISSION_ID` permission grants where `who` or `where` is `ANY_ADDR`.
    error PermissionsForAnyAddressDisallowed();

    /// @notice Thrown for permission grants where `who` and `where` are both `ANY_ADDR`.
    error AnyAddressDisallowedForWhoAndWhere();

    /// @notice Thrown if `Operation.GrantWithCondition` is requested as an operation but the method does not support it.
    error GrantWithConditionNotSupported();

    /// @notice Thrown if the permission is already created
    error PermissionAlreadyCreated();

    /// @notice Thrown if the action isnt allowed
    error NotPossible();

    /// @notice Thrown if the calling account doesnt have the correct permission flags set.
    error InvalidOwnerPermission(address caller, uint256 callerFlags, uint256 flags);

    /// @notice Thrown if the calling account doesnt have the permission.
    error InvalidPermission(address caller, address where, bytes32 permissionId);

    /// @notice Thrown if an argument passed is a zero address
    error ZeroAddress();

    /// @notice Thrown if the passed removal flags are invalid. The caller can only pass flags the user already has.
    error InvalidFlagsForRemovalPassed(uint256 currentFlags, uint256 removalFlags);

    /// @notice Thrown if the passed flag is set to zero
    error FlagCanNotBeZero();

    /// @notice Thrown if the permission is frozen
    error PermissionFrozen(address where, bytes32 permissionId);

    /// @notice Emitted when a permission `permission` is granted in the context `here` to the address `_who` for the contract `_where`.
    /// @param permissionId The permission identifier.
    /// @param here The address of the context in which the permission is granted.
    /// @param where The address of the target contract for which `_who` receives permission.
    /// @param who The address (EOA or contract) receiving the permission.
    /// @param condition The address `ALLOW_FLAG` for regular permissions or, alternatively, the `IPermissionCondition` contract implementation to be used.
    event Granted(
        bytes32 indexed permissionId,
        address indexed here,
        address where,
        address indexed who,
        address condition
    );

    /// @notice Emitted when a permission `permission` is revoked in the context `here` from the address `_who` for the contract `_where`.
    /// @param permissionId The permission identifier.
    /// @param here The address of the context in which the permission is revoked.
    /// @param where The address of the target contract for which `_who` loses permission.
    /// @param who The address (EOA or contract) losing the permission.
    event Revoked(
        bytes32 indexed permissionId,
        address indexed here,
        address where,
        address indexed who
    );

    /// @notice Emitted when a permission does get delegated.
    /// @param where The address of the target contract for which the delegatee does get permissions.
    /// @param permissionIdOrSelector The permission identifier.
    /// @param delegatee The address of the delegatee.
    /// @param flags The flags delegated to the delegatee.
    event PermissionDelegated(
        address indexed where,
        bytes32 indexed permissionIdOrSelector,
        address indexed delegatee,
        uint256 flags
    );

    /// @notice Emitted when a permission does get undelegated.
    /// @param where The address of the target contract for which the delegatee loses permissions.
    /// @param permissionIdOrSelector The permission identifier.
    /// @param delegatee The address of the delegatee.
    /// @param flags The current flags delegated to the delegatee.
    event PermissionUndelegated(
        address indexed where,
        bytes32 indexed permissionIdOrSelector,
        address indexed delegatee,
        uint256 flags
    );

    /// @notice Emitted when a owner does get added.
    /// @param where The address of the target contract for which the owner does get permissions.
    /// @param permissionIdOrSelector The permission identifier.
    /// @param owner The address of the new owner.
    /// @param flags The flags of the owner.
    event OwnerAdded(
        address indexed where,
        bytes32 indexed permissionIdOrSelector,
        address indexed owner,
        uint256 flags
    );

    /// @notice Emitted when a owner does get removed.
    /// @param where The address of the target contract for which the owner loses permissions.
    /// @param permissionIdOrSelector The permission identifier.
    /// @param owner The address of the new owner.
    /// @param flags The new flags of the owner.
    event OwnerRemoved(
        address indexed where,
        bytes32 indexed permissionIdOrSelector,
        address indexed owner,
        uint256 flags
    );

    /// @notice A modifier to make functions on inheriting contracts authorized. Permissions to call the function are checked through this permission manager.
    /// @param _permissionId The permission identifier required to call the method this modifier is applied to.
    modifier auth(bytes32 _permissionId) {
        _auth(_permissionId);
        _;
    }

    /// @notice Initialization method to set the initial owner of the permission manager.
    /// @dev The initial owner is granted the `ROOT_PERMISSION_ID` permission.
    /// @param _initialOwner The initial owner of the permission manager.
    function __PermissionManager_init(address _initialOwner) internal onlyInitializing {
        _initializePermissionManager({_initialOwner: _initialOwner});
    }

    /// @notice Modifier used to protect PM methods from only being called by allowed owners.
    /// @param _where The target contract to revoke or give permissions on.
    /// @param _permissionId The permission to check the permissions for.
    /// @param _flags The flag/s to check on that permission.
    modifier ownerAuth(
        address _where,
        bytes32 _permissionId,
        uint256 _flags
    ) {
        if (_flags == 0) {
            revert FlagCanNotBeZero();
        }

        bool isRoot_ = _isRoot(msg.sender);
        Permission storage permission = permissions[permissionHash(_where, _permissionId)];

        if (_isPermissionFrozen(permission)) {
            revert PermissionFrozen(_where, _permissionId);
        }

        if (
            msg.sig == this.grant.selector &&
            !_checkOwner(permission, _where, _permissionId, PermissionLib.Operation.Grant, isRoot_)
        ) {
            revert InvalidPermission(msg.sender, _where, _permissionId);
        }

        if (
            msg.sig == this.grantWithCondition.selector &&
            !_checkOwner(permission, _where, _permissionId, PermissionLib.Operation.GrantWithCondition, isRoot_)
        ) {
            revert InvalidPermission(msg.sender, _where, _permissionId);
        }

        if (
            msg.sig == this.revoke.selector &&
            !_checkOwner(permission, _where, _permissionId, PermissionLib.Operation.Revoke, isRoot_)
        ) {
            revert InvalidPermission(msg.sender, _where, _permissionId);
        }

        _;
    }

    /// @dev Requires the `ROOT_PERMISSION_ID` permission.
    /// @param _where The address of the target contract for which `_who` receives permission.
    /// @param _permissionIdOrSelector The permission hash or function selector used for this permission.
    /// @param _owner The initial owner of this newly created permission.
    /// @param _whos The addresses of the target contracts for which `_who` receives permission.
    function createPermission(
        address _where,
        bytes32 _permissionIdOrSelector,
        address _owner,
        address[] calldata _whos
    ) external auth(ROOT_PERMISSION_ID) {
        _createPermission(_where, _permissionIdOrSelector, _owner, _whos);
    }

    /// @notice Function to delegate specific flags of a permission.
    /// @param _where The address of the target contract for which `_who` receives permission.
    /// @param _permissionIdOrSelector The permission hash or function selector used for this permission.
    /// @param _delegatee The addresses who gets the permission delegated.
    /// @param _flags The flags as uint256 the permission owner wants to give this specific delegatee.
    function delegatePermission(
        address _where,
        bytes32 _permissionIdOrSelector,
        address _delegatee,
        uint256 _flags
    ) public {
        bytes32 permHash = permissionHash(_where, _permissionIdOrSelector);
        Permission storage permission = permissions[permHash];

        if (_isPermissionFrozen(permission)) {
            revert PermissionFrozen(_where, _permissionIdOrSelector);
        }

        if (!hasPermission(permission.owners[msg.sender], _flags)) {
            revert InvalidOwnerPermission(msg.sender, permission.owners[msg.sender], _flags);
        }

        uint256 newFlags = permission.delegations[_delegatee][permHash] | _flags;
        permission.delegations[_delegatee][permHash] = newFlags;

        emit PermissionDelegated(_where, _permissionIdOrSelector, _delegatee, newFlags);
    }

    /// @notice Function to remove sepcific flags from the delegatee
    /// @param _where The address of the target contract for which `_who` receives permission.
    /// @param _permissionIdOrSelector The permission hash or function selector used for this permission.
    /// @param _delegatee The addresses we want to undelegate specifc flags.
    /// @param _flags The flags as uint256 the permission owner wants to remove from this specific delegatee.
    function undelegatePermission(
        address _where,
        bytes32 _permissionIdOrSelector,
        address _delegatee,
        uint256 _flags
    ) public {
        bytes32 permHash = permissionHash(_where, _permissionIdOrSelector);
        Permission storage permission = permissions[permHash];

        if (!hasPermission(permission.owners[msg.sender], _flags)) {
            revert InvalidOwnerPermission(msg.sender, permission.owners[msg.sender], _flags);
        }

        uint256 currentFlags = permission.delegations[_delegatee][permHash];
        if (!hasPermission(currentFlags, _flags)) {
            revert InvalidFlagsForRemovalPassed(currentFlags, _flags);
        }

        uint256 newFlags = currentFlags ^ _flags;
        permission.delegations[_delegatee][permHash] = newFlags;

        emit PermissionUndelegated(_where, _permissionIdOrSelector, _delegatee, newFlags);
    }

    /// @notice Function to add a new owner to a permission.
    /// @param _where The address of the target contract for which `_who` receives permission.
    /// @param _permissionIdOrSelector The permission hash or function selector used for this permission.
    /// @param _owner The new manager for this permission.
    /// @param _flags The flags as uint256 to restrict what this specifc owner actually can do. (only revoke? only grant? both?)
    function addOwner(
        address _where,
        bytes32 _permissionIdOrSelector,
        address _owner,
        uint256 _flags
    ) external {
        if (_owner == address(0)) {
            revert ZeroAddress();
        }

        Permission storage permission = permissions[
            permissionHash(_where, _permissionIdOrSelector)
        ];

        if (_isPermissionFrozen(permission)) {
            revert PermissionFrozen(_where, _permissionIdOrSelector);
        }

        if (!hasPermission(permission.owners[msg.sender], _flags)) {
            revert InvalidOwnerPermission(msg.sender, permission.owners[msg.sender], _flags);
        }

        uint256 currentFlags = permission.owners[_owner];

        if (
            hasPermission(_flags, uint256(Option.grantOwner)) &&
            !hasPermission(currentFlags, uint256(Option.grantOwner))
        ) {
            permission.grantCounter++;
        }

        if (
            hasPermission(_flags, uint256(Option.revokeOwner)) &&
            !hasPermission(currentFlags, uint256(Option.revokeOwner))
        ) {
            permission.revokeCounter++;
        }

        permission.owners[_owner] = currentFlags | _flags;

        emit OwnerAdded(_where, _permissionIdOrSelector, _owner, _flags);
    }

    /// @notice Function that a owner can remove itself as owner.
    /// @param _where The address of the target contract for which `_who` receives permission.
    /// @param _permissionIdOrSelector The permission hash or function selector used for this permission.
    /// @param _flags The flags as uint256 to remove specifc rights the calling owner does have. (only revoke? only grant? both?)
    function removeOwner(address _where, bytes32 _permissionIdOrSelector, uint256 _flags) external {
        Permission storage permission = permissions[
            permissionHash(_where, _permissionIdOrSelector)
        ];

        uint256 currentFlags = permission.owners[msg.sender];

        // TODO: if the permission is frozen, should we still allow removing oneself ?
        // If so, add isFrozen check as well.
        if (_flags == 0 || !hasPermission(currentFlags, _flags)) {
            revert InvalidFlagsForRemovalPassed(currentFlags, _flags);
        }

        if (
            hasPermission(_flags, uint256(Option.grantOwner)) &&
            hasPermission(currentFlags, uint256(Option.grantOwner))
        ) {
            permission.grantCounter--;
        }

        if (
            hasPermission(_flags, uint256(Option.revokeOwner)) &&
            hasPermission(currentFlags, uint256(Option.revokeOwner))
        ) {
            permission.revokeCounter--;
        }

        uint256 newFlags = currentFlags ^ _flags;
        permission.owners[msg.sender] = newFlags; // remove permissions

        emit OwnerRemoved(_where, _permissionIdOrSelector, msg.sender, newFlags);
    }

    /// @notice Function to check if this specific permission is frozen.
    /// @param _where The address of the target contract for which `_who` receives permission.
    /// @param _permissionIdOrSelector The permission hash or function selector used for this permission.
    /// @return True if the permission is frozen and otherwise false
    function isPermissionFrozen(
        address _where,
        bytes32 _permissionIdOrSelector
    ) public view returns (bool) {
        Permission storage permission = permissions[
            permissionHash(_where, _permissionIdOrSelector)
        ];

        return _isPermissionFrozen(permission);
    }

    /// @notice Grants permission to an address to call methods in a contract guarded by an auth modifier with the specified permission identifier.
    /// @dev Requires the `ROOT_PERMISSION_ID` permission.
    /// @param _where The address of the target contract for which `_who` receives permission.
    /// @param _who The address (EOA or contract) receiving the permission.
    /// @param _permissionId The permission identifier.
    /// @dev Note, that granting permissions with `_who` or `_where` equal to `ANY_ADDR` does not replace other permissions with specific `_who` and `_where` addresses that exist in parallel.
    function grant(
        address _where,
        address _who,
        bytes32 _permissionId
    ) external virtual ownerAuth(_where, _permissionId, uint256(Option.grantOwner)) {
        _grant({_where: _where, _who: _who, _permissionId: _permissionId});
    }

    /// @notice Grants permission to an address to call methods in a target contract guarded by an auth modifier with the specified permission identifier if the referenced condition permits it.
    /// @dev Requires the `ROOT_PERMISSION_ID` permission
    /// @param _where The address of the target contract for which `_who` receives permission.
    /// @param _who The address (EOA or contract) receiving the permission.
    /// @param _permissionId The permission identifier.
    /// @param _condition The `PermissionCondition` that will be asked for authorization on calls connected to the specified permission identifier.
    /// @dev Note, that granting permissions with `_who` or `_where` equal to `ANY_ADDR` does not replace other permissions with specific `_who` and `_where` addresses that exist in parallel.
    function grantWithCondition(
        address _where,
        address _who,
        bytes32 _permissionId,
        IPermissionCondition _condition
    ) external virtual ownerAuth(_where, _permissionId, uint256(Option.grantOwner)) {
        _grantWithCondition({
            _where: _where,
            _who: _who,
            _permissionId: _permissionId,
            _condition: _condition
        });
    }

    /// @notice Revokes permission from an address to call methods in a target contract guarded by an auth modifier with the specified permission identifier.
    /// @dev Requires the `ROOT_PERMISSION_ID` permission.
    /// @param _where The address of the target contract for which `_who` loses permission.
    /// @param _who The address (EOA or contract) losing the permission.
    /// @param _permissionId The permission identifier.
    /// @dev Note, that revoking permissions with `_who` or `_where` equal to `ANY_ADDR` does not revoke other permissions with specific `_who` and `_where` addresses that exist in parallel.
    function revoke(
        address _where,
        address _who,
        bytes32 _permissionId
    ) external virtual ownerAuth(_where, _permissionId, uint256(Option.revokeOwner)) {
        _revoke({_where: _where, _who: _who, _permissionId: _permissionId});
    }

    /// @notice Applies an array of permission operations on a single target contracts `_where`.
    /// @param _where The address of the single target contract.
    /// @param _items The array of single-targeted permission operations to apply.
    function applySingleTargetPermissions(
        address _where,
        PermissionLib.SingleTargetPermission[] calldata _items
    ) external virtual {
        bool isRoot_ = _isRoot(msg.sender);
        if (
            !isGranted(address(this), msg.sender, APPLY_TARGET_PERMISSION_ID, msg.data) && !isRoot_
        ) {
            revert NotPossible();
        }

        for (uint256 i; i < _items.length; ) {
            PermissionLib.SingleTargetPermission memory item = _items[i];
            Permission storage permission = permissions[permissionHash(_where, item.permissionId)];

            if (
                !_checkOwner(
                    permission,
                    _where,
                    item.permissionId,
                    item.operation,
                    isRoot_
                )
            ) {
                revert InvalidPermission(msg.sender, _where, item.permissionId);
            }

            if (item.operation == PermissionLib.Operation.Grant) {
                _grant({_where: _where, _who: item.who, _permissionId: item.permissionId});
            } else if (item.operation == PermissionLib.Operation.Revoke) {
                _revoke({_where: _where, _who: item.who, _permissionId: item.permissionId});
            } else if (item.operation == PermissionLib.Operation.GrantWithCondition) {
                revert GrantWithConditionNotSupported();
            }

            unchecked {
                ++i;
            }
        }
    }

    /// @notice Applies an array of permission operations on multiple target contracts `items[i].where`.
    /// @param _items The array of multi-targeted permission operations to apply.
    function applyMultiTargetPermissions(
        PermissionLib.MultiTargetPermission[] calldata _items
    ) external virtual {
        bool isRoot_ = _isRoot(msg.sender);
        if (
            !isGranted(address(this), msg.sender, APPLY_TARGET_PERMISSION_ID, msg.data) && !isRoot_
        ) {
            revert NotPossible();
        }

        for (uint256 i; i < _items.length; ) {
            PermissionLib.MultiTargetPermission memory item = _items[i];
            Permission storage permission = permissions[
                permissionHash(item.where, item.permissionId)
            ];

            if (
                !_checkOwner(
                    permission,
                    item.who,
                    item.permissionId,
                    item.operation,
                    isRoot_
                )
            ) {
                revert InvalidPermission(msg.sender, item.where, item.permissionId);
            }

            if (item.operation == PermissionLib.Operation.Grant) {
                _grant({_where: item.where, _who: item.who, _permissionId: item.permissionId});
            } else if (item.operation == PermissionLib.Operation.Revoke) {
                _revoke({_where: item.where, _who: item.who, _permissionId: item.permissionId});
            } else if (item.operation == PermissionLib.Operation.GrantWithCondition) {
                _grantWithCondition({
                    _where: item.where,
                    _who: item.who,
                    _permissionId: item.permissionId,
                    _condition: IPermissionCondition(item.condition)
                });
            }

            unchecked {
                ++i;
            }
        }
    }

    /// @notice Checks if the caller address has permission on the target contract via a permission identifier and relays the answer to a condition contract if this was declared during the granting process.
    /// @param _where The address of the target contract for which `_who` receives permission.
    /// @param _who The address (EOA or contract) for which the permission is checked.
    /// @param _permissionId The permission identifier.
    /// @param _data Optional data to be passed to the set `PermissionCondition`.
    /// @return Returns true if `_who` has the permissions on the target contract via the specified permission identifier.
    function isGranted(
        address _where,
        address _who,
        bytes32 _permissionId,
        bytes memory _data
    ) public view virtual returns (bool) {
        // Specific caller (`_who`) and target (`_where`) permission check
        {
            // This permission may have been granted directly via the `grant` function or with a condition via the `grantWithCondition` function.
            address specificCallerTargetPermission = permissionsHashed[
                permissionHash({_where: _where, _who: _who, _permissionId: _permissionId})
            ];

            // If the permission was granted directly, return `true`.
            if (specificCallerTargetPermission == ALLOW_FLAG) {
                return true;
            }

            // If the permission was granted with a condition, check the condition and return the result.
            if (specificCallerTargetPermission != UNSET_FLAG) {
                return
                    _checkCondition({
                        _condition: specificCallerTargetPermission,
                        _where: _where,
                        _who: _who,
                        _permissionId: _permissionId,
                        _data: _data
                    });
            }

            // If this permission is not set, continue.
        }

        // Generic caller (`_who: ANY_ADDR`) condition check
        {
            // This permission can only be granted in conjunction with a condition via the `grantWithCondition` function.
            address genericCallerPermission = permissionsHashed[
                permissionHash({_where: _where, _who: ANY_ADDR, _permissionId: _permissionId})
            ];

            // If the permission was granted with a condition, check the condition and return the result.
            if (genericCallerPermission != UNSET_FLAG) {
                return
                    _checkCondition({
                        _condition: genericCallerPermission,
                        _where: _where,
                        _who: _who,
                        _permissionId: _permissionId,
                        _data: _data
                    });
            }
            // If this permission is not set, continue.
        }

        // Generic target (`_where: ANY_ADDR`) condition check
        {
            // This permission can only be granted in conjunction with a condition via the `grantWithCondition` function.
            address genericTargetPermission = permissionsHashed[
                permissionHash({_where: ANY_ADDR, _who: _who, _permissionId: _permissionId})
            ];

            // If the permission was granted with a condition, check the condition and return the result.
            if (genericTargetPermission != UNSET_FLAG) {
                return
                    _checkCondition({
                        _condition: genericTargetPermission,
                        _where: _where,
                        _who: _who,
                        _permissionId: _permissionId,
                        _data: _data
                    });
            }
            // If this permission is not set, continue.
        }

        // No specific or generic permission applies to the `_who`, `_where`, `_permissionId`, so we return `false`.
        return false;
    }

    /// @notice Relays the question if caller address has permission on target contract via a permission identifier to a condition contract.
    /// @notice Checks a condition contract by doing an external call via try/catch.
    /// @param _condition The condition contract that is called.
    /// @param _where The address of the target contract for which `_who` receives permission.
    /// @param _who The address (EOA or contract) owning the permission.
    /// @param _permissionId The permission identifier.
    /// @param _data Optional data to be passed to a referenced `PermissionCondition`.
    /// @return Returns `true` if a caller (`_who`) has the permissions on the contract (`_where`) via the specified permission identifier.
    /// @dev If the external call fails, we return `false`.
    function _checkCondition(
        address _condition,
        address _where,
        address _who,
        bytes32 _permissionId,
        bytes memory _data
    ) internal view virtual returns (bool) {
        // Try-catch to skip failures
        try
            IPermissionCondition(_condition).isGranted({
                _where: _where,
                _who: _who,
                _permissionId: _permissionId,
                _data: _data
            })
        returns (bool result) {
            if (result) {
                return true;
            }
        } catch {}
        return false;
    }

    /// @notice Grants the `ROOT_PERMISSION_ID` permission to the initial owner during initialization of the permission manager.
    /// @param _initialOwner The initial owner of the permission manager.
    function _initializePermissionManager(address _initialOwner) internal {
        _grant({_where: address(this), _who: _initialOwner, _permissionId: ROOT_PERMISSION_ID});
    }

    /// @notice This method is used in the external `grant` method of the permission manager.
    /// @param _where The address of the target contract for which `_who` receives permission.
    /// @param _who The address (EOA or contract) owning the permission.
    /// @param _permissionId The permission identifier.
    /// @dev Note, that granting permissions with `_who` or `_where` equal to `ANY_ADDR` does not replace other permissions with specific `_who` and `_where` addresses that exist in parallel.
    function _grant(address _where, address _who, bytes32 _permissionId) internal virtual {
        if (_where == ANY_ADDR || _who == ANY_ADDR) {
            revert PermissionsForAnyAddressDisallowed();
        }

        bytes32 permHash = permissionHash({
            _where: _where,
            _who: _who,
            _permissionId: _permissionId
        });

        address currentFlag = permissionsHashed[permHash];

        // Means permHash is not currently set.
        if (currentFlag == UNSET_FLAG) {
            permissionsHashed[permHash] = ALLOW_FLAG;

            emit Granted({
                permissionId: _permissionId,
                here: msg.sender,
                where: _where,
                who: _who,
                condition: ALLOW_FLAG
            });
        }
    }

    /// @notice This method is used in the external `grantWithCondition` method of the permission manager.
    /// @param _where The address of the target contract for which `_who` receives permission.
    /// @param _who The address (EOA or contract) owning the permission.
    /// @param _permissionId The permission identifier.
    /// @param _condition An address either resolving to a `PermissionCondition` contract address or being the `ALLOW_FLAG` address (`address(2)`).
    /// @dev Note, that granting permissions with `_who` or `_where` equal to `ANY_ADDR` does not replace other permissions with specific `_who` and `_where` addresses that exist in parallel.
    function _grantWithCondition(
        address _where,
        address _who,
        bytes32 _permissionId,
        IPermissionCondition _condition
    ) internal virtual {
        address conditionAddr = address(_condition);

        if (!conditionAddr.isContract()) {
            revert ConditionNotAContract(_condition);
        }

        if (
            !PermissionCondition(conditionAddr).supportsInterface(
                type(IPermissionCondition).interfaceId
            )
        ) {
            revert ConditionInterfacNotSupported(_condition);
        }

        if (_where == ANY_ADDR && _who == ANY_ADDR) {
            revert AnyAddressDisallowedForWhoAndWhere();
        }

        if (_where == ANY_ADDR || _who == ANY_ADDR) {
            if (
                _permissionId == ROOT_PERMISSION_ID ||
                isPermissionRestrictedForAnyAddr(_permissionId)
            ) {
                revert PermissionsForAnyAddressDisallowed();
            }
        }

        bytes32 permHash = permissionHash({
            _where: _where,
            _who: _who,
            _permissionId: _permissionId
        });

        address currentCondition = permissionsHashed[permHash];

        // Means permHash is not currently set.
        if (currentCondition == UNSET_FLAG) {
            permissionsHashed[permHash] = conditionAddr;

            emit Granted({
                permissionId: _permissionId,
                here: msg.sender,
                where: _where,
                who: _who,
                condition: conditionAddr
            });
        } else if (currentCondition != conditionAddr) {
            // Revert if `permHash` is already granted, but uses a different condition.
            // If we don't revert, we either should:
            //   - allow overriding the condition on the same permission
            //     which could be confusing whoever granted the same permission first
            //   - or do nothing and succeed silently which could be confusing for the caller.
            revert PermissionAlreadyGrantedForDifferentCondition({
                where: _where,
                who: _who,
                permissionId: _permissionId,
                currentCondition: currentCondition,
                newCondition: conditionAddr
            });
        }
    }

    /// @notice This method is used in the public `revoke` method of the permission manager.
    /// @param _where The address of the target contract for which `_who` receives permission.
    /// @param _who The address (EOA or contract) owning the permission.
    /// @param _permissionId The permission identifier.
    /// @dev Note, that revoking permissions with `_who` or `_where` equal to `ANY_ADDR` does not revoke other permissions with specific `_who` and `_where` addresses that might have been granted in parallel.
    function _revoke(address _where, address _who, bytes32 _permissionId) internal virtual {
        bytes32 permHash = permissionHash({
            _where: _where,
            _who: _who,
            _permissionId: _permissionId
        });
        if (permissionsHashed[permHash] != UNSET_FLAG) {
            permissionsHashed[permHash] = UNSET_FLAG;

            emit Revoked({permissionId: _permissionId, here: msg.sender, where: _where, who: _who});
        }
    }

    /// @notice Function to check if the given address is ROOT.
    /// @param _who The address to check for.
    /// @return True if the given address is ROOT and otherwise false
    function _isRoot(address _who) private returns (bool) {
        return isGranted(address(this), _who, ROOT_PERMISSION_ID, msg.data);
    }

    /// @notice Internal function to create a new permission.
    /// @dev Requires the `ROOT_PERMISSION_ID` permission.
    /// @param _where The address of the target contract for which `_who` receives permission.
    /// @param _permissionIdOrSelector The permission hash or function selector used for this permission.
    /// @param _owner The initial owner of this newly created permission.
    /// @param _whos The addresses of the target contracts for which `_who` receives permission.
    function _createPermission(
        address _where,
        bytes32 _permissionIdOrSelector,
        address _owner,
        address[] calldata _whos
    ) internal {
        // let's say ROOT is the dao and only dao can call `createPermission`.
        Permission storage permission = permissions[
            permissionHash(_where, _permissionIdOrSelector)
        ];
        if (permission.created) {
            revert PermissionAlreadyCreated();
        }

        permission.created = true;
        permission.owners[_owner] = uint256(6); // set flags to 0...110

        if (_whos.length > 0) {
            for (uint256 i = 0; i < _whos.length; i++) {
                _grant(_where, _whos[i], _permissionIdOrSelector);
            }
        }

        permission.grantCounter++;
        permission.revokeCounter++;
    }

    /// @notice Internal function to check if this specific permission is frozen.
    /// @param _permission Permission struct to check.
    /// @return True if the permission is frozen and otherwise false
    function _isPermissionFrozen(Permission storage _permission) private view returns (bool) {
        return
            _permission.grantCounter == 0 &&
            _permission.revokeCounter == 0 &&
            _permission.owners[address(1)] != 0;
    }

    /// @notice A private function to be used to check permissions on the permission manager contract (`address(this)`) itself.
    /// @param _permissionId The permission identifier required to call the method this modifier is applied to.
    function _auth(bytes32 _permissionId) internal view virtual {
        if (!isGranted(address(this), msg.sender, _permissionId, msg.data)) {
            revert Unauthorized({
                where: address(this),
                who: msg.sender,
                permissionId: _permissionId
            });
        }
    }

    /// @notice Generates the hash for the `permissionsHashed` mapping obtained from the word "PERMISSION", the contract address, the address owning the permission, and the permission identifier.
    /// @param _where The address of the target contract for which `_who` receives permission.
    /// @param _who The address (EOA or contract) owning the permission.
    /// @param _permissionId The permission identifier.
    /// @return The permission hash.
    function permissionHash(
        address _where,
        address _who,
        bytes32 _permissionId
    ) internal pure virtual returns (bytes32) {
        return keccak256(abi.encodePacked("PERMISSION", _who, _where, _permissionId));
    }

    /// @notice Generates the hash for the `permissionsHashed` mapping obtained from the word "PERMISSION", the contract address, the address owning the permission, and the permission identifier.
    /// @param _where The address of the target contract for which `_who` receives permission.
    /// @param _permissionId The permission identifier.
    /// @return The role hash.
    function permissionHash(
        address _where,
        bytes32 _permissionId
    ) internal pure virtual returns (bytes32) {
        return keccak256(abi.encodePacked("ROLE_PERMISSION_ID", _where, _permissionId));
    }

    /// @notice Checks the permission bitmap against the passed flags.
    /// @param _permission uint256 bitmap to check against.
    /// @param _flags uint256 bitmap to check.
    /// @return True if the bit's are flipped as expected and false otherwise.
    function hasPermission(uint256 _permission, uint256 _flags) public pure returns (bool) {
        return (_permission & _flags) == _flags;
    }

    /// @notice Checks the permissions for the applyTarget methods used by the plugin setup processor.
    /// @param _permission The Permission struct.
    /// @param _where The address of the target contract for which `_who` receives permission.
    /// @param _permissionId The permission identifier.
    /// @param _operation The operation to check the permission against.
    /// @return True if the permission checks succeded otherwise false.
    function _checkOwner(
        Permission storage _permission,
        address _where,
        bytes32 _permissionId,
        PermissionLib.Operation _operation,
        bool isRoot
    ) private returns (bool) {
        bytes32 permHash = permissionHash(_where, _permissionId);
        uint256 flags;

        // If permission is created, check either caller is delegated or an owner.
        if (_permission.created) {
            flags = _permission.delegations[msg.sender][permHash];
            if (flags == 0) {
                flags = _permission.owners[msg.sender];
            } else {
                delete _permission.delegations[msg.sender][permHash];
            }
        }

        if (
            _operation == PermissionLib.Operation.Grant ||
            _operation == PermissionLib.Operation.GrantWithCondition
        ) {
            if (!hasPermission(flags, uint256(Option.grantOwner))) {
                if (!(isRoot && _permission.grantCounter == 0)) {
                    return false;
                }
            }
        }

        if (_operation == PermissionLib.Operation.Revoke) {
            if (!hasPermission(flags, uint256(Option.revokeOwner))) {
                if (!(isRoot && _permission.revokeCounter == 0)) {
                    return false;
                }
            }
        }

        return true;
    }

    /// @notice Decides if the granting permissionId is restricted when `_who == ANY_ADDR` or `_where == ANY_ADDR`.
    /// @param _permissionId The permission identifier.
    /// @return Whether or not the permission is restricted.
    /// @dev By default, every permission is unrestricted and it is the derived contract's responsibility to override it. Note, that the `ROOT_PERMISSION_ID` is included and not required to be set it again.
    function isPermissionRestrictedForAnyAddr(
        bytes32 _permissionId
    ) internal view virtual returns (bool) {
        (_permissionId); // silence the warning.
        return false;
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZeppelin's guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[49] private __gap;
}
