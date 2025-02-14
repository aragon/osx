// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

/**
 * @title Migration
 *
 * @dev This file imports contracts from
 * - previous versions of `@aragon/osx`
 * - the current or previous versions of @aragon/osx-commons
 * with the purpose of integration and regression testing
 *
 * Each imported contract is aliased as `<contract-name>_<versions_name>` for clarity and to avoid
 * name collisions when the same contract is imported from different versions. This aliasing is only
 * necessary in the context of this Migration.sol file to differentiate between contract versions.
 *
 * After a contract is imported here and the project is compiled, an associated artifact will be
 * generated inside artifacts/@aragon/{version-name}/*,
 * and TypeChain typings will be generated inside typechain/osx-version/{version-name}/* for type-safe interactions with the contract
 * in our tests.
 */

/* solhint-disable no-unused-import */

// Deploy Script
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// Regression Testing
import {DAO as DAO_v1_0_0} from "@aragon/osx-v1.0.1/core/dao/DAO.sol";
import {DAO as DAO_v1_3_0} from "@aragon/osx-v1.3.0/core/dao/DAO.sol";
import {DAORegistry as DAORegistry_v1_0_0} from "@aragon/osx-v1.0.1/framework/dao/DAORegistry.sol";
import {DAORegistry as DAORegistry_v1_3_0} from "@aragon/osx-v1.3.0/framework/dao/DAORegistry.sol";

import {PluginRepo as PluginRepo_v1_0_0} from "@aragon/osx-v1.0.1/framework/plugin/repo/PluginRepo.sol";
import {PluginRepo as PluginRepo_v1_3_0} from "@aragon/osx-v1.3.0/framework/plugin/repo/PluginRepo.sol";

import {PluginRepoRegistry as PluginRepoRegistry_v1_0_0} from "@aragon/osx-v1.0.1/framework/plugin/repo/PluginRepoRegistry.sol";
import {PluginRepoRegistry as PluginRepoRegistry_v1_3_0} from "@aragon/osx-v1.3.0/framework/plugin/repo/PluginRepoRegistry.sol";

import {ENSSubdomainRegistrar as ENSSubdomainRegistrar_v1_0_0} from "@aragon/osx-v1.0.1/framework/utils/ens/ENSSubdomainRegistrar.sol";
import {ENSSubdomainRegistrar as ENSSubdomainRegistrar_v1_3_0} from "@aragon/osx-v1.3.0/framework/utils/ens/ENSSubdomainRegistrar.sol";

// needed in the script to generate the managing dao proposal when upgrading
import {Multisig as Multisig_v1_3_0} from "@aragon/osx-v1.3.0/plugins/governance/multisig/Multisig.sol";

// Integration Testing
import {ProxyFactory} from "@aragon/osx-commons-contracts/src/utils/deployment/ProxyFactory.sol";

/* solhint-enable no-unused-import */
