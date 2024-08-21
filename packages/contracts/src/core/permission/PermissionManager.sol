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
        revokeOwner,
        freezeOwner
    }

    struct Permission {
        mapping(address => mapping(bytes32 => bool)) delegations; // Owners can delegate the permission so delegatees can only grant it one time only.
        mapping(address => Owner) owners;
        bool isFrozen;
        bool created;
        bool isInitialized;
        uint64 grantCounter;
        uint64 revokeCounter;
        uint64 freezeCounter;
    }

    struct Owner {
        uint64 howLong;
        uint64 since;
        uint8 flags;
    }

    mapping(bytes32 => Permission) internal permissions;

    address public allowedContract;

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

    modifier onlyPermissionOwner(
        address _where,
        bytes32 _permissionId,
        Option _option
    ) {
        Permission storage permission = permissions[roleHash(_where, _permissionId)];

        if (permission.isFrozen) {
            revert NotPossible();
        }

        if (permission.created) {
            if (!hasPermission(permission.owners[msg.sender].flags, _option)) {
                revert NotPossible();
            }
        } else if (!_isRoot(msg.sender)) {
            revert NotPossible();
        }

        _;
    }

    function setAllowedContractForApplyTarget(address _addr) public auth(ROOT_PERMISSION_ID) {
        _setAllowedContractForApplyTarget(_addr);
    }

    function createPermission(
        address _where,
        bytes32 _permissionIdOrSelector,
        address _owner,
        address[] calldata _whos,
        bool initialize
    ) external auth(ROOT_PERMISSION_ID) {
        _createPermission(_where, _permissionIdOrSelector, _owner, _whos, initialize);
    }

    function freezePermission(
        address _where,
        bytes32 _permissionIdOrSelector
    ) external onlyPermissionOwner(_where, _permissionIdOrSelector, Option.canFreeze) {
        Permission storage permission = permissions[roleHash(_where, _permissionIdOrSelector)];

        permission.isFrozen = true;
    }

    function delegatePermission(
        address _where,
        bytes32 _permissionIdOrSelector,
        address _who,
        address _condition,
        address _delegatee,
        uint8 flags,
        bool _delegate
    ) public {
        Permission storage permission = permissions[roleHash(_where, _permissionIdOrSelector)];

        if (permission.isFrozen) {
            revert NotPossible();
        }

        Owner storage owner = permission.owners[msg.sender];

        if (!_validateOwnerCallPermissions(permission, owner, _flags)) {
            revert NotPossible();
        }

        permission.delegations[_delegatee][keccak256(abi.encode(_who, _condition))] = _delegate;
    }

    function addOwner(
        address _where,
        bytes32 _permissionIdOrSelector,
        address _owner,
        uint64 _howLong,
        uint64 _since,
        uint8 _flags
    ) external {
        if (_owner == address(0)) {
            revert NotPossible();
        }

        // TODO 2: in applyMultiTargetPermissions, I think we also should change the logic such that if it's called by ROOT and permission
        // has no manager then allow it, if it's not ROOT, then check if caller has APPLY_TARGET_PERMISSION_ID. Though if we go like this,
        // we lose the ability to do conditions on applyMultiTargetPermissions.

        // TODO 3: Don't allow granting ROOT to address(this).

        Permission storage permission = permissions[roleHash(_where, _permissionIdOrSelector)];

        if (!_validateOwnerCallPermissions(permission, permission.owners[msg.sender], _flags)) {
            revert NotPossible();
        }

        Owner storage owner = permission.owners[_owner];

        if (!hasPermission(owner.flags, Option.grantOwner) && hasPermission(_flags, Option.grantOwner)) {
            permission.grantOwnerCounter++;
        }

        if (!hasPermission(owner.flags, Option.revokeOwner) && hasPermission(_flags, Option.revokeOwner)) {
            permission.revokeOwnerCounter++;
        }

        if (!hasPermission(owner.flags, Option.freezeOwner) && hasPermission(_flags, Option.freezeOwner)) {
            permission.freezeOwnerCounter++;
        }

        permission.owners[_owner] = Owner({
            flags: owner.flags | _flags, // Combining the flags
            howLong: _howLong,
            since: _since == uint256(0) ? block.timestamp : _since
        });
    }

    function removeOwner(
        address _where,
        bytes32 _permissionIdOrSelector,
        uint8 _flags
    ) external {
        if (_owner == address(0)) {
            revert NotPossible();
        }

        Permission storage permission = permissions[roleHash(_where, _permissionIdOrSelector)];
        Owner storage owner = permission.owners[msg.sender];

        if (hasPermission(flags, Option.grantOwner) && hasPermission(owner.flags, Option.grantOwner)) {
            permission.grantOwnerCounter--;
        }

        if (hasPermission(flags, Option.revokeOwner) && hasPermission(owner.flags, Option.revokeOwner)) {
            permission.revokeOwnerCounter--;
        }

        if (hasPermission(flags, Option.freezeOwner) && hasPermission(owner.flags, Option.freezeOwner)) {
            permission.freezeOwnerCounter--;
        }

        owner.flags = owner.flags ^ _flags; // remove permissions
    }

    function initializePermission(address _where, bytes32 _permissionSelector) public {
        Permission storage permission = permissions[roleHash(_where, _selector)];

        // TODO: Extend here the owner logic as well
        if (!hasPermission(_permission.owners[msg.sender].flagss, Option.canAddRemove)) {
            revert NotPossible();
        }

        if (!permission.isInitialized) {
            permission.isInitialized = true;
        }
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
    ) external virtual onlyPermissionOwner(_where, _permissionId, Option.canGrantRevoke) {
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
    ) external virtual onlyPermissionOwner(_where, _permissionId, Option.canGrantRevoke) {
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
    ) external virtual onlyPermissionOwner(_where, _permissionId, Option.canGrantRevoke) {
        _revoke({_where: _where, _who: _who, _permissionId: _permissionId});
    }

    /// @notice Applies an array of permission operations on a single target contracts `_where`.
    /// @param _where The address of the single target contract.
    /// @param items The array of single-targeted permission operations to apply.
    function applySingleTargetPermissions(
        address _where,
        PermissionLib.SingleTargetPermission[] calldata items
    ) external virtual auth(APPLY_TARGET_PERMISSION_ID) {
        for (uint256 i; i < items.length; ) {
            PermissionLib.SingleTargetPermission memory item = items[i];

            Permission storage permission = permissions[roleHash(item.where, item.permissionId)];

            // TODO: take this in helper function
            if (permission.created) {
                if (
                    !permission.delegations[msg.sender][
                        keccak256(abi.encode(item.who, item.condition))
                    ] && !hasPermission(permission.owners[msg.sender].flags, Option.canGrantRevoke) // TODO: Add new permission check here
                ) {
                    revert NotPossible();
                }

                delete permission.delegates[msg.sender][
                    keccak256(abi.encode(item.who, item.condition))
                ];
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
    ) external virtual auth(APPLY_TARGET_PERMISSION_ID) {
        for (uint256 i; i < _items.length; ) {
            PermissionLib.MultiTargetPermission memory item = _items[i];

            // TODO: take this in helper function
            Permission storage permission = permissions[roleHash(item.where, item.permissionId)];

            if (permission.created) {
                if (
                    !permission.delegatees[msg.sender][
                        keccak256(abi.encode(item.who, item.condition))
                    ] && !hasPermission(permission.owners[msg.sender].flags, Option.canGrantRevoke) // TODO: Add new permission check here
                ) {
                    revert NotPossible();
                }

                delete permission.delegates[msg.sender][
                    keccak256(abi.encode(item.who, item.condition))
                ];
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

        // Make sure that this special permission is only granted
        // to the address allowed by ROOT.
        if (_permissionId == APPLY_TARGET_PERMISSION_ID) {
            if (allowedContract == address(0) || allowedContract != _who) {
                revert NotPossible();
            }
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

    function _isRoot(address _who) private returns (bool) {
        return isGranted(address(this), _who, ROOT_PERMISSION_ID, msg.data);
    }

    function _createPermission(
        address _where,
        bytes32 _permissionIdOrSelector,
        address _owner,
        address[] calldata _whos,
        bool _initialize
    ) internal {
        // let's say ROOT is the dao and only dao can call `createPermission`.
        Permission storage permission = permissions[roleHash(_where, _permissionIdOrSelector)];
        if (permission.created) {
            revert PermissionAlreadyCreated();
        }

        permission.created = true;
        permission.owners[_owner].flags = uint8(15); // set flags to 00001111

        if (_whos.length > 0) {
            for (uint256 i = 0; i < _whos.length; i++) {
                _grant(_where, _whos[i], _permissionIdOrSelector);
            }
        }

        permission.isInitialized = _initialize;
        permission.counter++;
    }

    function _setAllowedContractForApplyTarget(address _addr) internal {
        allowedContract = _addr;
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

    function _auth(bytes32 _permissionId) internal view virtual {
        if (!isGranted(address(this), msg.sender, keccak256(bytes4(msg.data)), msg.data)) {
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

    function hasPermission(uint8 _permission, Option _permission) public pure returns (bool) {
        return (permission & uint8(1 << uint8(_permission))) != 0;
    }

    function _validateOwnerCallPermissions(
        Permission storage _permission,
        Owner storage _owner,
        uint8 _flags
    ) private returns (bool) {
        // Return false in case the permission is frozen
        if (_permission.isFrozen) {
            return false;
        }

        if (block.timestamp < _owner.since || block.timestamp > _owner.since + _owner.howLong) {
            return false;
        }

        // If the caller isnt a root caller and there are managers existing then check the actual permissions of that manager
        if ((_owner.flags & _flags) != _flags) {
            return true;
        }

        // Check if the ROOT default case is applicable
        if (_isRoot(msg.sender)) {
            if (hasPermission(flags, uint8(1)) && permission.grantOwnerCounter != uint64(0)) {
                return false;
            }

            if (hasPermission(flags, uint8(2)) && permission.revokeOwnerCounter != uint64(0)) {
                return false;
            }

            if (hasPermission(flags, uint8(3)) && permission.freezeOwnerCounter != uint64(0)) {
                return false;
            }

            return true;
        }

        return false;
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
