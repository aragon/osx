// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

interface IPluginUUPSUpgradeable {
    /// @notice Returns the address of the implementation contract in the [proxy storage slot](https://eips.ethereum.org/EIPS/eip-1967) slot the [UUPS proxy](https://eips.ethereum.org/EIPS/eip-1822) is pointing to.
    /// @return implementation The address of the implementation contract.
    function getImplementationAddress() external view returns (address implementation);
}
