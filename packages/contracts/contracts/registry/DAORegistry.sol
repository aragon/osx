// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

import "../core/component/DaoAuthorizable.sol";

import "../core/IDAO.sol";

/// @title Register your unique DAO name
/// @author Aragon Association - 2022
/// @notice This contract provides the possiblity to register a DAO.
contract DAORegistry is Initializable, UUPSUpgradeable, DaoAuthorizable {
    using ERC165CheckerUpgradeable for address;

    /// @notice The ID of the permission required to call the `_authorizeUpgrade` function.
    bytes32 public constant UPGRADE_PERMISSION_ID = keccak256("UPGRADE_PERMISSION");

    /// @notice The ID of the permission required to call the `register` function.
    bytes32 public constant REGISTER_DAO_PERMISSION_ID = keccak256("REGISTER_DAO_PERMISSION");

    /// @notice Emitted when a new DAO is registered
    /// @param dao The address of the DAO contract
    /// @param creator The address of the creator
    /// @param name The name of the DAO
    event DAORegistered(IDAO indexed dao, address indexed creator, string name);
    
    /// @notice Thrown if the contract does not support the required interface.
    /// @param dao The address of the contract to be registered.
    error ContractInterfaceInvalid(address dao);

    /// @notice Initializes the contract
    /// @param _dao the managing DAO address
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

    /// @notice Registers a DAO by its address
    /// @dev A name is unique within the Aragon DAO framework and can get stored here
    /// @param name The name of the DAO
    /// @param dao The address of the DAO contract
    /// @param creator The address of the creator
    function register(
        string calldata name,
        IDAO dao,
        address creator
    ) external auth(REGISTER_DAO_PERMISSION_ID) {
        // TODO: Implement ENS subdomain. Currently DAO's name can be repeated, will be resolved once the ENS subdomain is implemented.

        if(!address(dao).supportsInterface(type(IDAO).interfaceId)) {
            revert ContractInterfaceInvalid(address(dao));
        }

        emit DAORegistered(dao, creator, name);
    }

    /// @notice reserves storage space in case of state variable additions for this contract.
    /// @dev After the addition of state variables, the number of storage slots including `_gap` size must add up to 50.
    uint256[50] private __gap;
}
