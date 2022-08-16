// SPDX-License-Identifier:    MIT

pragma solidity 0.8.10;

import "../../PluginManager.sol";
import "./MultiplyHelper.sol";
import "./CounterV1.sol";

contract CounterV1PluginManager is PluginManager {
    
    MultiplyHelper private multiplyHelperBase;
    CounterV1 private counterBase;

    address private constant NO_ORACLE = address(0);

    constructor() {
        multiplyHelperBase = new MultiplyHelper();
        counterBase = new CounterV1();
    }

    function deploy(address dao, bytes memory data)
        external
        virtual
        override
        returns (address plugin, address[] memory relatedContracts)
    {
        // Decode the parameters from the UI
        (address _multiplyHelper, uint256 _num) = abi.decode(data, (address, uint256));

        // Allocate space for one address for the helper contracts for which we
        // also want to define permissions
        relatedContracts = new address[](1);

        if (_multiplyHelper == address(0)) {
            // Deploy some internal helper contract for the Plugin
            _multiplyHelper = createProxy(dao, address(multiplyHelperBase), "0x");
        }

        // Encode the parameters that will be passed to initialize() on the Plugin
        bytes memory initData = abi.encodeWithSelector(
            bytes4(keccak256("function initialize(address,uint256))")),
            _multiplyHelper,
            _num
        );

        // Address of the helper so that PluginInstaller can grant the requested permissions on it
        relatedContracts[0] = _multiplyHelper;

        // Deploy the Plugin itself, make it point to the implementation and
        // pass it the initialization params
        plugin = createProxy(dao, getImplementationAddress(), initData);
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
            NO_ORACLE,
            keccak256("EXEC_PERMISSION")
        );

        // Allows DAO to call Multiply on plugin Count
        permissions[1] = createPermission(
            BulkPermissionsLib.Operation.Grant,
            PLUGIN_PLACEHOLDER,
            DAO_PLACEHOLDER,
            NO_ORACLE,
            counterBase.MULTIPLY_PERMISSION_ID()
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
                NO_ORACLE,
                multiplyHelperBase.MULTIPLY_PERMISSION_ID()
            );
        }

        helperNames[0] = "MultiplyHelper";
    }

    function getImplementationAddress() public view virtual override returns (address) {
        return address(counterBase);
    }

    function deployABI() external view virtual override returns (string memory) {
        return "(address multiplyHelper, uint num)";
    }
}
