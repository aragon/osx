// SPDX-License-Identifier:    MIT
 
pragma solidity 0.8.10;

import "../utils/PluginERC1967Proxy.sol";
import "../core/permission/BulkPermissionsLib.sol";
import "./PluginConstants.sol";

/// @notice Abstract Plugin Factory that dev's have to inherit from for their factories.
abstract contract PluginManager is PluginConstants {

    struct Permissions {
        BulkPermissionsLib.Operation op;
        uint where; // index from relatedContracts or the actual address
        bool isWhereAddres; // whether or not `where` is index from relatedContracts or address directly.
        uint who; // index from relatedContracts or the actual address
        bool isWhoAddress; // whether or not `who` is index from relatedContracts or address directly.
        address oracle;
        bytes32 role;
    }
    
    /// @notice creates Permission struct
    /// @param op Whether grants, revokes, freezes...
    /// @param where index from the dev's deployed addresses array where permission will be set.
    /// @param who index from the dev's deployed addresses array
    /// @param role role that will be set
    /// @return Permission The final permission struct
    function createPermission(
        BulkPermissionsLib.Operation op, 
        uint256 where, 
        uint256 who,
        address oracle,
        bytes32 role
    ) internal returns (Permission) {
        return Permissions(Op, where, false, who, false, oracle, role);
    }

    /// @notice creates Permission struct
    /// @param op Whether grants, revokes, freezes...
    /// @param where Address where permission will be granted.
    /// @param who Address who will have the permission.
    /// @param role role that will be set
    /// @return Permission The final permission struct
    function createPermission(
        BulkPermissionsLib.Operation op, 
        address where, 
        address who,
        address oracle, 
        bytes32 role
    ) internal returns (Permission) {
        return Permissions(Op, uint(where), true, uint(who), true, oracle, role);
    }

    /// @notice creates Permission struct
    /// @param op Whether grants, revokes, freezes...
    /// @param where index from the dev's deployed addresses array where permission will be set.
    /// @param who Address who will have the permission.
    /// @param role role that will be set
    /// @return Permission The final permission struct
    function createPermission(
        BulkPermissionsLib.Operation op, 
        uint256 where, 
        address who,
        address oracle,
        bytes32 role
    ) internal returns (Permission) {
        return Permissions(Op, where, false, uint(who), true, oracle, role);
    }

    /// @notice creates Permission struct
    /// @param op Whether grants, revokes, freezes...
    /// @param where Address who will have the permission.
    /// @param who index from the dev's deployed addresses array that will have permission.
    /// @param role role that will be set
    /// @return Permission The final permission struct
    function createPermission(
        BulkPermissionsLib.Operation op, 
        address where, 
        uint256 who,
        address oracle,
        bytes32 role
    ) internal returns (Permission) {
        return Permissions(Op, uint(where), true, who, false, oracle, role);
    }

    /// @notice helper function to deploy Custom ERC1967Proxy that includes dao slot on it.
    /// @param _dao dao address
    /// @param logic the base contract address proxy has to delegate calls to.
    /// @param init the initialization data(function selector + encoded data)
    /// @return address of the proxy.
    function createProxy(address dao, address logic, bytes memory init) internal returns(address) {
        return address(new PluginERC1967Proxy(_dao, logic, init));
    }

    /// @notice the function dev has to override/implement for the plugin deployment.
    /// @param dao dao address where plugin will be installed to in the end.
    /// @param data the ABI encoded data that deploy needs for its work.
    /// @return init the initialization data that will be called right after proxy deployment(selector + encoded data)
    /// @return relatedContracts array of helper contract addresses that dev deploys beforehand the plugin.
    function deploy(
        address dao, 
        bytes memory data
    ) external virtual returns(bytes memory init, address[] relatedContracts);
    
    /// @notice the function dev has to override/implement for the plugin update.
    /// @param oldVersion the version plugin is updating from.
    /// @param newVersion the version plugin is updating to.
    /// @param updateInitData data that contains ABI encoded parameters that will be passed to initialization function for the update(if any).
    /// @param data the other data that deploy needs.
    /// @return init the initialization data that will be called right after proxy update(selector + encoded data)
    /// @return relatedContracts array of helper contract addresses that dev deploys to do some work before plugin update.
    function update(
        uint16[3] oldVersion, 
        uint16[3] newVersion, 
        bytes memory updateInitData, 
        bytes memory data
    ) external virtual returns(bytes memory init, address[] relatedContracts) {}

    /// @notice the plugin's base address proxies need to delegate calls.
    /// @return address of the base contract address.
    function getBaseAddress() external virtual view returns(address);

    /// @notice the ABI in string format that deploy function needs to use.
    /// @return ABI in string format.
    function deployABI() external virtual view returns (string memory);

    /// @notice The ABI in string format that update function needs to use.
    /// @dev Not required to be overriden as there might be no update at all by dev.
    /// @return ABI in string format.
    function updateABI() external virtual view returns (string memory) {}

    /// @notice The ABI in string format that initialization function needs right after update.
    /// @dev Not required to be overriden as there might be no update at all by dev.
    ///      Dev can choose 2 different ways how to handle this.
    ///      1. Each time new update comes in, dev appends the new ABI to the old one
    ///      2. Depending on versions, dev returns specific ABI
    /// @param oldVersion the version plugin is updating from.
    /// @param newVersion the version plugin is updating to.
    /// @return ABI in string format.
    function updateInitABI(uint16[3] oldVersion, uint16[3] newVersion) external virtual view returns (string memory) {}

    /// @notice the view function called by UI to detect the permissions that will be applied before installing the plugin.
    /// @dev This corresponds to the permissions for installing the plugin.
    /// @param data the exact same data that is passed to the deploy function.
    /// @return Permissions the permissions struct array that contain all the permissions that should be set.
    /// @return array of strings(names of helper contracts). This corresponds to the relatedContracts.
    function getInstallPermissions(bytes memory data) external view virtual returns(Permissions[], string[]);

    /// @notice the view function called by UI to detect the permissions that will be applied before updating the plugin.
    /// @dev This corresponds to the permissions for updating the plugin.
    /// @param oldVersion the version plugin is updating from.
    /// @param newVersion the version plugin is updating to.
    /// @param updateInitData data that contains ABI encoded parameters that will be passed to initialization function for the update(if any).
    /// @param data the exact same data that is passed to the update function.
    /// @return Permissions the permissions struct array that contain all the permissions that should be set.
    /// @return array of strings(names of helper contracts). This corresponds to the relatedContracts.
    function getUpdatePermissions(
        uint16[3] oldVersion, 
        uint16[3] newVersion, 
        bytes memory updateInitData, 
        bytes memory data
    ) external virtual returns(Permissions, string[]) {}
}