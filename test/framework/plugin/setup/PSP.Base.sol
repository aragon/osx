// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, Vm} from "forge-std/Test.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {ENSRegistry} from "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {DAO} from "../../../../src/core/dao/DAO.sol";
import {DAOMock} from "../../../mocks/commons/dao/DAOMock.sol";
import {ENSSubdomainRegistrar} from "../../../../src/framework/utils/ens/ENSSubdomainRegistrar.sol";
import {PluginRepoRegistry} from "../../../../src/framework/plugin/repo/PluginRepoRegistry.sol";
import {PluginRepoFactory} from "../../../../src/framework/plugin/repo/PluginRepoFactory.sol";
import {PluginRepo} from "../../../../src/framework/plugin/repo/PluginRepo.sol";
import {PluginSetupProcessor} from "../../../../src/framework/plugin/setup/PluginSetupProcessor.sol";
import {PluginSetupRef} from "../../../../src/framework/plugin/setup/PluginSetupProcessorHelpers.sol";
import {IDAO} from "../../../../src/common/dao/IDAO.sol";
import {MockResolver} from "../../member/mocks/MockResolver.sol";

import {
    PluginUUPSUpgradeableSetupV1Mock,
    PluginUUPSUpgradeableSetupV1MockBad,
    PluginUUPSUpgradeableSetupV2Mock,
    PluginUUPSUpgradeableSetupV3Mock,
    PluginUUPSUpgradeableSetupV4Mock
} from "../../../mocks/plugin/UUPSUpgradeable/PluginUUPSUpgradeableSetupMock.sol";
import {
    PluginUUPSUpgradeableV1Mock,
    PluginUUPSUpgradeableV2Mock,
    PluginUUPSUpgradeableV3Mock
} from "../../../mocks/plugin/UUPSUpgradeable/PluginUUPSUpgradeableMock.sol";
import {
    PluginCloneableSetupV1Mock,
    PluginCloneableSetupV2Mock
} from "../../../mocks/plugin/Cloneable/PluginCloneableSetupMock.sol";
import {PluginCloneableV1Mock, PluginCloneableV2Mock} from "../../../mocks/plugin/Cloneable/PluginCloneableMock.sol";

/// @notice Shared scaffolding for the four PSP test files (Installation,
/// Uninstallation, Update, UpdateScenarios). Deploys a real ENS stack, real
/// `PluginRepoRegistry`, real `PluginSetupProcessor`, real `PluginRepoFactory`,
/// publishes builds 1–4 of an UUPS plugin family AND builds 1–2 of a
/// Cloneable (non-upgradeable) family, then deploys a fresh `DAO` under test.
/// Helper builders provide common `PrepareInstallationParams`,
/// `ApplyInstallationParams`, etc. PSP starts WITHOUT ROOT on the DAO — each
/// test contract grants ROOT via `_grantPspRoot()` to mirror the production
/// just-in-time pattern from `DAOFactory`.
abstract contract PSPBaseTest is Test {
    bytes32 internal constant ROOT_PERMISSION_ID = keccak256("ROOT_PERMISSION");
    bytes32 internal constant EXECUTE_PERMISSION_ID = keccak256("EXECUTE_PERMISSION");
    bytes32 internal constant APPLY_INSTALLATION_PERMISSION_ID = keccak256("APPLY_INSTALLATION_PERMISSION");
    bytes32 internal constant APPLY_UPDATE_PERMISSION_ID = keccak256("APPLY_UPDATE_PERMISSION");
    bytes32 internal constant APPLY_UNINSTALLATION_PERMISSION_ID = keccak256("APPLY_UNINSTALLATION_PERMISSION");
    bytes32 internal constant UPGRADE_PLUGIN_PERMISSION_ID = keccak256("UPGRADE_PLUGIN_PERMISSION");
    bytes32 internal constant MAINTAINER_PERMISSION_ID = keccak256("MAINTAINER_PERMISSION");

    bytes32 internal constant DAO_ETH_NODE = 0x4adec6e9f748b29857b9a275dcb59bd0254a069a7e20cab4ec591499254f119a;
    bytes32 internal constant ETH_LABEL = keccak256("eth");
    bytes32 internal constant DAO_LABEL = keccak256("dao");

    // Framework infra (managing DAO is a mock with allow-all to skip cross-component grants)
    DAOMock internal managingDao;
    ENSRegistry internal ens;
    MockResolver internal resolver;
    ENSSubdomainRegistrar internal subdomainRegistrar;
    PluginRepoRegistry internal pluginRepoRegistry;
    PluginRepoFactory internal pluginRepoFactory;
    PluginSetupProcessor internal psp;

    // DAO under test (real DAO, owner = address(this))
    DAO internal dao;
    address internal owner;

    // UUPS plugin family — builds 1..4 published on `uupsRepo`
    PluginRepo internal uupsRepo;
    PluginUUPSUpgradeableSetupV1Mock internal setupV1;
    PluginUUPSUpgradeableSetupV2Mock internal setupV2;
    PluginUUPSUpgradeableSetupV3Mock internal setupV3;
    PluginUUPSUpgradeableSetupV4Mock internal setupV4;
    PluginUUPSUpgradeableSetupV1MockBad internal setupV1Bad;

    // Cloneable (non-upgradeable) family — builds 1..2 on `cloneableRepo`
    PluginRepo internal cloneableRepo;
    PluginCloneableSetupV1Mock internal cloneableSetupV1;
    PluginCloneableSetupV2Mock internal cloneableSetupV2;

    function setUp() public virtual {
        owner = address(this);

        // ---- ENS stack ----
        managingDao = new DAOMock();
        managingDao.setHasPermissionReturnValueMock(true);
        ens = new ENSRegistry();
        resolver = new MockResolver(ENS(address(ens)));
        ens.setSubnodeRecord(bytes32(0), ETH_LABEL, address(this), address(resolver), 0);
        ens.setSubnodeRecord(
            keccak256(abi.encodePacked(bytes32(0), ETH_LABEL)), DAO_LABEL, address(this), address(resolver), 0
        );
        ENSSubdomainRegistrar registrarImpl = new ENSSubdomainRegistrar();
        subdomainRegistrar = ENSSubdomainRegistrar(address(new ERC1967Proxy(address(registrarImpl), "")));
        ens.setOwner(DAO_ETH_NODE, address(subdomainRegistrar));
        subdomainRegistrar.initialize(IDAO(address(managingDao)), ENS(address(ens)), DAO_ETH_NODE);

        // ---- Registries + PSP + Factory ----
        PluginRepoRegistry pluginRepoRegistryImpl = new PluginRepoRegistry();
        pluginRepoRegistry = PluginRepoRegistry(
            address(
                new ERC1967Proxy(
                    address(pluginRepoRegistryImpl),
                    abi.encodeCall(PluginRepoRegistry.initialize, (IDAO(address(managingDao)), subdomainRegistrar))
                )
            )
        );
        psp = new PluginSetupProcessor(pluginRepoRegistry);
        pluginRepoFactory = new PluginRepoFactory(pluginRepoRegistry);

        // ---- Deploy V1..V4 UUPS setups + publish on a single repo ----
        PluginUUPSUpgradeableV1Mock pluginImplV1 = new PluginUUPSUpgradeableV1Mock();
        PluginUUPSUpgradeableV2Mock pluginImplV2 = new PluginUUPSUpgradeableV2Mock();
        PluginUUPSUpgradeableV3Mock pluginImplV3 = new PluginUUPSUpgradeableV3Mock();
        setupV1 = new PluginUUPSUpgradeableSetupV1Mock(address(pluginImplV1));
        setupV2 = new PluginUUPSUpgradeableSetupV2Mock(address(pluginImplV2));
        setupV3 = new PluginUUPSUpgradeableSetupV3Mock(address(pluginImplV3));
        // V4 intentionally reuses V3's implementation address to exercise the
        // `currentImpl == newImpl` UI-only path in `applyUpdate` (F11).
        setupV4 = new PluginUUPSUpgradeableSetupV4Mock(address(pluginImplV3));
        setupV1Bad = new PluginUUPSUpgradeableSetupV1MockBad(address(pluginImplV1));

        uupsRepo = pluginRepoFactory.createPluginRepoWithFirstVersion(
            "uups-mock-family", address(setupV1), owner, hex"11", hex"11"
        );
        uupsRepo.createVersion(1, address(setupV2), hex"22", hex"");
        uupsRepo.createVersion(1, address(setupV3), hex"33", hex"");
        uupsRepo.createVersion(1, address(setupV4), hex"44", hex"");
        // Build 5 is the "Bad" variant (always returns `plugin = address(0)`) —
        // used by tests that need a deterministic plugin address across calls.
        uupsRepo.createVersion(1, address(setupV1Bad), hex"55", hex"");

        // ---- Cloneable family (for the "non-upgradeable plugin" path) ----
        PluginCloneableV1Mock cloneImplV1 = new PluginCloneableV1Mock();
        PluginCloneableV2Mock cloneImplV2 = new PluginCloneableV2Mock();
        cloneableSetupV1 = new PluginCloneableSetupV1Mock(address(cloneImplV1));
        cloneableSetupV2 = new PluginCloneableSetupV2Mock(address(cloneImplV2));
        cloneableRepo = pluginRepoFactory.createPluginRepoWithFirstVersion(
            "cloneable-mock-family", address(cloneableSetupV1), owner, hex"11", hex"11"
        );
        cloneableRepo.createVersion(1, address(cloneableSetupV2), hex"22", hex"");

        // ---- DAO under test (real) ----
        DAO daoImpl = new DAO();
        dao = DAO(
            payable(address(
                    new ERC1967Proxy(
                        address(daoImpl),
                        abi.encodeCall(DAO.initialize, (hex"0001", owner, address(0), "https://example.org"))
                    )
                ))
        );
    }

    // -------------------------------------------------------------------------
    // Permission helpers — mirror the production just-in-time grant pattern.
    // -------------------------------------------------------------------------

    function _grantPspRoot() internal {
        dao.grant(address(dao), address(psp), ROOT_PERMISSION_ID);
    }

    function _revokePspRoot() internal {
        dao.revoke(address(dao), address(psp), ROOT_PERMISSION_ID);
    }

    function _grantApplyInstallation(address who) internal {
        dao.grant(address(psp), who, APPLY_INSTALLATION_PERMISSION_ID);
    }

    function _grantApplyUpdate(address who) internal {
        dao.grant(address(psp), who, APPLY_UPDATE_PERMISSION_ID);
    }

    function _grantApplyUninstallation(address who) internal {
        dao.grant(address(psp), who, APPLY_UNINSTALLATION_PERMISSION_ID);
    }

    // -------------------------------------------------------------------------
    // Param builders — keep call sites lean.
    // -------------------------------------------------------------------------

    function _ref(uint16 build) internal view returns (PluginSetupRef memory) {
        return PluginSetupRef({versionTag: PluginRepo.Tag({release: 1, build: build}), pluginSetupRepo: uupsRepo});
    }

    function _refCloneable(uint16 build) internal view returns (PluginSetupRef memory) {
        return PluginSetupRef({versionTag: PluginRepo.Tag({release: 1, build: build}), pluginSetupRepo: cloneableRepo});
    }

    function _prepareInstallParams(uint16 build, bytes memory data)
        internal
        view
        returns (PluginSetupProcessor.PrepareInstallationParams memory)
    {
        return PluginSetupProcessor.PrepareInstallationParams({pluginSetupRef: _ref(build), data: data});
    }
}
