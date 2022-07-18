/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";

import "./AragonApp.sol";

abstract contract AragonAppMeta is AragonApp, BaseRelayRecipient {
    bytes32 public constant MODIFY_TRUSTED_FORWARDER = keccak256("MODIFY_TRUSTED_FORWARDER");

    event TrustedForwarderSet(address forwarder);

    function __MetaTxApp_init(address _trustedForwarder) internal virtual onlyInitializing {
        _setTrustedForwarder(_trustedForwarder);
        emit TrustedForwarderSet(_trustedForwarder);
    }

    /// @notice Returns the version of the GSN relay recipient
    /// @dev Describes the version and contract for GSN compatibility
    function versionRecipient() external view virtual override returns (string memory) {
        return "0.0.1+opengsn.recipient.APMRegistry1";
    }

    /// @notice overrides '_msgSender()' from 'Component'->'ContextUpgradeable' with that of 'BaseRelayRecipient'
    function _msgSender()
        internal
        view
        override(ContextUpgradeable, BaseRelayRecipient)
        returns (address)
    {
        return BaseRelayRecipient._msgSender();
    }

    /// @notice overrides '_msgData()' from 'Component'->'ContextUpgradeable' with that of 'BaseRelayRecipient'
    function _msgData()
        internal
        view
        override(ContextUpgradeable, BaseRelayRecipient)
        returns (bytes calldata)
    {
        return BaseRelayRecipient._msgData();
    }

    /// @notice Setter for the trusted forwarder verifying the meta transaction
    /// @param _trustedForwarder the trusted forwarder address
    /// @dev used to update the trusted forwarder
    function setTrustedForwarder(address _trustedForwarder)
        public
        virtual
        auth(MODIFY_TRUSTED_FORWARDER)
    {
        _setTrustedForwarder(_trustedForwarder);

        emit TrustedForwarderSet(_trustedForwarder);
    }
}
