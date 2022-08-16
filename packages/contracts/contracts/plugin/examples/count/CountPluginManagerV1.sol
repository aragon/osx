// SPDX-License-Identifier:    MIT

pragma solidity 0.8.10;

import "../../PluginManager.sol";
import "./MultiplyHelper.sol";
import "./CountV1.sol";

contract CountPluginManagerV1 is PluginManager {
    MultiplyHelper public multiplyHelperBase;
    CountV1 public countBase;

    constructor() {
        multiplyHelperBase = new MultiplyHelper();
        countBase = new CountV1();
    }

    function deploy(address dao, bytes memory data)
        external
        virtual
        override
        returns (address plugin, address[] memory relatedContracts)
    {
        (address _multiplyHelper, uint256 _num) = abi.decode(data, (address, uint256));

        relatedContracts = new address[](1);

        if (_multiplyHelper == address(0)) {
            _multiplyHelper = createProxy(dao, address(multiplyHelperBase), "0x");
        }

        bytes memory init = abi.encodeWithSelector(
            bytes4(keccak256("function initialize(address,uint256))")),
            _multiplyHelper,
            _num
        );

        relatedContracts[0] = _multiplyHelper;

        plugin = createProxy(dao, getImplementationAddress(), init);
    }

    // TODO: WOULD THIS NEED dao as well to be passed
    function getInstallPermissions(bytes memory data)
        external
        view
        virtual
        override
        returns (RequestedPermission[] memory permissions, string[] memory helperNames)
    {
        address _multiplyHelper = abi.decode(data, (address));

        permissions = new RequestedPermission[](_multiplyHelper == address(0) ? 2 : 3);
        helperNames = new string[](1);

        // Allows plugin Count to call execute on DAO
        permissions[0] = createPermission(
            BulkPermissionsLib.Operation.Grant,
            DAO_PLACEHOLDER,
            PLUGIN_PLACEHOLDER,
            address(0),
            keccak256("EXEC_PERMISSION")
        );

        // Allows DAO to call Multiply on plugin Count
        permissions[1] = createPermission(
            BulkPermissionsLib.Operation.Grant,
            PLUGIN_PLACEHOLDER,
            DAO_PLACEHOLDER,
            address(0),
            countBase.MULTIPLY_PERMISSION_ID()
        );

        // MultiplyHelper could be something that dev already has it from outside
        // which mightn't be a aragon plugin. It's dev's responsibility to do checks
        // and risk whether or not to still set the permission.
        if (_multiplyHelper == address(0)) {
            // Allows Count plugin to call MultiplyHelper's multiply function.
            permissions[2] = createPermission(
                BulkPermissionsLib.Operation.Grant,
                0, // Index from relatedContracts (multiplyHelper)
                PLUGIN_PLACEHOLDER,
                address(0),
                multiplyHelperBase.MULTIPLY_PERMISSION_ID()
            );
        }

        helperNames[0] = "MultiplyHelper";
    }

    function getImplementationAddress() public view virtual override returns (address) {
        return address(countBase);
    }

    function deployABI() external view virtual override returns (string memory) {
        return "(address multiplyHelper, uint num)";
    }
}
