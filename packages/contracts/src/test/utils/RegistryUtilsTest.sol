// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

import {isSubdomainValid as _isSubdomainValid} from "../../framework/utils/RegistryUtils.sol";

contract RegistryUtils {
    function isSubdomainValid(string calldata subdomain) external pure returns (bool) {
        return _isSubdomainValid(subdomain);
    }
}
