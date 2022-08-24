// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import '@openzeppelin/contracts/proxy/Clones.sol';
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {Permission, PluginManager} from "../../PluginManager.sol";
import "./MultiplyHelper.sol";
import "./CounterV2.sol";

contract CounterV2PluginManager is PluginManager {
    using Clones for address;
    MultiplyHelper public multiplyHelperBase;
    CounterV2 public counterBase;

    address private constant NO_ORACLE = address(0);

    // MultiplyHelper doesn't change. so dev decides to pass the old one.
    constructor(MultiplyHelper _helper) {
        multiplyHelperBase = _helper;
        counterBase = new CounterV2();
    }

    function deploy(address dao, bytes memory data)
        public
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

        address multiplyHelper = _multiplyHelper;

        // Allocate space for requested permission that will be applied on this plugin installation.
        permissions = new Permission.ItemMultiTarget[](_multiplyHelper == address(0) ? 2 : 3);

        if (_multiplyHelper == address(0)) {
            multiplyHelper = address(multiplyHelperBase).clone();
            MultiplyHelper(multiplyHelper).initialize(dao);
        }

        // Encode the parameters that will be passed to initialize() on the Plugin
        bytes memory initData = abi.encodeWithSelector(
            bytes4(keccak256("initialize(address,uint256)")),
            multiplyHelper,
            _num,
            _newVariable
        );

        // Deploy the Plugin itself, make it point to the implementation and
        // pass it the initialization params
        plugin = address(new ERC1967Proxy(getImplementationAddress(), initData));

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
                multiplyHelper,
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
    ) public virtual override returns (Permission.ItemMultiTarget[] memory permissions) {
        uint256 _newVariable;

        // TODO: Shall we leave it here or make devs call `upgrade` from our abstract factory
        // Just a way of reinforcing...
        UUPSUpgradeable(proxy).upgradeTo(getImplementationAddress());

        // Only
        if (oldVersion[0] == 1 && oldVersion[1] == 0) {
            (_newVariable) = abi.decode(data, (uint256));
            CounterV2(proxy).setNewVariable(_newVariable);
        }

        permissions = new Permission.ItemMultiTarget[](1);

        // Just for the case of example...
        permissions[0] = Permission.ItemMultiTarget(
            Permission.Operation.Revoke,
            dao,
            proxy,
            NO_ORACLE,
            multiplyHelperBase.MULTIPLY_PERMISSION_ID()
        );
    }

    function getImplementationAddress() public view virtual override returns (address) {
        return address(counterBase);
    }

    function deployABI() external view virtual override returns (string memory) {
        return "(address multiplyHelper, uint num, uint newVariable)";
    }

    function updateABI() external view virtual override returns (string memory) {
        return "(uint _newVariable)";
    }
}

contract TestCounterV2Manager is CounterV2PluginManager {
    event PluginDeployed(address plugin, Permission.ItemMultiTarget[] permissions);
    event PluginUpdated(address plugin, address dao, Permission.ItemMultiTarget[] permissions);

    constructor(MultiplyHelper _multiplyHelper) CounterV2PluginManager(_multiplyHelper) {}

    function deploy(address dao, bytes memory data)
        public
        override
        returns (address plugin, Permission.ItemMultiTarget[] memory permissions)
    {
        (plugin, permissions) = super.deploy(dao, data);

        emit PluginDeployed(plugin, permissions);
    }

    function update(
        address dao,
        address plugin,
        uint16[3] calldata oldVersion,
        bytes memory data
    ) public virtual override returns (Permission.ItemMultiTarget[] memory permissions) {
        permissions = super.update(dao, plugin, oldVersion, data);

        emit PluginUpdated(plugin, dao, permissions);
    }
}
