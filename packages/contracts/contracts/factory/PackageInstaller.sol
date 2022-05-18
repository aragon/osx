/*
 * SPDX-License-Identifier:    MIT
 */

/*
    DIRTY CONTRACT - should not be used in production, this is for POC purpose only
*/

pragma solidity 0.8.10;

import "../APM/IPackage.sol";
import "./../core/DAO.sol";

contract PackageInstaller {
    address public tokenFactory;

    /**
    NOTE: better aproach might be to have a permission ops like:

    struct PermissionOp {
        PermissionType permissionType;
        bytes32[] roles;
        address where;
        address who;
    }

    to be used inside Packages like:

    struct Package {
        address factoryAddress; // package deployer (factory) address, hopefully from APM
        PermissionOp[] PermissionOps; 
        bytes args; // pre-determined value for stting up the package
    }

    for futher improvment and relationship between apps, utilizing AppArray and indexes

     */
    struct Package {
        bool isNewTokenNeeded;
        address factoryAddress; // package deployer (factory) address, hopefully from APM
        bytes32[] PackagePermissions; // to be granted to DAO
        bytes32[] DAOPermissions; // Dao permission to be granted to package like: exec_role
        bytes args; // pre-determined value for stting up the package
    }

    event PackageInstalled(address indexed dao, address indexed packageAddress);

    error NoRootRole();

    constructor(address _tokenFactory) {
        tokenFactory = _tokenFactory;
    }

    function installPckagesOnExistingDAO(DAO dao, Package[] calldata packages) external {
        if (dao.hasPermission(address(this), address(dao), dao.ROOT_ROLE(), bytes("0x00"))) revert NoRootRole();
        for (uint256 i = 0; i < packages.length; i++) {
            installPackage(dao, packages[i]);
        }
        dao.revoke(address(dao), address(this), dao.ROOT_ROLE());
    }

    function installPackage(DAO dao, Package calldata packages) internal returns (address app) {
        // revoke root from TokenFactory
        if (packages.isNewTokenNeeded) {
            dao.grant(address(dao), address(tokenFactory), dao.ROOT_ROLE());
        }

        // deploy new packaes for Dao
        app = IPackage(packages.factoryAddress).deploy(address(dao), packages.args);

        // revoke root from TokenFactory
        if (packages.isNewTokenNeeded) {
            dao.revoke(address(dao), address(tokenFactory), dao.ROOT_ROLE());
        }

        // Grant dao the necessary permissions on the package
        ACLData.BulkItem[] memory packageItems = new ACLData.BulkItem[](packages.PackagePermissions.length);
        for (uint256 i = 0; i < packages.PackagePermissions.length; i++) {
            packageItems[i] = ACLData.BulkItem(ACLData.BulkOp.Grant, packages.PackagePermissions[i], address(dao));
        }
        dao.bulk(app, packageItems);

        // Grant Package the necessary permissions on the DAO
        ACLData.BulkItem[] memory daoItems = new ACLData.BulkItem[](packages.DAOPermissions.length);
        for (uint256 i = 0; i < packages.DAOPermissions.length; i++) {
            daoItems[i] = ACLData.BulkItem(ACLData.BulkOp.Grant, packages.DAOPermissions[i], app);
        }
        dao.bulk(address(dao), daoItems);

        emit PackageInstalled(address(dao), address(app));
    }
}
