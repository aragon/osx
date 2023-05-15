// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity 0.8.17;

/*
 * Migrations.sol
 *
 * This is a helper contract to manage and run the migrations of the Aragon OSX Protocol contracts.
 * It serves as a centralized point of control for importing different versions of contracts, which
 * is particularly useful for testing and development purposes.
 *
 * In this file, we import different versions of a contract. This allows us to test how our system
 * behaves with each of these versions, and ensure backward compatibility with older versions.
 *
 * The contracts from the specified versions are imported and aliased as <contract-name>_<versions_name>,
 * making them easy to reference in our tests and migration scripts.
 *
 * After importing a contract here, the contract will be compiled and TypeChain typings will be generated,
 * enabling type-safe interactions with the contract in our tests.
 *
 */

import {DAO as DAO_v1_0_0} from "@aragon/osx-versions/versions/v1_0_0/contracts/core/dao/DAO.sol";
import {DAO as DAO_v1_2_0} from "@aragon/osx-versions/versions/v1_2_0/contracts/core/dao/DAO.sol";
