// SPDX-License-Identifier:    MIT
 
pragma solidity 0.8.10;

import { AragonUpgradablePlugin } from "../../../core/plugin/AragonUpgradablePlugin.sol";
import "./MultiplyHelper.sol";

/**
 * The updated version of example plugin - CountV2.
 * It expects another helper to do its work. Dev decides that only DAO should be able to call `multiply` on CountV1
 * Then only CountV1 should be able to call the final/actual multiply on the helper.
 * 
*/

contract CountV2 is AragonUpgradablePlugin {
    
    bytes32 public constant MULTIPLY_PERMISSION_ID = keccak256("MULTIPLY_PERMISSION");

    uint public count;
    MultiplyHelper public multiplyHelper;

    // dev appends a new slot.. (BE CAREFUL)
    uint public newVariable;

    // This only gets called for daos that install it for the first time.
    // initializer modifier protects it from being called 2nd time for old proxies.
    function initialize(MultiplyHelper _multiplyHelper, uint _num, uint _newVariable) external initializer {
        count = _num;

        // Since this is V2 version, and some daos might want to install this right away
        // without installing CountV1, dev decides to also include setting newVariable
        newVariable = _newVariable;

        multiplyHelper = _multiplyHelper;
    }

    // This gets called when dao already has some previous version installed(in our case, CountV1)
    // and updates to this CountV2. for these daos, this update can only be called once(this is achieved by reinitializer(2))
    // TODO: This might still be called by daos that install CountV2 for the first time, calls initialize and then calls update..
    function update(uint _newVariable) external reinitializer(2) {
        newVariable = _newVariable;
    }

    function multiply(uint a) public auth(MULTIPLY_PERMISSION_ID) returns (uint) {
        count = multiplyHelper.multiply(count, a);
        return count;
    }

    function execute() public {
        IDAO dao = dao();

        // In order to do this, Count needs permission on the dao (EXEC_ROLE)
        //dao.execute(...)
    }

}