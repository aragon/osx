// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PluginUUPSUpgradeable} from "../../../core/plugin/PluginUUPSUpgradeable.sol";
import {MultiplyHelper} from "./MultiplyHelper.sol";
import {IDAO} from "../../../core/IDAO.sol";

/// @title CounterV1
/// @author Aragon Association - 2022
/// @notice The updated version of an example plugin counting numbers.
contract CounterV2 is PluginUUPSUpgradeable {
    /// @notice The ID of the permission required to call the `multiply` function.
    bytes32 public constant MULTIPLY_PERMISSION_ID = keccak256("MULTIPLY_PERMISSION");

    /// @notice A counter varaible.
    uint256 public count;

    /// @notice A helper contract associated with the plugin.
    MultiplyHelper public multiplyHelper;

    /// @notice A new varaible added in V2.
    /// @dev By appending a new variable, the existing storage gets modified.
    uint256 public newVariable;

    /// @notice Initializes the plugin.
    /// @param _dao The contract of the associated DAO.
    /// @param _multiplyHelper The helper contract associated with the plugin to multiply numbers.
    /// @param _count The inital value of the counter.
    /// @param _newVariable The new variable that was added with V2.
    /// @dev This only gets called for daos that install it for the first time. The initializer modifier protects it from being called a second time for old proxies.
    function initialize(
        IDAO _dao,
        MultiplyHelper _multiplyHelper,
        uint256 _count,
        uint256 _newVariable
    ) external initializer {
        __PluginUpgradeable_init(_dao);

        count = _count;

        // Since this is V2 version, and some daos might want to install this right away
        // without installing CountV1, dev decides to also include setting newVariable
        newVariable = _newVariable;

        multiplyHelper = _multiplyHelper;
    }

    /// @notice Sets a the new variable that was added in V2.
    /// @param _newVariable The new variable.
    /// @dev This gets called when a dao already has `CounterV1` installed and updates to this verison `CounterV2`. For these DAOs, this `setNewVariable` can only be called once which is achieved by `reinitializer(2)`.
    // TODO: This might still be called by daos that install CounterV2 for the first time, calls initialize and then calls setNewVariable.
    function setNewVariable(uint256 _newVariable) external reinitializer(2) {
        newVariable = _newVariable;
    }

    /// @notice Multiplies the count with a number.
    /// @param _a The number to multiply the coun with.
    function multiply(uint256 _a) public view auth(MULTIPLY_PERMISSION_ID) returns (uint256) {
        return multiplyHelper.multiply(count, _a);
    }

    /// @notice Executes something on the DAO.
    function execute() public {
        // IDAO dao = getDao();
        // In order to do this, Count needs permission on the dao (EXEC_ROLE)
        //dao.execute(...)
    }
}
