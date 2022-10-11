// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {Permission, PluginSetup} from "../../PluginSetup.sol";
import {MultiplyHelper} from "./MultiplyHelper.sol";
import {CounterV1} from "./CounterV1.sol";

contract CounterV1PluginSetup is PluginSetup {
    using Clones for address;

    bytes32 public constant MULTIPLY_PERMISSION_ID =
        0x293ab483515bb2dc32ac9b2dfb9c39ee4ea5571530c34de9864c3e5fa9ce787d;
    
    CounterV1 public counterBase;
    
    address private constant NO_ORACLE = address(0);

    constructor() {
        counterBase = new CounterV1();
    }

    function prepareInstallDataABI() external view virtual override returns (string memory) {
        return "(address multiplyHelper, uint num)";
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
            multiplyHelper = address(new MultiplyHelper(_dao)); 
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
            keccak256("EXECUTE_PERMISSION")
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
                MULTIPLY_PERMISSION_ID
            );
        }

        // add helpers
        helpers[0] = multiplyHelper;

        return (plugin, helpers, permissions);
    }

    function prepareUninstallDataABI() external view virtual override returns (string memory) {
        return "";
    }

    function prepareUninstallation(
        address _dao,
        address _plugin,
        address[] calldata _activeHelpers,
        bytes calldata
    ) external virtual override returns (Permission.ItemMultiTarget[] memory permissions) {
        permissions = new Permission.ItemMultiTarget[](_activeHelpers.length != 0 ? 3 : 2);

        // set permissions
        permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Revoke,
            _dao,
            _plugin,
            NO_ORACLE,
            keccak256("EXECUTE_PERMISSION")
        );

        permissions[1] = Permission.ItemMultiTarget(
            Permission.Operation.Revoke,
            _plugin,
            _dao,
            NO_ORACLE,
            counterBase.MULTIPLY_PERMISSION_ID()
        );

        if (_activeHelpers.length != 0) {
            permissions[2] = Permission.ItemMultiTarget(
                Permission.Operation.Revoke,
                _activeHelpers[0],
                _plugin,
                NO_ORACLE,
                MULTIPLY_PERMISSION_ID
            );
        }
    }

    function getImplementationAddress() external view virtual override returns (address) {
        return address(counterBase);
    }
}
