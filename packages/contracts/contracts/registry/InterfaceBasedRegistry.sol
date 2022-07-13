// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

import "../core/component/DAOPermissioned.sol";
import "../core/erc165/AdaptiveERC165.sol";

/// @title InterfaceBasedRegistry
/// @author Aragon Association - 2022
/// @notice An [ERC-165](https://eips.ethereum.org/EIPS/eip-165)-based registry for contracts
abstract contract InterfaceBasedRegistry is DAOPermissioned, UUPSUpgradeable {
    bytes32 public constant UPGRADE_PERMISSION_ID = keccak256("UPGRADE_PERMISSION_ID");

    bytes4 public targetInterfaceId;

    mapping(address => bool) public entries;

    /// @notice Thrown if the contract is already registered
    /// @param registrant The address of the contract to be registered
    error ContractAlreadyRegistered(address registrant);

    /// @notice Thrown if the contract does not support the required interface
    /// @param registrant The address of the contract to be registered
    error ContractInterfaceInvalid(address registrant);

    /// @notice Thrown if the address is not a contract
    /// @param registrant The address of the contract to be registered
    error ContractAddressInvalid(address registrant);

    /// @notice Thrown if the contract do not support ERC165
    /// @param registrant The address of the contract
    error ContractERC165SupportInvalid(address registrant);

    /// @notice Initializes the component
    /// @dev This is required for the UUPS upgradability pattern
    /// @param _managingDao The interface of the DAO managing the components permissions
    /// @param _targetInterfaceId The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface id of the contracts to be registered
    function __InterfaceBasedRegistry_init(IDAO _managingDao, bytes4 _targetInterfaceId)
        internal
        virtual
        onlyInitializing
    {
        __DAOPermissioned_init(_managingDao);

        targetInterfaceId = _targetInterfaceId;
    }

    /// @notice Internal method authorizing the upgrade of the contract via the [upgradeabilty mechanism for UUPS proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    /// @dev The caller must have the `UPGRADE_PERMISSION_ID` permission.
    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_PERMISSION_ID) {}

    /// @notice Register an [ERC-165](https://eips.ethereum.org/EIPS/eip-165) contract address
    /// @dev The managing DAO needs to grant REGISTER_PERMISSION_ID to registrar
    /// @param registrant The address of an [ERC-165](https://eips.ethereum.org/EIPS/eip-165) contract
    function _register(address registrant) internal {
        if (!Address.isContract(registrant)) {
            revert ContractAddressInvalid({registrant: registrant});
        }

        if (entries[registrant]) revert ContractAlreadyRegistered({registrant: registrant});

        try AdaptiveERC165(registrant).supportsInterface(targetInterfaceId) returns (bool result) {
            if (!result) revert ContractInterfaceInvalid(registrant);
        } catch {
            revert ContractERC165SupportInvalid({registrant: registrant});
        }

        entries[registrant] = true;
    }
}
