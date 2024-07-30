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
        canFreeze,
        canAddRemove,
        canGrantRevoke
    }

    struct Permission {
        bool isFrozen;
        bool created;
        bool isInitialized;
        mapping(address => Option) managers;
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

    address public caller = _caller;

    /// @notice Initialization method to set the initial owner of the permission manager.
    /// @dev The initial owner is granted the `ROOT_PERMISSION_ID` permission.
    /// @param _initialOwner The initial owner of the permission manager.
    function __PermissionManager_init(
        address _initialOwner, 
        address _pspRegistry,
        address _caller
    ) internal onlyInitializing {
        _initializePermissionManager({_initialOwner: _initialOwner});
    }

    function setApplyCaller(address _caller) {
        if(!_pspRegistry.isValid(_caller)) {
            revert NotPossible();
        }

        caller = _caller;
    }

    modifier onlyPermissionManager(address _where, bytes32 _permissionId) {
        Permission storage permission = permissions[roleHash(_where, _permissionId)];

        if (permission.isFrozen) {
            revert NotPossible();
        }

        if (!hasPermission(permission.managers[msg.sender].option, Option.canGrantRevoke)) {
            revert NotPossible();
        }
    }

    function freezeRole(address _where, bytes32 _permissionIdOrSelector) external {
        Permission storage permission = permissions[roleHash(_where, _permissionIdOrSelector)];

        Access storage access = permission.managers[msg.sender];
        if (hasPermission(access.option, Option.canFreeze)) {
            permission.isFrozen = true;
            // TODO: emit role frozen
        }
    }

    // Spec of how this will work after the upgrade:
    // 1. nobody will be able to `grant/revoke` the permission unless `grant/revoke` is called by manager on that specific permission.
    // 2. Any type of permissions in the beginning by default has no manager and it's a ROOT that can add the manager
    // for that permission. For code simplicity, ROOT can only add one manager.
    // The manager (that ROOT chooses to become the first manager) will have all of the following capabilities:
    // canAddRemove - add or remove other managers.
    // canFreeze - can freeze the permission.
    // canGrantRevoke - can grant and revoke other people for this permission.
    // 3. Once (2) is done, ROOT can no longer add any managers on the permission and it's that first manager that can
    // add other managers since that first manager has canAddRemove capability. Note that this manager(while adding other managers)
    // can decide what capabilities to add the managers - either with only one capability or two or all three, but to repeat,
    // first manager that ROOT added automatically gains all of the three capabilities.
    // 4. In this code, when ROOT adds the first manager, ROOT can also pass addresses of "whos" who will be granted this permission.
    // Though we can think about whether this is a good way. Maybe better way would be that ROOT can only add a manager and
    // then manager is the one that can grant/revoke. Up to discussion.
    // 5. Note that it's possible that manager is added on the permission but no one yet has been granted the this permission -
    // this could currently happen in this below code as when root adds first manager, _whos[] can be empty so no one
    // will be granted the permission yet. In such case, it's important to ask: when should we make it such that permission
    // becomes "registered" ? One way would be to always do it in `_grant` function such as adding the following code in it:
    // if(!role.isInitialized) {
    //     role.isInitialized = true;
    // }
    // Another way is (as I currently have written) to have `registerPermission` function that can only be called by
    // the manager of canAddRemove capability. This way, even if multiple people have been granted the permission, it can
    // still be NOT registered in which case dao.execute won't start applying. Once manager calls `registerPermission`, dao
    // will start applying this check. Which way do you prefer ?
    // 6. One important aspect of this solution is that old type of permissions continue working the same way: if you want
    // to grant UPDATE_PERMISSION_ID, just pass the hash of this the same way in grant, but if you want to grant new type
    // of permission(which needs "bytes4 selector" to be passed), you still have to pass bytes32 in the same grant function.
    // Though, what you actually need to pass is keccak256(bytes4(selector)). This is to avoid multiple functions to not make
    // PM complicated.
    // 7. This solution doesn't have "timestamps" which would help us activate the permission when specific time has been passed.
    // example of this is assume that you wanna grant the permission to Sarkawt, but he should only be able to call the function
    // after "x" amount of time and not right away. The reason this solution doesn't have this is to not bring extra structure
    // in storage where we would store the "since". The whole idea of this solution is to use
    //  the same structure of "permissionsHashed"(see this in storage above). If we also wanted to have "since", instead of
    // storing members for new type of permissions in "permissionsHashed", we would need to store them in separate state.

    // The different approach would be to store the new type of permissions not in "permissionsHashed", but in different
    // structure/state. So basically, from now on, when grant would be called, it would store these things in the new structure
    // but for sure, all permissions that are already in permissionsHashed(since old daos already have current permissions granted),
    // we should always fall back for the old structure - i.e we first check if permission is in new one, if not, check in old one.
    // In this approach, we can have "since/timestamp" functionality as all permissions granted after the upgrade would already be
    // stored in the new one that contains "since" as well.

    // In combination with PSP: we need to always allow calling applyMultiTargetPermissions because it's called by PSP
    // and saying that it can not be called because PSP is not a manager is madness.

    // TODO: we only grant in this function with NO condition. If we also want to allow conditions,
    // another parameter of Condition[] is needed. Is it worth it ?
    function createPermission(
        address _where,
        bytes32 _permissionIdOrSelector,
        address _manager,
        address[] calldata _whos
    ) external auth(ROOT_PERMISSION_ID) {
        Permission storage permission = permissions[roleHash(_where, _permissionIdOrSelector)];
        if (role.created) {
            revert RoleAlreadyCreated();
        }

        role.created = true;

        // Give the very first manager all capabilities.
        Option[] memory options = new Option[](3);
        options[0] = Option.canAddRemove;
        options[1] = Option.canFreeze;
        options[2] = Option.canGrantRevoke;

        permission.managers[_manager].option = combinePermissions(_options);

        // If whos.length is > 0, we still don't make the role registered, because if we do so, it brings confusion. 
        // Let's say we register the role here. Now assume _whos.length is > 0, so it registers the role immediatelly. What if
        // _whos.length is == 0, then we don't make the role registered and when someone calls _grant, they would also need to
        // call registerPermission. So basically, sometimes no need to call registerpermission and sometimes need to call it ?
        // In order to avoid ambiguity, let's always make it necessary to call registerPermission.
        // but this also has problems. ROOT mightn't call registerPermission and still pass whos.length > 0. In this case,
        // people will be granted the permission, but role won't be registered and manager will decide when to activate it.
        // what if manager is a kind of malicious guy and waits for the very specific time when to make it registered ? since
        // people are already granted, they automatically will be able to start calling, but manager can anyways do that even if
        // roles are not granted yet and at any time, grant them and activate immediatelly. So all good.
        if (_whos.length > 0) {
            for (uint256 i = 0; i < _whos.length; i++) {
                _grant(_where, _whos[i], _permissionIdOrSelector);
            }
        }

        assembly {
            tstore(_permissionIdOrSelector, true);
        }
    }

    function addManager(
        address _where,
        bytes32 _permissionIdOrSelector,
        address _manager,
        Option[] calldata _options
    ) external {
        if (_manager == address(0)) {
            revert NotPossible();
        }

        Permission storage permission = permissions[roleHash(_where, _permissionIdOrSelector)];

        if (permission.isFrozen) {
            revert NotPossible();
        }

        if (!hasPermission(permission.managers[msg.sender].option, Option.canAddRemove)) {
            revert NotPossible();
        }

        permission.managers[_manager].option = combinePermissions(_options[i]);
    }

    function removeManager(
        address _where,
        bytes32 _permissionIdOrSelector,
        address _manager
    ) external {
        if (_manager == address(0)) {
            revert NotPossible();
        }

        Permission storage permission = permissions[roleHash(_where, _permissionIdOrSelector)];

        // Role has been frozen, so nobody can do anything on it.
        if (_permission.isFrozen) {
            revert NotPossible();
        }

        if (!hasPermission(_permission.managers[msg.sender].option, option.canAddRemove)) {
            revert NotPossible();
        }

        _permission.managers[_manager].option = Option.NONE;
    }

    function registerPermission(address _where, bytes32 _permissionSelector) public {
        Permission storage permission = permissions[roleHash(_where, _selector)];
        
        bool isTrue;
        assembly {
            isTrue := tload(_permissionSelector)
        }
        if(!isTrue) {
            if (!hasPermission(_permission.managers[msg.sender].option, option.canAddRemove)) {
                revert NotPossible();
            }
        }

        if (!role.isInitialized) {
            role.isInitialized = true;
        }
    }

    function isFunctionCallsAllowed(
        address _who,
        address[] calldata _targets,
        bytes4[] calldata _selectors
    ) view returns (bool) {
        if (_targets.length != _selectors.length) {
            revert NotPossible();
        }

        for (uint256 i = 0; i < _targets.length; i++) {
            bytes32 hash = keccak256(abi.encode(_targets[i], _selectors[i]));

            if (roles[hash].isInitialized && !roles[hash].members[_who]) {
                return false;
            }
        }

        return true;
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
    ) external virtual onlyPermissionManager(_where, _permissionId) {
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
    ) external virtual onlyPermissionManager(_where, _permissionId) {
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
    ) external virtual onlyPermissionManager(_where, _permissionId) {
        _revoke({_where: _where, _who: _who, _permissionId: _permissionId});
    }

    /// @notice Applies an array of permission operations on a single target contracts `_where`.
    /// @param _where The address of the single target contract.
    /// @param items The array of single-targeted permission operations to apply.
    function applySingleTargetPermissions(
        address _where,
        PermissionLib.SingleTargetPermission[] calldata items
    ) external virtual auth(ROOT_PERMISSION_ID) {
        for (uint256 i; i < items.length; ) {
            PermissionLib.SingleTargetPermission memory item = items[i];

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

    1. If manager is already set on a permissionX and psp is trying to grant permissionX, should we allow it ? 
         If we allow it - manager might be confused.
         If we don't allow it, then plugin installation will become useless as it will fail.
    // 2. If manager is not set yet on a permission and psp is the one that grants that permission, then grant would succeed, 
    // but no manager would be present.


    /// @notice Applies an array of permission operations on multiple target contracts `items[i].where`.
    /// @param _items The array of multi-targeted permission operations to apply.
    function applyMultiTargetPermissions(
        PermissionLib.MultiTargetPermission[] calldata _items
    ) external virtual auth(ROOT_PERMISSION_ID) {
        for (uint256 i; i < _items.length; ) {
            PermissionLib.MultiTargetPermission memory item = _items[i];

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
    function roleHash(
        address _where,
        bytes32 _permissionId
    ) internal pure virtual returns (bytes32) {
        return keccak256(abi.encodePacked("ROLE_PERMISSION_ID", _where, _permissionId));
    }

    function combinePermissions(Option[] memory _options) public pure returns (uint8) {
        uint8 combined = 0;
        for (uint i = 0; i < _options.length; i++) {
            combined |= uint8(1 << uint8(_options[i]));
        }
        return combined;
    }

    function hasPermission(uint8 userPermissions, Option permission) public pure returns (bool) {
        return (userPermissions & uint8(1 << uint8(permission))) != 0;
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
