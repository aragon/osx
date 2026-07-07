// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {PluginSetup} from "../../../../src/common/plugin/setup/PluginSetup.sol";
import {PluginUpgradeableSetup} from "../../../../src/common/plugin/setup/PluginUpgradeableSetup.sol";
import {IPluginSetup} from "../../../../src/common/plugin/setup/IPluginSetup.sol";
import {IPlugin} from "../../../../src/common/plugin/IPlugin.sol";
import {IProtocolVersion} from "../../../../src/common/utils/versioning/IProtocolVersion.sol";
import {PluginCloneableSetupMockBuild1} from "../../../mocks/commons/plugin/PluginCloneableSetupMock.sol";
import {
    PluginUUPSUpgradeableSetupMockBuild1,
    PluginUUPSUpgradeableSetupMockBuild2
} from "../../../mocks/commons/plugin/PluginUUPSUpgradeableSetupMock.sol";

/// @dev Shared shape both setup-mock variants expose for the base tests.
interface IPluginSetupLike {
    function supportsInterface(bytes4) external view returns (bool);
    function protocolVersion() external view returns (uint8[3] memory);
    function implementation() external view returns (address);
}

/// @notice Direct tests for `PluginSetup`, `PluginUpgradeableSetup`, and the
/// `IPluginSetup` interface in `src/common/plugin/setup/`.
///
/// Ports `osx-commons/contracts/test/plugin/setup/plugin-setup.ts` (192 lines,
/// 10 cases). Subsumes the OSx-side `framework/plugin/plugin-setup.ts` (the
/// same ERC-165 + protocol-version surface, exercised via the cloneable mock).
abstract contract PluginSetupSharedTest is Test {
    IPluginSetupLike internal setupMock;

    function _deploySetupMock() internal virtual returns (IPluginSetupLike);
    function _expectedImplementationInterface() internal virtual returns (bytes4);

    function setUp() public virtual {
        setupMock = _deploySetupMock();
    }

    function test_implementation_returnsNonZeroAddress() public view {
        address impl = setupMock.implementation();
        assertTrue(impl != address(0));
    }

    function test_implementation_supportsIPlugin() public view {
        address impl = setupMock.implementation();
        assertTrue(IERC165(impl).supportsInterface(type(IPlugin).interfaceId));
    }

    function test_protocolVersion_returnsCurrent() public view {
        uint8[3] memory v = setupMock.protocolVersion();
        assertEq(v[0], 1);
        assertEq(v[1], 4);
        assertEq(v[2], 0);
    }

    function test_supportsInterface_ERC165() public view {
        assertTrue(setupMock.supportsInterface(type(IERC165).interfaceId));
    }

    function test_supportsInterface_IPluginSetup() public view {
        assertTrue(setupMock.supportsInterface(type(IPluginSetup).interfaceId));
    }

    function test_supportsInterface_IProtocolVersion() public view {
        assertTrue(setupMock.supportsInterface(type(IProtocolVersion).interfaceId));
    }

    function test_supportsInterface_returnsFalseForUnknownInterface() public view {
        assertFalse(setupMock.supportsInterface(0xdeadbeef));
    }

    /// Two instances of the same setup variant each carry their OWN
    /// `IMPLEMENTATION` immutable — confirms the immutable is per-instance
    /// (each constructor runs and stores its own impl), not a shared static.
    function test_implementation_isPerInstance() public {
        IPluginSetupLike other = _deploySetupMock();
        assertTrue(
            setupMock.implementation() != other.implementation(),
            "each setup instance must hold its own implementation"
        );
    }
}

/// @notice Non-upgradeable `PluginSetup` variant (via the cloneable mock).
contract PluginSetupTest is PluginSetupSharedTest {
    function _deploySetupMock() internal override returns (IPluginSetupLike) {
        return IPluginSetupLike(address(new PluginCloneableSetupMockBuild1()));
    }

    function _expectedImplementationInterface() internal pure override returns (bytes4) {
        return type(IPlugin).interfaceId;
    }

    function test_prepareUpdate_revertsForNonUpgradeablePlugin() public {
        PluginCloneableSetupMockBuild1 mock = PluginCloneableSetupMockBuild1(address(setupMock));
        IPluginSetup.SetupPayload memory payload =
            IPluginSetup.SetupPayload({plugin: address(2), currentHelpers: new address[](0), data: bytes("")});
        vm.expectRevert(PluginSetup.NonUpgradeablePlugin.selector);
        mock.prepareUpdate(address(1), uint16(123), payload);
    }

    function test_prepareUpdate_revertsForAnyFromBuild() public {
        // Lock the "always-reverts" contract semantics: every from-build input
        // takes the revert path.
        PluginCloneableSetupMockBuild1 mock = PluginCloneableSetupMockBuild1(address(setupMock));
        IPluginSetup.SetupPayload memory payload =
            IPluginSetup.SetupPayload({plugin: address(2), currentHelpers: new address[](0), data: bytes("")});

        uint16[3] memory froms = [uint16(0), uint16(1), uint16(type(uint16).max)];
        for (uint256 i = 0; i < froms.length; i++) {
            vm.expectRevert(PluginSetup.NonUpgradeablePlugin.selector);
            mock.prepareUpdate(address(1), froms[i], payload);
        }
    }
}

/// @notice Upgradeable `PluginUpgradeableSetup` variant.
contract PluginUpgradeableSetupTest is PluginSetupSharedTest {
    function _deploySetupMock() internal override returns (IPluginSetupLike) {
        return IPluginSetupLike(address(new PluginUUPSUpgradeableSetupMockBuild1()));
    }

    function _expectedImplementationInterface() internal pure override returns (bytes4) {
        return type(IPlugin).interfaceId;
    }

    function test_prepareUpdate_revertsOnInitialBuild() public {
        PluginUUPSUpgradeableSetupMockBuild1 build1 = PluginUUPSUpgradeableSetupMockBuild1(address(setupMock));
        IPluginSetup.SetupPayload memory payload =
            IPluginSetup.SetupPayload({plugin: address(2), currentHelpers: new address[](0), data: bytes("")});

        // Build1's override reverts `InvalidUpdatePath(fromBuild: 0, thisBuild: 1)`
        // regardless of the actual `_fromBuild` argument.
        vm.expectRevert(abi.encodeWithSelector(PluginUpgradeableSetup.InvalidUpdatePath.selector, uint16(0), uint16(1)));
        build1.prepareUpdate(address(1), uint16(0), payload);
    }

    function test_prepareUpdate_succeedsOnNonInitialBuild() public {
        // Build2's override allows updates from Build1.
        PluginUUPSUpgradeableSetupMockBuild2 build2 = new PluginUUPSUpgradeableSetupMockBuild2();
        IPluginSetup.SetupPayload memory payload =
            IPluginSetup.SetupPayload({plugin: address(2), currentHelpers: new address[](0), data: bytes("")});
        build2.prepareUpdate(address(1), uint16(123), payload);
    }
}

/// @notice Direct IPluginSetup interface-ID lock: the v1.0.0 frozen value
/// must still match the current `type(IPluginSetup).interfaceId`.
contract IPluginSetupInterfaceIdTest is Test {
    /// Frozen v1.0.0 iface ID, computed by XOR'ing the four function
    /// selectors of `IPluginSetup` (prepareInstallation, prepareUpdate,
    /// prepareUninstallation, implementation). Verified inline below.
    bytes4 internal constant IPLUGIN_SETUP_V1_0_0_INTERFACE_ID =
        bytes4(0xf10832f1) ^ bytes4(0xa8a9c29e) ^ bytes4(0x9cb0a124) ^ bytes4(0x5c60da1b);

    function test_IPluginSetup_currentMatchesV1_0_0() public pure {
        assertEq(type(IPluginSetup).interfaceId, IPLUGIN_SETUP_V1_0_0_INTERFACE_ID);
    }

    function test_IPluginSetup_interfaceIdIsNotEmpty() public pure {
        assertTrue(type(IPluginSetup).interfaceId != bytes4(0));
    }
}
