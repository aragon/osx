// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {Permission, PluginSetup} from "../../PluginSetup.sol";
import {MultiplyHelper} from "./MultiplyHelper.sol";
import "./CounterV2.sol";

contract CounterV2PluginSetup is PluginSetup {
    using Clones for address;

    // For testing purposes, the below are public...
    MultiplyHelper public multiplyHelperBase;
    CounterV2 public counterBase;

    address private constant NO_ORACLE = address(0);

    // MultiplyHelper doesn't change. so dev decides to pass the old one.
    constructor(MultiplyHelper _helper) {
        multiplyHelperBase = _helper;
        counterBase = new CounterV2();
    }

    function prepareInstallation(address _dao, bytes memory _data)
        external
        virtual
        override
        returns (
            address plugin,
            address[] memory helpers,
            Permission.ItemMultiTarget[] memory permissions
        )
    {
        // Decode the parameters from the UI
        (address _multiplyHelper, uint256 _num) = abi.decode(_data, (address, uint256));

        address multiplyHelper = _multiplyHelper;

        if (_multiplyHelper == address(0)) {
            // deploy helper without our proxy..
            multiplyHelper = address(new ERC1967Proxy(address(multiplyHelperBase), bytes("")));
        }

        bytes memory initData = abi.encodeWithSelector(
            bytes4(keccak256("initialize(address,address,uint256)")),
            _dao,
            multiplyHelper,
            _num
        );

        permissions = new Permission.ItemMultiTarget[](_multiplyHelper == address(0) ? 3 : 2);
        helpers = new address[](1);

        // deploy
        plugin = createERC1967Proxy(address(counterBase), initData);

        // set permissions
        permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            _dao,
            plugin,
            NO_ORACLE,
            keccak256("EXEC_PERMISSION")
        );

        permissions[1] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            plugin,
            _dao,
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

    function prepareUpdate(
        address dao,
        address plugin, // proxy
        address[] memory helpers,
        bytes memory data,
        uint16[3] calldata oldVersion
    )
        external
        override
        returns (
            address[] memory activeHelpers,
            bytes memory initData,
            Permission.ItemMultiTarget[] memory permissions
        )
    {
        uint256 _newVariable;

        if (oldVersion[0] == 1 && oldVersion[1] == 0) {
            (_newVariable) = abi.decode(data, (uint256));
            initData = abi.encodeWithSelector(
                bytes4(keccak256("setNewVariable(uint256)")),
                _newVariable
            );
        }

        permissions = new Permission.ItemMultiTarget[](1);
        permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Revoke,
            dao,
            plugin,
            NO_ORACLE,
            multiplyHelperBase.MULTIPLY_PERMISSION_ID()
        );

        // if another helper is deployed, put it inside activeHelpers + put old ones as well.
        activeHelpers = new address[](1);
        activeHelpers[0] = helpers[0];
    }

    function prepareUninstallation(
        address dao,
        address plugin,
        address[] calldata activeHelpers
    ) external virtual override returns (Permission.ItemMultiTarget[] memory permissions) {
        permissions = new Permission.ItemMultiTarget[](activeHelpers.length != 0 ? 3 : 2);

        // set permissions
        permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Revoke,
            dao,
            plugin,
            NO_ORACLE,
            keccak256("EXEC_PERMISSION")
        );

        permissions[1] = Permission.ItemMultiTarget(
            Permission.Operation.Revoke,
            plugin,
            dao,
            NO_ORACLE,
            counterBase.MULTIPLY_PERMISSION_ID()
        );

        if (activeHelpers.length != 0) {
            permissions[2] = Permission.ItemMultiTarget(
                Permission.Operation.Revoke,
                activeHelpers[0],
                plugin,
                NO_ORACLE,
                multiplyHelperBase.MULTIPLY_PERMISSION_ID()
            );
        }
    }

    function getImplementationAddress() external view virtual override returns (address) {
        return address(counterBase);
    }

    function prepareInstallABI() external view virtual override returns (string memory) {
        return "(address multiplyHelper, uint num, uint newVariable)";
    }

    function prepapreUpdateABI() external view virtual override returns (string memory) {
        return "(uint _newVariable)";
    }
}
