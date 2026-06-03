// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {MetadataExtension} from "../../../../../src/common/utils/metadata/MetadataExtension.sol";
import {IDAO} from "../../../../../src/common/dao/IDAO.sol";
import {DaoAuthorizable} from "../../../../../src/common/permission/auth/DaoAuthorizable.sol";

/// @notice A mock contract.
/// @dev DO NOT USE IN PRODUCTION!
contract MetadataExtensionMock is MetadataExtension {
    constructor(IDAO dao) DaoAuthorizable(dao) {}
}
