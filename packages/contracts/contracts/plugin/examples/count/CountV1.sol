// SPDX-License-Identifier:    MIT
 
pragma solidity 0.8.10;

import "../../../core/plugin/AragonUpgradablePlugin.sol";
import "./MultiplyHelper.sol";

contract CountV1 is AragonUpgradablePlugin {
    
    bytes32 public constant MULTIPLY_PERMISSION_ID = keccak256("MULTIPLY_PERMISSION");

    uint public count;
    MultiplyHelper public multiplyHelper;

    function initialize(MultiplyHelper _multiplyHelper) external initializer {
        count = 1;
        multiplyHelper = _multiplyHelper;
    }

    function multiply(uint a) public auth(MULTIPLY_PERMISSION_ID) returns (uint) {
        return multiplyHelper.multiply(count, b);
    }

    function execute() public {
        IDAO dao = dao();

        // In order to do this, Count needs permission on the dao (EXEC_ROLE)
        //dao.execute(...)
    }

}