// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {isSubdomainValid} from "../registry/RegistryUtils.sol";

contract RegistryUtils {
    function _isSubdomainValid(string calldata subdomain) external pure returns (bool) {
        return isSubdomainValid(subdomain);
    }
}
