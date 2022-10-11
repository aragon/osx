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

    bytes32 public constant MULTIPLY_PERMISSION_ID =
        0x293ab483515bb2dc32ac9b2dfb9c39ee4ea5571530c34de9864c3e5fa9ce787d;
    
    CounterV2 public counterBase;

    address private constant NO_ORACLE = address(0);

    // MultiplyHelper doesn't change. so dev decides to pass the old one.
    constructor() {
        counterBase = new CounterV2();
    }

    function prepareInstallDataABI() external view virtual override returns (string memory) {
        return "(address multiplyHelper, uint num, uint newVariable)";
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
                MultiplyHelper(multiplyHelper).MULTIPLY_PERMISSION_ID()
            );
        }

        // add helpers
        helpers[0] = multiplyHelper;

        return (plugin, helpers, permissions);
    }

    function prepareUpdateDataABI() external view virtual override returns (string memory) {
        return "(uint _newVariable)";
    }

    function prepareUpdate(
        address _dao,
        address _plugin, // proxy
        address[] memory _helpers,
        uint16[3] calldata _oldVersion,
        bytes memory _data
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

        if (_oldVersion[0] == 1 && _oldVersion[1] == 0) {
            (_newVariable) = abi.decode(_data, (uint256));
            initData = abi.encodeWithSelector(
                bytes4(keccak256("setNewVariable(uint256)")),
                _newVariable
            );
        }

        permissions = new Permission.ItemMultiTarget[](1);
        permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Revoke,
            _dao,
            _plugin,
            NO_ORACLE,
            MULTIPLY_PERMISSION_ID
        );

        // if another helper is deployed, put it inside activeHelpers + put old ones as well.
        // The sequence you provide will be the same passed to the second version's update.
        activeHelpers = new address[](1);
        activeHelpers[0] = _helpers[0];
    }

    function prepareUninstallDataABI() external view virtual override returns (string memory) {
        return "";
    }

    function prepareUninstallation(
        address dao,
        address plugin,
        address[] calldata activeHelpers,
        bytes calldata
    ) external virtual override returns (Permission.ItemMultiTarget[] memory permissions) {
        permissions = new Permission.ItemMultiTarget[](activeHelpers.length != 0 ? 3 : 2);

        // set permissions
        permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Revoke,
            dao,
            plugin,
            NO_ORACLE,
            keccak256("EXECUTE_PERMISSION")
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
                MULTIPLY_PERMISSION_ID
            );
        }
    }

    function getImplementationAddress() external view virtual override returns (address) {
        return address(counterBase);
    }
}
