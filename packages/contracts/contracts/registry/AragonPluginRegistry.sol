/*
 * SPDX-License-Identifier: MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

import "../core/component/DaoAuthorizable.sol";
import "../core/IDAO.sol";
import "../plugin/IPluginRepo.sol";

/// @title AragonPluginRegistry
/// @author Aragon Association - 2022
/// @notice This contract maintains an address-based registery of plugin repositories in the Aragon App DAO framework.
contract AragonPluginRegistry is Initializable, UUPSUpgradeable, DaoAuthorizable {
    using ERC165CheckerUpgradeable for address;

    /// @notice The ID of the permission required to call the `_authorizeUpgrade` function.
    bytes32 public constant UPGRADE_PERMISSION_ID = keccak256("UPGRADE_PERMISSION");

    /// @notice The ID of the permission required to call the `register` function.
    bytes32 public constant REGISTER_PERMISSION_ID = keccak256("REGISTER_PERMISSION");

    /// @notice Emitted if a new plugin repository is registered.
    /// @param name The name of the plugin repository.
    /// @param pluginRepo The address of the plugin repository.
    event PluginRepoRegistered(string name, address pluginRepo);

    /// @notice Thrown if the contract does not support the required interface.
    /// @param dao The address of the contract to be registered.
    error ContractInterfaceInvalid(address dao);

    /// @notice Initializes the contract by setting calling the `InterfaceBasedRegistry` base class initialize method.
    /// @param _dao The address of the managing DAO.
    function initialize(IDAO _dao) public initializer {
        __DaoAuthorizable_init(_dao);
    }

    /// @notice Internal method authorizing the upgrade of the contract via the [upgradeabilty mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    /// @dev The caller must have the `UPGRADE_PERMISSION_ID` permission.
    function _authorizeUpgrade(address)
        internal
        virtual
        override
        auth(UPGRADE_PERMISSION_ID)
    {}

    /// @notice Registers a plugin repository with a name and address.
    /// @param name The name of the PluginRepo.
    /// @param registrant The address of the PluginRepo contract.
    function register(string calldata name, address registrant)
        external
        auth(REGISTER_PERMISSION_ID)
    {
        // TODO: Implement ENS subdomain. Currently plugin's name can be repeated, will be resolved once the ENS subdomain is implemented.

        if(!registrant.supportsInterface(type(IPluginRepo).interfaceId)) {
            revert ContractInterfaceInvalid(registrant);
        }

        emit PluginRepoRegistered(name, registrant);
    }
}
