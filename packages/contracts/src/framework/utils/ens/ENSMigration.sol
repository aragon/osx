// SPDX-License-Identifier: AGPL-3.0-or-later
// This is a migration file as suggested here https://docs.ens.domains/deploying-ens-on-a-private-chain#migration-file-example
// to compile the contracts and make their artifacts available in our tests.

pragma solidity 0.8.17;

import "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";
import "@ensdomains/ens-contracts/contracts/resolvers/PublicResolver.sol";

contract Dummy {}
