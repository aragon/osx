// SPDX-License-Identifier: MIT
// This is a migration file as suggested here https://docs.ens.domains/deploying-ens-on-a-private-chain#migration-file-example
// to compile the contracts and make their artifacts available in our tests.

pragma solidity 0.8.10;

import {ENSRegistry} from "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";
import {PublicResolver} from "@ensdomains/ens-contracts/contracts/resolvers/PublicResolver.sol";

contract ENSMigration {}
