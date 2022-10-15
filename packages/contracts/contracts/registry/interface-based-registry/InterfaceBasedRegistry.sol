// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IDAO} from "../../core/IDAO.sol";

import {DaoAuthorizable} from "../../core/component/DaoAuthorizable.sol";

/// @title InterfaceBasedRegistry
/// @author Aragon Association - 2022
/// @notice An [ERC-165](https://eips.ethereum.org/EIPS/eip-165)-based registry for contracts
abstract contract InterfaceBasedRegistry is DaoAuthorizable {
    /// @notice The ID of the permission required to call the `_authorizeUpgrade` function.
    bytes32 public constant UPGRADE_PERMISSION_ID = keccak256("UPGRADE_PERMISSION");

    /// @notice The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID that the target contracts being registered must support.
    bytes4 public immutable targetInterfaceId;

    /// @notice The mapping containing the registry entries returning true for registererd contract addresses.
    mapping(address => bool) public entries;

    /// @notice Thrown if the contract is already registered.
    /// @param registrant The address of the contract to be registered.
    error ContractAlreadyRegistered(address registrant);

    /// @notice Thrown if the contract does not support the required interface.
    /// @param registrant The address of the contract to be registered.
    error ContractInterfaceInvalid(address registrant);

    /// @notice Thrown if the address is not a contract.
    /// @param registrant The address of the contract to be registered.
    error ContractAddressInvalid(address registrant);

    /// @notice Thrown if the contract do not support ERC165.
    /// @param registrant The address of the contract.
    error ContractERC165SupportInvalid(address registrant);

    /// @param _managingDao The interface of the DAO managing the components permissions.
    /// @param _targetInterfaceId The [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface id of the contracts to be regist
    constructor(IDAO _managingDao, bytes4 _targetInterfaceId) DaoAuthorizable(_managingDao) {
        targetInterfaceId = _targetInterfaceId;
    }

    /// @notice Register an [ERC-165](https://eips.ethereum.org/EIPS/eip-165) contract address.
    /// @dev The managing DAO needs to grant REGISTER_PERMISSION_ID to registrar.
    /// @param _registrant The address of an [ERC-165](https://eips.ethereum.org/EIPS/eip-165) contract.
    function _register(address _registrant) internal {
        if (!Address.isContract(_registrant)) {
            revert ContractAddressInvalid({registrant: _registrant});
        }

        if (entries[_registrant]) revert ContractAlreadyRegistered({registrant: _registrant});

        try IERC165(_registrant).supportsInterface(targetInterfaceId) returns (bool result) {
            if (!result) revert ContractInterfaceInvalid(_registrant);
        } catch {
            revert ContractERC165SupportInvalid({registrant: _registrant});
        }

        entries[_registrant] = true;
    }
}
