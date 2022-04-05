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

    /// @dev Used for UUPS upgradability pattern
    function __MetaTxnComponent_init(IDAO _dao, address _trustedForwarder) internal virtual {
    function __MetaTxnComponent_init(IDAO _dao, address _trustedForwarder) internal virtual initializer {
        __Component_init(_dao);

        if(_trustedForwarder != address(0)) {
            _setTrustedForwarder(_trustedForwarder);

            emit SetTrustedForwarder(_trustedForwarder);
        }

        _registerStandard(type(MetaTxnComponent).interfaceId);
    }

    function _msgSender() internal override(BaseRelayRecipient, MetaTxnCompatible) view returns (address) {
        return BaseRelayRecipient._msgSender();
    }

    function _msgData() internal override(BaseRelayRecipient, MetaTxnCompatible) view returns (bytes calldata) {
        return BaseRelayRecipient._msgData();
    }

    /// @dev used to update the trusted forwarder.
    function setTrustedForwarder(address _trustedForwarder) public virtual auth(MODIFY_TRUSTED_FORWARDER) {
        _setTrustedForwarder(_trustedForwarder);

        emit SetTrustedForwarder(_trustedForwarder);
    }

    /// @dev Used to check the permissions within the upgradability pattern implementation of OZ
    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_ROLE) { }

}
