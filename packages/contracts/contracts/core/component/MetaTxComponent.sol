// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@opengsn/contracts/src/BaseRelayRecipient.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "./Component.sol";

/// @title MetaTxComponent
/// @author Aragon Association - 2022
/// @notice Specialized base component in the Aragon App DAO framework supporting meta transactions.
abstract contract MetaTxComponent is Component, BaseRelayRecipient {
    /// @notice The ID of the permission required to call the `setTrustedForwarder` function.
    bytes32 public constant SET_TRUSTED_FORWARDER_PERMISSION_ID =
        keccak256("SET_TRUSTED_FORWARDER_PERMISSION");

    /// @notice Emitted when the trusted forwarder is set.
    /// @param trustedForwarder The trusted forwarder address.
    event TrustedForwarderSet(address trustedForwarder);

    /// @notice Initializes the contract by initializing the underlying `Component`, registering the contract's [ERC-165](https://eips.ethereum.org/EIPS/eip-165) interface ID and setting the trusted forwarder.
    /// @dev This method is required to support [ERC-1822](https://eips.ethereum.org/EIPS/eip-1822).
    /// @param _dao The associated DAO address.
    /// @param _trustedForwarder The address of the trusted forwarder verifying the meta transactions.
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

    /// @notice Overrides '_msgSender()' from 'Component'->'ContextUpgradeable' with that of 'BaseRelayRecipient'.
    function _msgSender()
        internal
        view
        override(ContextUpgradeable, BaseRelayRecipient)
        returns (address)
    {
        return BaseRelayRecipient._msgSender();
    }

    /// @notice Overrides '_msgData()' from 'Component'->'ContextUpgradeable' with that of 'BaseRelayRecipient'.
    function _msgData()
        internal
        view
        override(ContextUpgradeable, BaseRelayRecipient)
        returns (bytes calldata)
    {
        return BaseRelayRecipient._msgData();
    }

    /// @notice Setter for the trusted forwarder verifying the meta transaction.
    /// @param _trustedForwarder The trusted forwarder address.
    function setTrustedForwarder(address _trustedForwarder)
        public
        virtual
        auth(SET_TRUSTED_FORWARDER_PERMISSION_ID)
    {
        _setTrustedForwarder(_trustedForwarder);

        emit TrustedForwarderSet(_trustedForwarder);
    }
}
