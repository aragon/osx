// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {Permission, PluginSetup, PluginSetupProcessor} from "../../PluginSetup.sol";
import {MultiplyHelper} from "./MultiplyHelper.sol";
import {CounterV1} from "./CounterV1.sol";

contract CounterV1PluginSetup is PluginSetup {
    using Clones for address;

    // For testing purposes, the below are public...
    MultiplyHelper public multiplyHelperBase;
    CounterV1 public counterBase;

    address private constant NO_ORACLE = address(0);

    constructor() {
        multiplyHelperBase = new MultiplyHelper();
        counterBase = new CounterV1();
    }

    function prepareInstallDataABI() external view virtual override returns (string memory) {
        return "(address multiplyHelper, uint num)";
    }

    function prepareInstallation(address _dao, bytes memory _data)
        external
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
            keccak256("EXECUTE_PERMISSION")
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

    function prepareUninstallDataABI() external view virtual override returns (string memory) {
        return "";
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
            keccak256("EXECUTE_PERMISSION")
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
}
