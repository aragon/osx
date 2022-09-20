// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {Permission, PluginManager, PluginManagerLib} from "../../PluginManager.sol";
import {MultiplyHelper} from "./MultiplyHelper.sol";
import {CounterV1} from "./CounterV1.sol";

contract CounterV1PluginManager is PluginManager {
    using Clones for address;
    using PluginManagerLib for PluginManagerLib.Data;

    // For testing purposes, the below are public...
    MultiplyHelper public multiplyHelperBase;
    CounterV1 public counterBase;

    address private constant NO_ORACLE = address(0);

    constructor() {
        multiplyHelperBase = new MultiplyHelper();
        counterBase = new CounterV1();
    }

    function deploy(address dao, bytes memory data)
        public
        virtual
        override
        returns (
            address plugin,
            address[] memory helpers,
            Permission.ItemMultiTarget[] memory permissions
        )
    {
        // Decode the parameters from the UI
        (address _multiplyHelper, uint256 _num) = abi.decode(data, (address, uint256));

        address multiplyHelper = _multiplyHelper;

        if (_multiplyHelper == address(0)) {
            // deploy helper without our proxy..
            multiplyHelper = address(new ERC1967Proxy(address(multiplyHelperBase), bytes("")));
        }

        bytes memory initData = abi.encodeWithSelector(
            bytes4(keccak256("initialize(address,uint256)")),
            multiplyHelper,
            _num
        );

        permissions = new Permission.ItemMultiTarget[](_multiplyHelper == address(0) ? 3 : 2);
        helpers = new address[](1);

        // deploy
        plugin = createERC1967Proxy(dao, address(counterBase), initData);

        // set permissions
        permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            dao,
            plugin,
            NO_ORACLE,
            keccak256("EXEC_PERMISSION")
        );

        permissions[1] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            plugin,
            dao,
            NO_ORACLE,
            counterBase.MULTIPLY_PERMISSION_ID()
        );

        if (_multiplyHelper == address(0)) {
            permissions[2] = Permission.ItemMultiTarget(
                Permission.Operation.Grant,
                multiplyHelper,
                plugin,
                NO_ORACLE,
                multiplyHelperBase.MULTIPLY_PERMISSION_ID()
            );
        }

        // add helpers
        helpers[0] = multiplyHelper;

        return (plugin, helpers, permissions);
    }

    function getImplementationAddress() public view virtual override returns (address) {
        return address(counterBase);
    }

    function deployABI() external view virtual override returns (string memory) {
        return "(address multiplyHelper, uint num)";
    }
}
