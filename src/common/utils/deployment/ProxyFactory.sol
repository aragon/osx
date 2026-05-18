// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {ProxyLib} from "./ProxyLib.sol";

/// @title ProxyFactory
/// @author Aragon X - 2024
/// @notice A factory to deploy proxies via the UUPS pattern (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)) and minimal proxy pattern (see [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167)).
/// @custom:security-contact sirt@aragon.org
contract ProxyFactory {
    using ProxyLib for address;
    /// @notice The immutable logic contract address.
    address internal immutable IMPLEMENTATION;

    /// @notice Emitted when an proxy contract is created.
    /// @param proxy The proxy address.
    event ProxyCreated(address proxy);

    /// @notice Initializes the contract with a logic contract address.
    /// @param _implementation The logic contract address.
    constructor(address _implementation) {
        IMPLEMENTATION = _implementation;
    }

    /// @notice Creates an [ERC-1967](https://eips.ethereum.org/EIPS/eip-1967) proxy contract pointing to the pre-set logic contract.
    /// @param _data The initialization data for this contract.
    /// @return proxy The address of the proxy contract created.
    /// @dev If `_data` is non-empty, it is used in a delegate call to the `_implementation` contract. This will typically be an encoded function call initializing the proxy (see [OpenZeppelin ERC1967Proxy-constructor](https://docs.openzeppelin.com/contracts/4.x/api/proxy#ERC1967Proxy-constructor-address-bytes-)).
    function deployUUPSProxy(bytes memory _data) external returns (address proxy) {
        proxy = IMPLEMENTATION.deployUUPSProxy(_data);
        emit ProxyCreated({proxy: proxy});
    }

    /// @notice Creates an [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167) minimal proxy contract pointing to the pre-set logic contract.
    /// @param _data The initialization data for this contract.
    /// @return proxy The address of the proxy contract created.
    /// @dev If `_data` is non-empty, it is used in a call to the clone contract. This will typically be an encoded function call initializing the storage of the contract.
    function deployMinimalProxy(bytes memory _data) external returns (address proxy) {
        proxy = IMPLEMENTATION.deployMinimalProxy(_data);
        emit ProxyCreated({proxy: proxy});
    }

    /// @notice Returns the implementation contract address.
    /// @return The address of the implementation contract.
    /// @dev The implementation can be cloned via the minimal proxy pattern (see [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167)), or proxied via the UUPS proxy pattern (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)).
    function implementation() public view returns (address) {
        return IMPLEMENTATION;
    }
}
