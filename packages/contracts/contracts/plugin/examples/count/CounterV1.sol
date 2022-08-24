// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {PluginUUPSUpgradeable} from "../../../core/plugin/PluginUUPSUpgradeable.sol";
import {MultiplyHelper} from "./MultiplyHelper.sol";
import {IDAO} from "../../../core/IDAO.sol";

/// @notice The first version of example plugin - CounterV1.
contract CounterV1 is PluginUUPSUpgradeable {
    bytes32 public constant MULTIPLY_PERMISSION_ID = keccak256("MULTIPLY_PERMISSION");

    uint256 public count;
    MultiplyHelper public multiplyHelper;

    function initialize(address _dao, MultiplyHelper _multiplyHelper, uint256 _num) external initializer {
        count = _num;
        multiplyHelper = _multiplyHelper;

        __Plugin_init(_dao);
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
