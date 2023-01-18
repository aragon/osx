// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./IPermissionOracle.sol";
import "./PermissionLib.sol";

/// @title PermissionManager
/// @author Aragon Association - 2021, 2022
/// @notice The permission manager used in a DAO and its associated components.
contract PermissionManager is Initializable {
    /// @notice The ID of the permission required to call the `grant`, `grantWithOracle`, `revoke`, and `bulk` function.
    bytes32 public constant ROOT_PERMISSION_ID = keccak256("ROOT_PERMISSION");

    /// @notice A special address encoding permissions that are valid for any address.
    address internal constant ANY_ADDR = address(type(uint160).max);

    /// @notice A special address encoding if a permissions is not set and therefore not allowed.
    address internal constant UNSET_FLAG = address(0);

    /// @notice A special address encoding if a permission is allowed.
    address internal constant ALLOW_FLAG = address(2);

    /// @notice A mapping storing permissions as hashes (i.e., `permissionHash(where, who, permissionId)`) and their status (unset, allowed, or redirect to a `PermissionOracle`).
    mapping(bytes32 => address) internal permissionsHashed;

    /// @notice Thrown if a call is unauthorized.
    /// @param here The context in which the authorization reverted.
    /// @param where The contract requiring the permission.
    /// @param who The address (EOA or contract) missing the permission.
    /// @param permissionId The permission identifier.
    error Unauthorized(address here, address where, address who, bytes32 permissionId);

    /// @notice Thrown if a Root permission is set on ANY_ADDR.
    error RootPermissionForAnyAddressDisallowed();

    /// @notice Thrown if a permission has been already granted for different oracle.
    /// @dev This makes sure that oracle on the same permission can not be overwriten by a different oracle.
    /// @param where The address of the target contract to grant `who` permission to.
    /// @param who The address (EOA or contract) to which the permission has already been granted.
    /// @param permissionId The permission identifier.
    /// @param currentOracle The current oracle set for permissionId
    /// @param newOracle The new oracle it tries to set for permissionId
    error PermissionAlreadyGrantedForDifferentOracle(
        address where,
        address who,
        bytes32 permissionId,
        address currentOracle,
        address newOracle
    );

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

    /// @notice Processes bulk items on the permission manager.
    /// @dev Requires the `ROOT_PERMISSION_ID` permission.
    /// @param _where The address of the contract.
    /// @param items The array of bulk items to process.
    function bulkOnSingleTarget(address _where, PermissionLib.ItemSingleTarget[] calldata items)
        external
        auth(_where, ROOT_PERMISSION_ID)
    {
        for (uint256 i; i < items.length; ) {
            PermissionLib.ItemSingleTarget memory item = items[i];

            if (item.operation == PermissionLib.Operation.Grant) {
                _grant(_where, item.who, item.permissionId);
            } else if (item.operation == PermissionLib.Operation.Revoke) {
                _revoke(_where, item.who, item.permissionId);
            }

            unchecked {
                ++i;
            }
        }
    }

    /// @notice Processes bulk items on the permission manager.
    /// @dev Requires that msg.sender has each permissionId on the where.
    /// @param items The array of bulk items to process.
    function bulkOnMultiTarget(PermissionLib.ItemMultiTarget[] calldata items) external {
        for (uint256 i; i < items.length; ) {
            PermissionLib.ItemMultiTarget memory item = items[i];

            // TODO: Optimize
            _auth(item.where, ROOT_PERMISSION_ID);

            if (item.operation == PermissionLib.Operation.Grant) {
                _grant(item.where, item.who, item.permissionId);
            } else if (item.operation == PermissionLib.Operation.Revoke) {
                _revoke(item.where, item.who, item.permissionId);
            } else if (item.operation == PermissionLib.Operation.GrantWithOracle) {
                _grantWithOracle(
                    item.where,
                    item.who,
                    item.permissionId,
                    IPermissionOracle(item.oracle)
                );
            }

            unchecked {
                ++i;
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
        IPermissionOracle _oracle
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

        bytes32 permHash = permissionHash(_where, _who, _permissionId);

        address currentOracle = permissionsHashed[permHash];
        address newOracle = address(_oracle);

        // Means permHash is not currently set.
        if (currentOracle == UNSET_FLAG) {
            permissionsHashed[permHash] = newOracle;

            emit Granted(_permissionId, msg.sender, _where, _who, _oracle);
        } else if (currentOracle != newOracle) {
            // Revert if the permHash is already granted, but uses different oracle.
            // If we don't revert, we either should:
            //   - allow overriding the oracle on the same permission
            //     which could be confusing whoever granted the same permission first
            //   - or do nothing and succeed silently which could be confusing for the caller.
            revert PermissionAlreadyGrantedForDifferentOracle({
                where: _where,
                who: _who,
                permissionId: _permissionId,
                currentOracle: currentOracle,
                newOracle: newOracle
            });
        }
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
        bytes32 permHash = permissionHash(_where, _who, _permissionId);
        if (permissionsHashed[permHash] != UNSET_FLAG) {
            permissionsHashed[permHash] = UNSET_FLAG;

            emit Revoked(_permissionId, msg.sender, _where, _who);
        }
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
    uint256[49] private __gap;
}
