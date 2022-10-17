// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {PermissionLib} from "../../../core/permission/PermissionLib.sol";
import {PluginSetup} from "../../PluginSetup.sol";
import {MultiplyHelper} from "./MultiplyHelper.sol";
import {CounterV1} from "./CounterV1.sol";

/// @title CounterV1PluginSetup
/// @author Aragon Association - 2022
/// @notice The setup contract of the `CounterV1` plugin.
contract CounterV1PluginSetup is PluginSetup {
    using Clones for address;

    // For testing purposes, the below are public...
    MultiplyHelper public multiplyHelperBase;
    CounterV1 public counterBase;

    address private noOracle;

    constructor() {
        multiplyHelperBase = new MultiplyHelper();
        counterBase = new CounterV1();
    }

    /// @inheritdoc PluginSetup
    function prepareInstallationDataABI() external view virtual override returns (string memory) {
        return "(address multiplyHelper, uint num)";
    }

    /// @inheritdoc PluginSetup
    function prepareInstallation(address _dao, bytes memory _data)
        external
        virtual
        override
        returns (
            address plugin,
            address[] memory helpers,
            PermissionLib.ItemMultiTarget[] memory permissions
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

        permissions = new PermissionLib.ItemMultiTarget[](_multiplyHelper == address(0) ? 3 : 2);
        helpers = new address[](1);

        // deploy
        plugin = createERC1967Proxy(address(counterBase), initData);

        // set permissions
        permissions[0] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Grant,
            _dao,
            plugin,
            noOracle,
            keccak256("EXECUTE_PERMISSION")
        );

        permissions[1] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Grant,
            plugin,
            _dao,
            noOracle,
            counterBase.MULTIPLY_PERMISSION_ID()
        );

        if (_multiplyHelper == address(0)) {
            permissions[2] = PermissionLib.ItemMultiTarget(
                PermissionLib.Operation.Grant,
                multiplyHelper,
                plugin,
                noOracle,
                multiplyHelperBase.MULTIPLY_PERMISSION_ID()
            );
        }

        // add helpers
        helpers[0] = multiplyHelper;

        return (plugin, helpers, permissions);
    }

    /// @inheritdoc PluginSetup
    function prepareUninstallationDataABI() external view virtual override returns (string memory) {
        return "";
    }

    /// @inheritdoc PluginSetup
    function prepareUninstallation(
        address _dao,
        address _plugin,
        address[] calldata _activeHelpers,
        bytes calldata
    ) external virtual override returns (PermissionLib.ItemMultiTarget[] memory permissions) {
        permissions = new PermissionLib.ItemMultiTarget[](_activeHelpers.length != 0 ? 3 : 2);

        // set permissions
        permissions[0] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _dao,
            _plugin,
            noOracle,
            keccak256("EXECUTE_PERMISSION")
        );

        permissions[1] = PermissionLib.ItemMultiTarget(
            PermissionLib.Operation.Revoke,
            _plugin,
            _dao,
            noOracle,
            counterBase.MULTIPLY_PERMISSION_ID()
        );

        if (_activeHelpers.length != 0) {
            permissions[2] = PermissionLib.ItemMultiTarget(
                PermissionLib.Operation.Revoke,
                _activeHelpers[0],
                _plugin,
                noOracle,
                multiplyHelperBase.MULTIPLY_PERMISSION_ID()
            );
        }
    }

    /// @inheritdoc PluginSetup
    function getImplementationAddress() external view virtual override returns (address) {
        return address(counterBase);
    }
}
