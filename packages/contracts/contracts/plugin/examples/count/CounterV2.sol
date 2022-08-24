// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PluginUUPSUpgradeable} from "../../../core/plugin/PluginUUPSUpgradeable.sol";
import {MultiplyHelper} from "./MultiplyHelper.sol";
import {IDAO} from "../../../core/IDAO.sol";

/// @notice The updated version of example plugin - CounterV2.
contract CounterV2 is PluginUUPSUpgradeable {
    bytes32 public constant MULTIPLY_PERMISSION_ID = keccak256("MULTIPLY_PERMISSION");

    uint256 public count;
    MultiplyHelper public multiplyHelper;

    // dev appends a new slot.. (BE CAREFUL)
    uint256 public newVariable;

    // This only gets called for daos that install it for the first time.
    // initializer modifier protects it from being called 2nd time for old proxies.
    function initialize(
        address _dao,
        MultiplyHelper _multiplyHelper,
        uint256 _num,
        uint256 _newVariable
    ) external initializer {
        count = _num;

        // Since this is V2 version, and some daos might want to install this right away
        // without installing CountV1, dev decides to also include setting newVariable
        newVariable = _newVariable;

        multiplyHelper = _multiplyHelper;

        __Plugin_init(_dao);
    }

    // This gets called when dao already has some previous version installed(in our case, CountV1)
    // and updates to this CountV2. for these daos, this setNewVariable can only be called once(this is achieved by reinitializer(2))
    // TODO: This might still be called by daos that install CountV2 for the first time, calls initialize and then calls setNewVariable..
    function setNewVariable(uint256 _newVariable) external reinitializer(2) {
        newVariable = _newVariable;
    }

    function multiply(uint256 a) public auth(MULTIPLY_PERMISSION_ID) returns (uint256) {
        count = multiplyHelper.multiply(count, a);
        return count;
    }

    function execute() public {
        // IDAO dao = dao();

        // In order to do this, Count needs permission on the dao (EXEC_ROLE)
        //dao.execute(...)
    }
}
