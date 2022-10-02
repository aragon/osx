// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {Permission, PluginSetup, PluginSetupProcessor} from "../../PluginSetup.sol";
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
        public
        virtual
        override
        returns (PluginSetupProcessor.PluginInstallParams memory params)
    {
        // Decode the parameters from the UI
        (address _multiplyHelper, uint256 _num) = abi.decode(_data, (address, uint256));

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

        params.permissions = new Permission.ItemMultiTarget[](
            _multiplyHelper == address(0) ? 3 : 2
        );
        params.helpers = new address[](1);

        // deploy
        params.plugin = createERC1967Proxy(_dao, address(counterBase), initData);

        // set permissions
        params.permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            _dao,
            params.plugin,
            NO_ORACLE,
            keccak256("EXEC_PERMISSION")
        );

        params.permissions[1] = Permission.ItemMultiTarget(
            Permission.Operation.Grant,
            params.plugin,
            _dao,
            NO_ORACLE,
            counterBase.MULTIPLY_PERMISSION_ID()
        );

        if (_multiplyHelper == address(0)) {
            params.permissions[2] = Permission.ItemMultiTarget(
                Permission.Operation.Grant,
                multiplyHelper,
                params.plugin,
                NO_ORACLE,
                multiplyHelperBase.MULTIPLY_PERMISSION_ID()
            );
        }

        // add helpers
        params.helpers[0] = multiplyHelper;
    }

    function prepareUpdate(
        address _dao,
        address _plugin, // proxy
        address[] memory _helpers,
        uint16[3] calldata _oldVersion,
        bytes memory _data
    ) external virtual override returns (PluginSetupProcessor.PluginUpdateParams memory params) {
        uint256 _newVariable;

        if (_oldVersion[0] == 1 && _oldVersion[1] == 0) {
            (_newVariable) = abi.decode(_data, (uint256));
            params.initData = abi.encodeWithSelector(
                bytes4(keccak256("setNewVariable(uint256)")),
                _newVariable
            );
        }

        params.permissions = new Permission.ItemMultiTarget[](1);
        params.permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Revoke,
            _dao,
            _plugin,
            NO_ORACLE,
            multiplyHelperBase.MULTIPLY_PERMISSION_ID()
        );

        // if another helper is deployed, put it inside activeHelpers + put old ones as well.
        params.newHelpers = new address[](1);
        params.newHelpers[0] = _helpers[0];
    }

    function prepareUninstallation(
        address _dao,
        address _plugin,
        address[] calldata _activeHelpers,
        bytes calldata
    ) external virtual override returns (PluginSetupProcessor.PluginUninstallParams memory params) {
        params.permissions = new Permission.ItemMultiTarget[](_activeHelpers.length != 0 ? 3 : 2);

        // set permissions
        params.permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Revoke,
            _dao,
            _plugin,
            NO_ORACLE,
            keccak256("EXEC_PERMISSION")
        );

        params.permissions[1] = Permission.ItemMultiTarget(
            Permission.Operation.Revoke,
            _plugin,
            _dao,
            NO_ORACLE,
            counterBase.MULTIPLY_PERMISSION_ID()
        );

        if (_activeHelpers.length != 0) {
            params.permissions[2] = Permission.ItemMultiTarget(
                Permission.Operation.Revoke,
                _activeHelpers[0],
                _plugin,
                NO_ORACLE,
                multiplyHelperBase.MULTIPLY_PERMISSION_ID()
            );
        }
    }

    function getImplementationAddress() external view virtual override returns (address) {
        return address(counterBase);
    }

    function prepareInstallDataABI() external view virtual override returns (string memory) {
        return "(address multiplyHelper, uint num, uint newVariable)";
    }

    function prepapreUpdateDataABI() external view virtual override returns (string memory) {
        return "(uint _newVariable)";
    }

    function prepapreUninstallDataABI() external view virtual override returns (string memory) {
        return "";
    }
}
