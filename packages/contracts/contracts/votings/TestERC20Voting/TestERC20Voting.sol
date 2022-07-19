/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

import "../../plugin/aragonPlugin/AragonApp.sol";

contract TestERC20Voting is AragonApp {
    bytes32 public constant TEST_ROLE = keccak256("TEST_ROLE");

    function _update(uint256 oldVersion, bytes memory data) internal virtual override {}

    function updateSignatureABI() external view virtual override returns (string memory) {
        return "some sig here...";
    }

    function initialize(
        address _gsnForwarder,
        uint64 _participationRequiredPct,
        uint64 _supportRequiredPct,
        uint64 _minDuration,
        address _token
    ) public initializer {
        // initialize
    }

    function test() public auth(TEST_ROLE) {}

    function vote() public {}
}
