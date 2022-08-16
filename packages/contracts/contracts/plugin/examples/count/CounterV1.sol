// SPDX-License-Identifier: MIT
 
pragma solidity 0.8.10;

import { AragonUpgradablePlugin } from "../../../core/plugin/AragonUpgradablePlugin.sol";
import "./MultiplyHelper.sol";

/// @notice The first version of example plugin - CounterV1.
contract CounterV1 is AragonUpgradablePlugin {
    
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