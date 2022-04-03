/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@opengsn/contracts/src/BaseRelayRecipient.sol";
import "@opengsn/contracts/src/interfaces/IRelayRecipient.sol";
import "./Component.sol";

/// @dev Used to silence compiler warning in order to call trustedForwarder() on the DAO
interface Relay {
    function trustedForwarder() external view returns (address);
}


// component => permissions => BaseRelayRecipient, AdaptiveERC165, UUPSUpgradable, Initializable

/// @title The base component in the Aragon DAO framework
/// @author Samuel Furter - Aragon Association - 2021
/// @notice The component any component within the Aragon DAO framework has to inherit from the leverage the architecture existing.

abstract contract MetaTxnEnabledComponent is Component, BaseRelayRecipient {
    /// @notice Role identifer to change the GSN forwarder
    bytes32 public constant MODIFY_TRUSTED_FORWARDER = keccak256("MODIFY_TRUSTED_FORWARDER");

    event SetTrustedForwarder(address _newForwarder);

    /// @dev Used for UUPS upgradability pattern
    function __Component_init(IDAO _dao, address _trustedForwarder) internal virtual {
        __Component_init(_dao);

        if(_trustedForwarder != address(0)) {
            _setTrustedForwarder(_trustedForwarder);

            emit SetTrustedForwarder(_trustedForwarder);
        }

        _registerStandard(type(MetaTxnComponent).interfaceId);
    }

    function msgSender() internal override view returns (address) {
        return _msgSender();
    }

    function msgData() internal override view returns (bytes) {
        return _msgData();
    }

    /// @dev used to update the trusted forwarder.
    function setTrustedForwarder(address _trustedForwarder) public virtual auth(MODIFY_TRUSTED_FORWARDER) {
        _setTrustedForwarder(_trustedForwarder);

        emit SetTrustedForwarder(_trustedForwarder);
    }

    /// @dev Used to check the permissions within the upgradability pattern implementation of OZ
    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_ROLE) { }

}
