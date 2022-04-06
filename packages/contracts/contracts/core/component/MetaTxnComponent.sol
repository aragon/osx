// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";

import "./Component.sol";

/// @title Base component in the Aragon DAO framework supporting meta transactions
/// @author Michael Heuer - Aragon Association - 2022
/// @notice Any component within the Aragon DAO framework using meta transactions has to inherit from this contract
abstract contract MetaTxnComponent is Component, BaseRelayRecipient {
    /// @notice Role identifer to change the GSN forwarder
    bytes32 public constant MODIFY_TRUSTED_FORWARDER = keccak256("MODIFY_TRUSTED_FORWARDER");

    event SetTrustedForwarder(address _newForwarder);

    /// @notice Initialization
    /// @param _dao the associated DAO address
    /// @param _trustedForwarder the trusted forwarder address who verifies the meta transaction
    function __MetaTxnComponent_init(IDAO _dao, address _trustedForwarder) internal virtual onlyInitializing {
        __Component_init(_dao);

        if(_trustedForwarder != address(0)) {
            _setTrustedForwarder(_trustedForwarder);

            emit SetTrustedForwarder(_trustedForwarder);
        }

        _registerStandard(type(MetaTxnComponent).interfaceId);
    }

    /// @notice overrides '_msgSender()' from 'Component'->'ContextUpgradeable' with that of 'BaseRelayRecipient'
    function _msgSender() internal override(ContextUpgradeable, BaseRelayRecipient) view returns (address) {
        return BaseRelayRecipient._msgSender();
    }

    /// @notice overrides '_msgData()' from 'Component'->'ContextUpgradeable' with that of 'BaseRelayRecipient'
    function _msgData() internal override(ContextUpgradeable, BaseRelayRecipient) view returns (bytes calldata) {
        return BaseRelayRecipient._msgData();
    }

    /// @notice Setter for the trusted forwarder who verifies the meta transaction
    /// @param _trustedForwarder the trusted forwarder address
    /// @dev used to update the trusted forwarder
    function setTrustedForwarder(address _trustedForwarder) public virtual auth(MODIFY_TRUSTED_FORWARDER) {
        _setTrustedForwarder(_trustedForwarder);

        emit SetTrustedForwarder(_trustedForwarder);
    }
}
