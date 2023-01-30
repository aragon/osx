// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import {isSubdomainValid as _isSubdomainValid} from "../registry/RegistryUtils.sol";

contract RegistryUtils {
    function isSubdomainValid(string calldata subdomain) external pure returns (bool) {
        return _isSubdomainValid(subdomain);
    }
}
