/*
 * SPDX-License-Identifier:    MIT
 */

pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

import "../../core/IDAO.sol";
import "../../core/acl/ACL.sol";

import "./AppStorage.sol";

abstract contract AragonApp is AppStorage, UUPSUpgradeable, ContextUpgradeable {
    bytes32 public constant UPGRADE_ROLE = keccak256("UPGRADE_ROLE");

    error CantUpdate();

    /// @dev Auth modifier used in all components of a DAO to check the permissions.
    /// @param _role The hash of the role identifier
    modifier auth(bytes32 _role) {
        IDAO dao = dao();
        if (!dao.hasPermission(address(this), _msgSender(), _role, _msgData())) {
            revert ACLData.ACLAuth({
                here: address(this),
                where: address(this),
                who: _msgSender(),
                role: _role
            });
        }
        _;
    }

    /// @dev The modifier that only allows `update` to be called once per each upgrade.
    modifier updateOnlyOnce() {
        if (updateNotAllowed()) revert CantUpdate();

        setUpdateNotAllowed(true);
        _;
    }

    /// @dev Used to check the permissions within the upgradability pattern implementation of OZ
    function _authorizeUpgrade(address) internal virtual override auth(UPGRADE_ROLE) {}

    /// @dev the function that logic contract has to include for the custom logic.
    /// TODO: do we want to enforce this inside logic contracts ? if so, even when the first
    /// v1.0.0 is developed, they would need to include this without body.. Maybe we don't reinforce
    /// and up to the dev to include it or not. Problem with NOT reinforcing seems to be that
    /// in v1.1.0, dev might include it and in v1.2.0 dev mightn't include it even though it's Highly needed.
    function _update(uint256 oldVersion, bytes memory data) internal virtual;

    /// @notice The `initialize` kind of function that gets called for upgrades.
    /// @dev Inheritting contracts must override _update to include what logic they want to run per each update.
    /// @param oldVersion The old version of logic contract
    /// @param data update initialize data.. updateLogic should decode this per its rules...
    function update(uint256 oldVersion, bytes memory data)
        external
        virtual
        updateOnlyOnce
        onlyProxy
    {
        _update(oldVersion, data);
    }

    /// @dev This is for the front-end to detect what arguments it needs to provide to the update function.
    /// TODO: if the we make `_update` reinforced, then we also do this as reinforced
    function updateSignatureABI() external view virtual returns (string memory);

    function getDependencies() external virtual returns (IDAO.DAOPlugin[] memory);

    /**
     * @dev Upgrade the implementation of the proxy to `newImplementation`, and subsequently execute the function call
     * encoded in `data`. NOTE: overrides the OZ's `upgradeToAndCall` to include the custom logic in the end.
     */
    function upgradeToAndCall(address newImplementation, bytes memory data)
        external
        payable
        virtual
        override
        onlyProxy
    {
        _authorizeUpgrade(newImplementation);
        _upgradeToAndCallUUPS(newImplementation, data, true);

        setUpdateNotAllowed(false);
    }
}
