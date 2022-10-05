
// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "./AppStorage.sol";

contract TransparentProxy is TransparentUpgradeableProxy, AppStorage {

    /// @notice The constructor initializing the [ERC-1967](https://eips.ethereum.org/EIPS/eip-1967) proxy and setting the `IDAO` address if specified.
    /// @param _dao The DAO address to be stored.
    /// @param _admin The admin address to be stored.
    /// @param _logic The address of the logic contract containing the proxy is pointing to.
    /// @ param _data The data being passed in a delegatecall to `_logic` to initialize the storage (see [OZs `ERC1967Proxy.sol` docs](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/proxy/ERC1967/ERC1967Proxy.sol))
    constructor(
        address _dao,
        address _logic,
        address _admin,
        bytes memory _data
    ) TransparentUpgradeableProxy(_logic, _admin, _data) {
        if(_dao != address(0)) {
            setDAO(_dao);
        }
    }
}
