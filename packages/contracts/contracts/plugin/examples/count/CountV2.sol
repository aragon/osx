// SPDX-License-Identifier:    MIT
 
pragma solidity 0.8.10;

import "../../../core/plugin/AragonUpgradablePlugin.sol";
import "./MultiplyHelper.sol";

contract CountV2 is AragonUpgradablePlugin {
    
    bytes32 public constant MULTIPLY_PERMISSION_ID = keccak256("MULTIPLY_PERMISSION");

    uint public count;
    MultiplyHelper public multiplyHelper;

    // Appending SLOT (Be Careful....)
    uint public newVariable;

    function initialize(MultiplyHelper _multiplyHelper) external initializer {
        count = 1;
        
        // Since this is V2 version, and some daos might want to install this right away
        // without installing CountV1, dev decides to also include setting newVariable
        newVariable = 1;

        multiplyHelper = _multiplyHelper;
    }

    // This should get called when dao already has some previous version installed
    // and updates to this.
    function update(uint _newVariable) external reinitializer(2) {
        newVariable = _newVariable;
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