// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {MetadataExtensionUpgradeable} from "../../../../../src/common/utils/metadata/MetadataExtensionUpgradeable.sol";

import {IDAO} from "../../../../../src/common/dao/IDAO.sol";

/// @notice A mock contract.
/// @dev DO NOT USE IN PRODUCTION!
contract MetadataExtensionUpgradeableMock is MetadataExtensionUpgradeable {
    function initialize(IDAO _dao) public initializer {
        __DaoAuthorizableUpgradeable_init(_dao);
    }
}
