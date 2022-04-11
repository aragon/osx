// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@opengsn/contracts/src/BaseRelayRecipient.sol";

import "./Component.sol";

/// @dev Used to silence compiler warning in order to call trustedForwarder() on the DAO
interface Relay {
    function trustedForwarder() external view returns (address);
}

/// @title Base component in the Aragon DAO framework supporting meta transactions
/// @author Michael Heuer - Aragon Association - 2022
/// @notice Any component within the Aragon DAO framework using meta transactions has to inherit from this contract
abstract contract MetaTxComponent is Component, BaseRelayRecipient {
    /// @notice Role identifer to change the GSN forwarder
    bytes32 public constant MODIFY_TRUSTED_FORWARDER = keccak256("MODIFY_TRUSTED_FORWARDER");

    event SetTrustedForwarder(address _newForwarder);

    /// @notice Initialization
    /// @param _dao the associated DAO address
    /// @param _trustedForwarder the trusted forwarder address who verifies the meta transaction
    function __MetaTxComponent_init(IDAO _dao, address _trustedForwarder) internal virtual onlyInitializing {
        __Component_init(_dao);

        if(_trustedForwarder != address(0)) {
            _setTrustedForwarder(_trustedForwarder);

            emit SetTrustedForwarder(_trustedForwarder);
        }

        _registerStandard(type(MetaTxComponent).interfaceId);
    }

    /// @notice overrides '_msgSender()' from 'Component'->'ContextUpgradeable' with that of 'BaseRelayRecipient'
    function _msgSender() internal override(ContextUpgradeable, BaseRelayRecipient) view returns (address) {
        return BaseRelayRecipient._msgSender();
    }

    /// @notice overrides '_msgData()' from 'Component'->'ContextUpgradeable' with that of 'BaseRelayRecipient'
    function _msgData() internal override(ContextUpgradeable, BaseRelayRecipient) view returns (bytes calldata) {
        return BaseRelayRecipient._msgData();
    }

    /// @notice used to check the trusted forwarder in the dao in case it's not set on the component itself.
    /// @return bool true in case the caller is the trusted forwarder
    function isTrustedForwarder(address _forwarder) public virtual override view returns(bool) {
        address forwarder = trustedForwarder();

        if(forwarder == address(0)) {
            forwarder = Relay(address(dao)).trustedForwarder();
        }

        return forwarder == _forwarder;
    }

    /// @notice Setter for the trusted forwarder who verifies the meta transaction
    /// @param _trustedForwarder the trusted forwarder address
    /// @dev used to update the trusted forwarder
    function setTrustedForwarder(address _trustedForwarder) public virtual auth(MODIFY_TRUSTED_FORWARDER) {
        _setTrustedForwarder(_trustedForwarder);

        emit SetTrustedForwarder(_trustedForwarder);
    }
}
