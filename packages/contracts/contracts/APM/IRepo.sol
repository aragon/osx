/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

interface IRepo {
    function newVersion(
        uint16[3] memory _newSemanticVersion,
        address _pluginFactoryAddress,
        bytes calldata _contentURI
    ) external;
}
