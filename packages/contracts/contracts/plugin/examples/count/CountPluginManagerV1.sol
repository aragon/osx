// SPDX-License-Identifier:    MIT
 
pragma solidity 0.8.10;

import "../PluginManager.sol";
import "./MultiplyHelper.sol";
import "./CountV1.sol";

contract CountPluginManagerV1 is PluginManager {
    
    MultiplyHelper public multiplyHelperBase;
    Count public countBase;
    
    constructor() {
        multiplyHelperBase = new MultiplyHelper();
        countBase = new Count();
    }

    function deploy(
        address dao, 
        bytes memory data
    ) 
    external 
    virtual
    override
    returns(bytes memory init, address[] relatedContracts) {
        (address _multiplyHelper, uint num) = abi.decode(data, [address, uint]);

        if(_multiplyHelper != address(0)) {
            multiplyHelper = createProxy(dao, multiplyHelperBase, "0x");
        }

        init = abi.encodeWithSelector(bytes4("function initialize(address))", multiplyHelper));
        relatedContracts.push(multiplyHelper);
    }


    // TODO: WOULD THIS NEED dao as well to be passed
    function getInstallPermissions(bytes memory data) external view virtual returns(Permissions[], string[]) {
        (address _multiplyHelper, ) = abi.decode(data, [address]);

        Permissions[] memory permissions;

        // Allows plugin Count to call execute on DAO
        permissions.push(createPermission(
            BulkPermissionsLib.Grant,
            DAO_PLACEHOLDER,
            PLUGIN_PLACEHOLDER,
            address(0),
            keccak256("EXEC_PERMISSION");
        ));

        // Allows DAO to call Multiply on plugin Count
        permissions.push(createPermission(
            BulkPermissionsLib.Grant,
            PLUGIN_PLACEHOLDER,
            DAO_PLACEHOLDER,
            address(0),
            countBase.MULTIPLY_PERMISSION_ID()
        ));

        // MultiplyHelper could be something that dev already has it from outside
        // which mightn't be a aragon plugin. It's dev's responsibility to do checks
        // and risk whether or not to still set the permission.
        if(_multiplyHelper == address(0)) {
            // Allows Count plugin to call MultiplyHelper's multiply function.
            permissions.push(createPermission(
                BulkPermissionsLib.Grant,
                0, // Index from relatedContracts (multiplyHelper)
                PLUGIN_PLACEHOLDER,
                address(0),
                multiplyHelperBase.MULTIPLY_PERMISSION_ID()
            ))
        }

        return (permissions, ["MultiplyHelper"]);
    }


    function getBaseAddress() external virtual override view returns(address) {
        return countBase;
    }

    function deployABI() external virtual override view returns (string memory) {
        return "(address multiplyHelper, uint num)";
    }

}