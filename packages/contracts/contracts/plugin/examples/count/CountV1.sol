// SPDX-License-Identifier:    MIT
 
pragma solidity 0.8.10;

import { AragonUpgradablePlugin } from "../../../core/plugin/AragonUpgradablePlugin.sol";
import "./MultiplyHelper.sol";

/**
 * The first version of example plugin - CountV1.
 * It expects another helper to do its work. Dev decides that only DAO should be able to call `multiply` on CountV1
 * Then only CountV1 should be able to call the final/actual multiply on the helper.
 * 
*/
contract CountV1 is AragonUpgradablePlugin {
    
    bytes32 public constant MULTIPLY_PERMISSION_ID = keccak256("MULTIPLY_PERMISSION");

    uint public count;
    MultiplyHelper public multiplyHelper;

    function initialize(MultiplyHelper _multiplyHelper, uint _num) external initializer {
        count = _num;
        multiplyHelper = _multiplyHelper;
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