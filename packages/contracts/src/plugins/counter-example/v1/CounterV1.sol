// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {PluginUUPSUpgradeable} from "../../../core/plugin/PluginUUPSUpgradeable.sol";
import {MultiplyHelper} from "../MultiplyHelper.sol";
import {IDAO} from "../../../core/dao/IDAO.sol";

/// @title CounterV1
/// @author Aragon Association - 2022-2023
/// @notice The first version of an example plugin counting numbers.
contract CounterV1 is PluginUUPSUpgradeable {
    /// @notice The ID of the permission required to call the `multiply` function.
    bytes32 public constant MULTIPLY_PERMISSION_ID = keccak256("MULTIPLY_PERMISSION");

    /// @notice A counter varaible.
    uint256 public count;

    /// @notice A helper contract associated with the plugin.
    MultiplyHelper public multiplyHelper;

    /// @notice Initializes the plugin.
    /// @param _dao The contract of the associated DAO.
    /// @param _multiplyHelper The helper contract associated with the plugin to multiply numbers.
    /// @param _count The inital value of the counter.
    function initialize(
        IDAO _dao,
        MultiplyHelper _multiplyHelper,
        uint256 _count
    ) external initializer {
        __PluginUUPSUpgradeable_init(_dao);

        count = _count;
        multiplyHelper = _multiplyHelper;
    }

    /// @notice Multiplies the count with a number.
    /// @param _a The number to multiply the coun with.
    function multiply(uint256 _a) public view auth(MULTIPLY_PERMISSION_ID) returns (uint256) {
        return multiplyHelper.multiply(count, _a);
    }

    /// @notice Executes something on the DAO.
    function execute() public {
        // In order to do this, Count needs permission on the dao (EXEC_ROLE)
        //dao.execute(...)
    }

    /// @notice This empty reserved space is put in place to allow future versions to add new variables without shifting down storage in the inheritance chain (see [OpenZepplins guide about storage gaps](https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps)).
    uint256[48] private __gap;
}
