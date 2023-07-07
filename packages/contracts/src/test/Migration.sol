// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

/*
 * @title Migration
 *
 * @dev This contract serves as a collection of imports from different versions of Aragon OSx contracts.
 * It facilitates testing and interaction with contracts from various versions of Aragon OSx.
 *
 * Each imported contract is aliased as `<contract-name>_<versions_name>` for clarity and to avoid
 * name collisions when the same contract is imported from different versions. This aliasing is only
 * necessary in the context of this Migration.sol file to differentiate between contract versions.
 *
 * After a contract is imported here and the project is compiled, an associated artifact will be
 * generated inside artifacts/@aragon/{version-name}/*,
 * and TypeChain typings will be generated inside typechain/osx-version/{version-name}/* for type-safe interactions with the contract
 * in our tests.
 *
 */

import {DAO as DAO_v1_0_0} from "@aragon/osx-v1.0.1/core/dao/DAO.sol";
