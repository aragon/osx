// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import { Permission, PluginManager } from "../../PluginManager.sol";
import "./MultiplyHelper.sol";
import "./CounterV2.sol";

contract CounterV2PluginManager is PluginManager {
    
    MultiplyHelper private multiplyHelperBase;
    CounterV2 private counterBase;

    address private constant NO_ORACLE = address(0);

    // MultiplyHelper doesn't change. so dev decides to pass the old one.
    constructor(MultiplyHelper _helper) {
        multiplyHelperBase = _helper;
        counterBase = new CounterV2();
    }

    function deploy(address dao, bytes memory data)
        external
        virtual
        override
        returns (address plugin, Permission.ItemMultiTarget[] memory permissions)
    {
        // This changes as in V2, initialize now expects 3 arguments..
        // Decode the parameters from the UI
        (address _multiplyHelper, uint256 _num, uint256 _newVariable) = abi.decode(
            data,
            (address, uint256, uint256)
        );

       // Allocate space for requested permission that will be applied on this plugin installation.
        permissions = new Permission.ItemMultiTarget[](_multiplyHelper == address(0) ? 2 : 3);
        
        if (_multiplyHelper == address(0)) {
            _multiplyHelper = createProxy(dao, address(multiplyHelperBase), "0x");
        }

        // Encode the parameters that will be passed to initialize() on the Plugin
        bytes memory initData = abi.encodeWithSelector(
            bytes4(keccak256("initialize(address,uint256)")),
            _multiplyHelper,
            _num,
            _newVariable
        );

        // Deploy the Plugin itself, make it point to the implementation and
        // pass it the initialization params
        plugin = createProxy(dao, getImplementationAddress(), initData);

        // Allows plugin Count to call execute on DAO
        permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            dao,
            plugin,
            NO_ORACLE,
            keccak256("EXEC_PERMISSION")
        );

        // Allows DAO to call Multiply on plugin Count
        permissions[1] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            plugin,
            dao,
            NO_ORACLE,
            counterBase.MULTIPLY_PERMISSION_ID()
        );

        // MultiplyHelper could be something that dev already has it from outside
        // which mightn't be a aragon plugin. It's dev's responsibility to do checks
        // and risk whether or not to still set the permission.
        if (_multiplyHelper == address(0)) {
            // Allows Count plugin to call MultiplyHelper's multiply function.
            permissions[2] = Permission.ItemMultiTarget(
                Permission.Operation.Grant,
                _multiplyHelper,
                plugin,
                NO_ORACLE,
                multiplyHelperBase.MULTIPLY_PERMISSION_ID()
            );
        }
    }

    // TODO: Add some advanced code for update permissions
    function update(
        address dao,
        address proxy,
        uint16[3] calldata oldVersion,
        bytes memory data
    ) external virtual override returns (Permission.ItemMultiTarget[] memory permissions) {
        uint256 _newVariable;

        // TODO: improve the example to handle more complicated scenario...
        if (oldVersion[0] == 1) {
            (_newVariable) = abi.decode(data, (uint256));
        }

        // TODO: Shall we leave it here or make devs call `upgrade` from our abstract factory
        // Just a way of reinforcing...
        // TODO1: proxy needs casting to UUPSSUpgradable
        // TODO2: 2nd line needs casting to CounterV2
        // proxy.upgradeTo(getImplementationAddress());
        CounterV2(proxy).setNewVariable(_newVariable);
    }

    function getImplementationAddress() public view virtual override returns (address) {
        return address(counterBase);
    }

    function deployABI() external view virtual override returns (string memory) {
        return "(address multiplyHelper, uint num, uint newVariable)";
    }

    function updateABI() external view virtual override returns (string memory) {
        return "(address whoCanMultiply, uint _newVariable)";
    }
}
