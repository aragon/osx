/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "../core/component/ERC165Registry.sol";
import "../core/IDAO.sol";
import "../APM/IRepo.sol";

/// @title Register plugin
/// @author Sarkawt Noori - Aragon Association - 2022
/// @notice This contract provides the possiblity to register a plugin repo by a unique address.
contract AragonPluginRegistry is ERC165Registry {
    /// @notice Emitted if a new Repo is registered
    /// @param name The name of the Repo
    /// @param repo The address of the Repo
    event NewRepo(string name, address repo);

    /// @notice Initializes the contract
    /// @param _dao the managing DAO address
    function initialize(IDAO _dao) public initializer {
        bytes4 repoInterfaceId = type(IRepo).interfaceId;
        __ERC165Registry_init(_dao, repoInterfaceId);
    }

    /// @notice Registers a Repo
    /// @param name The name of the Repo
    /// @param registrant The address of the Repo contract
    function register(string calldata name, address registrant) external {
        _register(registrant);

        emit NewRepo(name, registrant);
    }
}
