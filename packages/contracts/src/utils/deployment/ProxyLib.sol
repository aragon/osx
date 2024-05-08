// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.8;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

/// @title ProxyLib
/// @author Aragon X - 2024
/// @notice A library containing methods for the deployment of proxies via the UUPS pattern (see [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822)) and minimal proxy pattern (see [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167)).
/// @custom:security-contact sirt@aragon.org
library ProxyLib {
    using Address for address;
    using Clones for address;

    /// @notice Creates an [ERC-1967](https://eips.ethereum.org/EIPS/eip-1967) UUPS proxy contract pointing to a logic contract and allows to immediately initialize it.
    /// @param _logic The logic contract the proxy is pointing to.
    /// @param _initCalldata The initialization data for this contract.
    /// @return uupsProxy The address of the UUPS proxy contract created.
    /// @dev If `_initCalldata` is non-empty, it is used in a delegate call to the `_logic` contract. This will typically be an encoded function call initializing the storage of the proxy (see [OpenZeppelin ERC1967Proxy-constructor](https://docs.openzeppelin.com/contracts/4.x/api/proxy#ERC1967Proxy-constructor-address-bytes-)).
    function deployUUPSProxy(
        address _logic,
        bytes memory _initCalldata
    ) internal returns (address uupsProxy) {
        uupsProxy = address(new ERC1967Proxy({_logic: _logic, _data: _initCalldata}));
    }

    /// @notice Creates an [ERC-1167](https://eips.ethereum.org/EIPS/eip-1167) minimal proxy contract, also known as clones, pointing to a logic contract and allows to immediately initialize it.
    /// @param _logic The logic contract the proxy is pointing to.
    /// @param _initCalldata The initialization data for this contract.
    /// @return minimalProxy The address of the minimal proxy contract created.
    /// @dev If `_initCalldata` is non-empty, it is used in a call to the clone contract. This will typically be an encoded function call initializing the storage of the contract.
    function deployMinimalProxy(
        address _logic,
        bytes memory _initCalldata
    ) internal returns (address minimalProxy) {
        minimalProxy = _logic.clone();
        if (_initCalldata.length > 0) {
            minimalProxy.functionCall({data: _initCalldata});
        }
    }
}
