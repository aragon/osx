// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@opengsn/contracts/src/BaseRelayRecipient.sol";

import "./Component.sol";

/// @title MetaTxComponent
/// @author Aragon Association - 2022
/// @notice Base component in the Aragon DAO framework supporting meta transactions
abstract contract MetaTxComponent is Component, BaseRelayRecipient {
    bytes32 public constant SET_TRUSTED_FORWARDER_PERMISSION_ID =
        keccak256("SET_TRUSTED_FORWARDER_PERMISSION_ID");

    event TrustedForwarderSet(address forwarder);

    /// @notice Initialization
    /// @param _dao the associated DAO address
    /// @param _trustedForwarder the trusted forwarder address who verifies the meta transaction
    function __MetaTxComponent_init(IDAO _dao, address _trustedForwarder)
        internal
        virtual
        onlyInitializing
    {
        __Component_init(_dao);

        _registerStandard(type(MetaTxComponent).interfaceId);

        _setTrustedForwarder(_trustedForwarder);
        emit TrustedForwarderSet(_trustedForwarder);
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
        auth(SET_TRUSTED_FORWARDER_PERMISSION_ID)
    {
        _setTrustedForwarder(_trustedForwarder);

        emit TrustedForwarderSet(_trustedForwarder);
    }
}
