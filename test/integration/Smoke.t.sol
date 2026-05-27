// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test} from "forge-std/Test.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {ENSRegistry} from "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IPluginSetup} from "@aragon/osx-commons-contracts/src/plugin/setup/IPluginSetup.sol";

import {DAOFactory} from "../../src/framework/dao/DAOFactory.sol";
import {DAORegistry} from "../../src/framework/dao/DAORegistry.sol";
import {PluginRepoRegistry} from "../../src/framework/plugin/repo/PluginRepoRegistry.sol";
import {PluginRepoFactory} from "../../src/framework/plugin/repo/PluginRepoFactory.sol";
import {PluginRepo} from "../../src/framework/plugin/repo/PluginRepo.sol";
import {PluginSetupProcessor} from "../../src/framework/plugin/setup/PluginSetupProcessor.sol";
import {PluginSetupRef, hashHelpers} from "../../src/framework/plugin/setup/PluginSetupProcessorHelpers.sol";
import {ENSSubdomainRegistrar} from "../../src/framework/utils/ens/ENSSubdomainRegistrar.sol";
import {DAO} from "../../src/core/dao/DAO.sol";
import {IDAO} from "../../src/common/dao/IDAO.sol";
import {PermissionManager} from "../../src/core/permission/PermissionManager.sol";
import {DaoUnauthorized} from "../../src/common/permission/auth/auth.sol";
import {Action} from "../../src/common/executors/IExecutor.sol";
import {DAOMock} from "../mocks/commons/dao/DAOMock.sol";
import {MockResolver} from "../framework/member/mocks/MockResolver.sol";
import {DummyApprovalPluginV1, DummyApprovalPluginV2} from "./dummy-plugin/DummyApprovalPlugin.sol";
import {DummyApprovalPluginSetupV1, DummyApprovalPluginSetupV2} from "./dummy-plugin/DummyApprovalPluginSetup.sol";

/// @dev DUMMY sink for proposal actions — tracks the last value the DAO
/// was instructed to record. Used only to observe end-effects in the smoke
/// tests.
contract DummyProposalSink {
    uint256 public lastValue;

    function record(uint256 _x) external {
        lastValue = _x;
    }
}

/// @notice End-to-end smoke tests for the full OSx happy path. Composes
/// ENS + Registries + PSP + Factories + the dummy upgradeable plugin and
/// walks through realistic user journeys. The plugin used here is a
/// deliberately minimal test fixture (see DummyApprovalPlugin.sol) — NOT
/// a real governance plugin.
contract SmokeTest is Test {
    bytes32 internal constant ETH_LABEL = keccak256("eth");
    bytes32 internal constant DAO_LABEL = keccak256("dao");
    bytes32 internal constant DAO_ETH_NODE = 0x4adec6e9f748b29857b9a275dcb59bd0254a069a7e20cab4ec591499254f119a;
    bytes32 internal constant ROOT_PERMISSION_ID = keccak256("ROOT_PERMISSION");
    bytes32 internal constant MAINTAINER_PERMISSION_ID = keccak256("MAINTAINER_PERMISSION");
    bytes32 internal constant EXECUTE_PERMISSION_ID = keccak256("EXECUTE_PERMISSION");
    bytes32 internal constant APPLY_INSTALLATION_PERMISSION_ID = keccak256("APPLY_INSTALLATION_PERMISSION");
    bytes32 internal constant APPLY_UPDATE_PERMISSION_ID = keccak256("APPLY_UPDATE_PERMISSION");
    bytes32 internal constant APPLY_UNINSTALLATION_PERMISSION_ID = keccak256("APPLY_UNINSTALLATION_PERMISSION");
    bytes32 internal constant UPGRADE_PLUGIN_PERMISSION_ID = keccak256("UPGRADE_PLUGIN_PERMISSION");

    DAOMock internal managingDao;
    ENSRegistry internal ens;
    MockResolver internal resolver;
    ENSSubdomainRegistrar internal subdomainRegistrar;
    DAORegistry internal daoRegistry;
    PluginRepoRegistry internal pluginRepoRegistry;
    PluginSetupProcessor internal psp;
    PluginRepoFactory internal pluginRepoFactory;
    DAOFactory internal daoFactory;

    function setUp() public {
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

        DAORegistry daoRegistryImpl = new DAORegistry();
        daoRegistry = DAORegistry(
            address(
                new ERC1967Proxy(
                    address(daoRegistryImpl),
                    abi.encodeCall(DAORegistry.initialize, (IDAO(address(managingDao)), subdomainRegistrar))
                )
            )
        );

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
        daoFactory = new DAOFactory(daoRegistry, psp);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    function _publishDummyRepoV1(address maintainer, string memory subdomain)
        internal
        returns (PluginRepo repo, DummyApprovalPluginSetupV1 setupV1)
    {
        setupV1 = new DummyApprovalPluginSetupV1();
        repo = pluginRepoFactory.createPluginRepoWithFirstVersion(
            subdomain, address(setupV1), maintainer, hex"00", hex"00"
        );
    }

    function _createDaoWithPlugin(
        PluginRepo repo,
        string memory subdomain,
        address proposer,
        address approver
    )
        internal
        returns (DAO dao, DummyApprovalPluginV1 plugin, DAOFactory.InstalledPlugin memory installed)
    {
        DAOFactory.PluginSettings[] memory plugins = new DAOFactory.PluginSettings[](1);
        plugins[0] = DAOFactory.PluginSettings({
            pluginSetupRef: PluginSetupRef({
                versionTag: PluginRepo.Tag({release: 1, build: 1}), pluginSetupRepo: repo
            }),
            data: abi.encode(proposer, approver)
        });
        DAOFactory.InstalledPlugin[] memory ip;
        (dao, ip) = daoFactory.createDao(
            DAOFactory.DAOSettings({
                trustedForwarder: address(0),
                daoURI: "https://example.org",
                subdomain: subdomain,
                metadata: hex"0000"
            }),
            plugins
        );
        plugin = DummyApprovalPluginV1(ip[0].plugin);
        installed = ip[0];
    }

    // -------------------------------------------------------------------------
    // SMOKE-1: Create DAO + install dummy plugin + propose + approve + execute
    // -------------------------------------------------------------------------

    /// Full lifecycle from a user's perspective: spin up a DAO with the
    /// dummy single-approval plugin, propose an on-chain action, approve
    /// it, execute, and verify the side effect lands on a sink contract.
    function test_smoke1_proposeApproveExecute() public {
        address proposer = makeAddr("proposer");
        address approver = makeAddr("approver");

        (PluginRepo repo,) = _publishDummyRepoV1(address(this), "dummy-repo-1");
        (, DummyApprovalPluginV1 plugin,) = _createDaoWithPlugin(repo, "smoke1-dao", proposer, approver);

        // The proposal: have the DAO call DummyProposalSink.record(42).
        DummyProposalSink sink = new DummyProposalSink();
        Action[] memory actions = new Action[](1);
        actions[0] =
            Action({to: address(sink), value: 0, data: abi.encodeCall(DummyProposalSink.record, (42))});

        // 1. Propose
        vm.prank(proposer);
        plugin.propose(actions);
        assertTrue(plugin.hasProposal());
        assertFalse(plugin.approved());

        // 2. Pre-approval execute attempt reverts.
        vm.expectRevert(DummyApprovalPluginV1.MissingApproval.selector);
        plugin.executeAfterApproval();

        // 3. Approve
        vm.prank(approver);
        plugin.approve();
        assertTrue(plugin.approved());

        // 4. Execute (anyone)
        assertEq(sink.lastValue(), 0, "side effect not yet observable");
        plugin.executeAfterApproval();
        assertEq(sink.lastValue(), 42, "DAO forwarded DummyProposalSink.record(42)");

        // Proposal state reset post-execute.
        assertFalse(plugin.hasProposal());
        assertFalse(plugin.approved());
    }

    /// Role gating: PROPOSE_PERMISSION and APPROVE_PERMISSION are distinct;
    /// holders of one can't substitute for the other, and strangers hold
    /// neither.
    function test_smoke1_rolesAreDistinctAndStrangerCannotAct() public {
        address proposer = makeAddr("proposer");
        address approver = makeAddr("approver");
        address stranger = makeAddr("stranger");

        (PluginRepo repo,) = _publishDummyRepoV1(address(this), "dummy-repo-roles");
        (, DummyApprovalPluginV1 plugin,) = _createDaoWithPlugin(repo, "smoke1-roles-dao", proposer, approver);

        Action[] memory actions = new Action[](0);

        // approver cannot propose.
        vm.expectPartialRevert(DaoUnauthorized.selector);
        vm.prank(approver);
        plugin.propose(actions);

        // Stranger cannot approve.
        vm.prank(proposer);
        plugin.propose(actions);
        vm.expectPartialRevert(DaoUnauthorized.selector);
        vm.prank(stranger);
        plugin.approve();

        // Proposer cannot approve their own proposal.
        vm.expectPartialRevert(DaoUnauthorized.selector);
        vm.prank(proposer);
        plugin.approve();
    }

    // -------------------------------------------------------------------------
    // SMOKE-2: V1 → V2 plugin update via PSP's prepareUpdate / applyUpdate
    // -------------------------------------------------------------------------

    /// Install V1 of the dummy plugin, then push V2 to the repo, then
    /// drive the V1→V2 update via PSP. After the update, the proxy's
    /// implementation slot points at V2, `version()` returns 2, and
    /// `initializeFrom` ran (recording the from-build).
    function test_smoke2_pluginUpdateV1toV2() public {
        address proposer = makeAddr("proposer");
        address approver = makeAddr("approver");

        // 1. Publish V1 + create DAO with plugin installed.
        (PluginRepo repo,) = _publishDummyRepoV1(address(this), "dummy-repo-update");
        (DAO dao, DummyApprovalPluginV1 plugin, DAOFactory.InstalledPlugin memory installedV1) =
            _createDaoWithPlugin(repo, "smoke2-dao", proposer, approver);

        // Sanity: at V1.
        assertEq(plugin.version(), 1);
        address proxyAddr = address(plugin);

        // 2. Maintainer publishes V2 of the plugin.
        DummyApprovalPluginSetupV2 setupV2 = new DummyApprovalPluginSetupV2();
        // This test's `address(this)` is the maintainer (passed to
        // createPluginRepoWithFirstVersion above).
        repo.createVersion(1, address(setupV2), hex"22", hex"00");

        // 3. Grant the permissions PSP needs to apply the update:
        //    - APPLY_UPDATE_PERMISSION on PSP for this caller
        //    - ROOT on the DAO for PSP (to apply the permission ceremony)
        //    - UPGRADE_PLUGIN_PERMISSION on the plugin for PSP (so it can
        //      call `upgradeToAndCall` on the proxy)
        vm.prank(address(dao));
        dao.grant(address(psp), address(this), APPLY_UPDATE_PERMISSION_ID);
        vm.prank(address(dao));
        dao.grant(address(dao), address(psp), ROOT_PERMISSION_ID);
        vm.prank(address(dao));
        dao.grant(proxyAddr, address(psp), UPGRADE_PLUGIN_PERMISSION_ID);

        // 4. PSP.prepareUpdate(V1 → V2) → returns initData (encodes
        //    `initializeFrom(1)`) + the permission deltas (empty in this
        //    dummy).
        vm.roll(block.number + 1);
        PluginSetupProcessor.PrepareUpdateParams memory updateParams = PluginSetupProcessor.PrepareUpdateParams({
            currentVersionTag: PluginRepo.Tag({release: 1, build: 1}),
            newVersionTag: PluginRepo.Tag({release: 1, build: 2}),
            pluginSetupRepo: repo,
            setupPayload: IPluginSetup.SetupPayload({
                plugin: proxyAddr, currentHelpers: installedV1.preparedSetupData.helpers, data: ""
            })
        });
        (bytes memory initData, IPluginSetup.PreparedSetupData memory prepared) =
            psp.prepareUpdate(address(dao), updateParams);

        assertTrue(initData.length > 0, "V2 setup returned initData (initializeFrom call)");

        // 5. PSP.applyUpdate runs `upgradeToAndCall(newImpl, initData)`
        //    on the proxy.
        psp.applyUpdate(
            address(dao),
            PluginSetupProcessor.ApplyUpdateParams({
                plugin: proxyAddr,
                pluginSetupRef: PluginSetupRef({
                    versionTag: PluginRepo.Tag({release: 1, build: 2}), pluginSetupRepo: repo
                }),
                initData: initData,
                permissions: prepared.permissions,
                helpersHash: hashHelpers(prepared.helpers)
            })
        );

        // 6. Post-update: same proxy address, but `version()` now returns
        //    2, and `initializeFrom` recorded the prior build.
        DummyApprovalPluginV2 upgraded = DummyApprovalPluginV2(proxyAddr);
        assertEq(upgraded.version(), 2, "version bumped to 2 post-update");
        assertEq(upgraded.upgradedFromBuild(), 1, "initializeFrom(1) ran during applyUpdate");

        // 7. The original V1 grants (PROPOSE, APPROVE, EXECUTE-on-DAO)
        //    survive the upgrade — proxy storage preserved.
        assertTrue(dao.hasPermission(proxyAddr, proposer, plugin.PROPOSE_PERMISSION_ID(), ""));
        assertTrue(dao.hasPermission(proxyAddr, approver, plugin.APPROVE_PERMISSION_ID(), ""));
        assertTrue(dao.hasPermission(address(dao), proxyAddr, EXECUTE_PERMISSION_ID, ""));

        // 8. V2's new behaviours actually work on the live proxy:
        //    (a) `executionCount` starts at 0 (no executions on V1 yet)
        assertEq(upgraded.executionCount(), 0, "fresh executionCount counter");

        //    (b) Drive a propose + approve + execute cycle. The override
        //        bumps the counter on success. (Use a no-op action; the
        //        purpose is to prove the V2 code path runs.)
        Action[] memory actions = new Action[](0);
        vm.prank(proposer);
        upgraded.propose(actions);
        vm.prank(approver);
        upgraded.approve();
        upgraded.executeAfterApproval();
        assertEq(upgraded.executionCount(), 1, "V2 override incremented executionCount");

        //    (c) `cancel()` — a V2-only function — works for the proposer.
        vm.prank(proposer);
        upgraded.propose(actions);
        assertTrue(upgraded.hasProposal());
        vm.prank(proposer);
        upgraded.cancel();
        assertFalse(upgraded.hasProposal(), "cancel() cleared pending proposal");
    }

    // -------------------------------------------------------------------------
    // SMOKE-3: Maintainer transfer flow
    // -------------------------------------------------------------------------

    /// PluginRepoFactory.createPluginRepoWithFirstVersion transfers
    /// ownership to a designated maintainer. The maintainer can publish
    /// new versions; the factory cannot. The maintainer can hand off to
    /// a new maintainer; the old loses publish rights.
    function test_smoke3_maintainerTransferFlow() public {
        address maintainer = makeAddr("maintainer");
        address newMaintainer = makeAddr("new-maintainer");

        (PluginRepo repo,) = _publishDummyRepoV1(maintainer, "transferable-repo");

        // Maintainer owns the repo; factory doesn't.
        assertTrue(repo.isGranted(address(repo), maintainer, MAINTAINER_PERMISSION_ID, ""));
        assertFalse(repo.isGranted(address(repo), address(pluginRepoFactory), MAINTAINER_PERMISSION_ID, ""));
        assertFalse(repo.isGranted(address(repo), address(pluginRepoFactory), ROOT_PERMISSION_ID, ""));

        // Maintainer publishes V2.
        DummyApprovalPluginSetupV2 setupV2 = new DummyApprovalPluginSetupV2();
        vm.prank(maintainer);
        repo.createVersion(1, address(setupV2), hex"22", hex"00");
        assertEq(repo.buildCount(1), 2);

        // Factory cannot publish.
        DummyApprovalPluginSetupV1 setupV3 = new DummyApprovalPluginSetupV1();
        vm.expectRevert(
            abi.encodeWithSelector(
                PermissionManager.Unauthorized.selector,
                address(repo),
                address(pluginRepoFactory),
                MAINTAINER_PERMISSION_ID
            )
        );
        vm.prank(address(pluginRepoFactory));
        repo.createVersion(1, address(setupV3), hex"33", hex"00");

        // Maintainer transfers ROOT + MAINTAINER to newMaintainer; revokes own.
        vm.prank(maintainer);
        repo.grant(address(repo), newMaintainer, ROOT_PERMISSION_ID);
        vm.prank(maintainer);
        repo.grant(address(repo), newMaintainer, MAINTAINER_PERMISSION_ID);
        vm.prank(maintainer);
        repo.revoke(address(repo), maintainer, MAINTAINER_PERMISSION_ID);

        // Old maintainer can no longer publish.
        vm.expectRevert(
            abi.encodeWithSelector(
                PermissionManager.Unauthorized.selector, address(repo), maintainer, MAINTAINER_PERMISSION_ID
            )
        );
        vm.prank(maintainer);
        repo.createVersion(1, address(setupV3), hex"33", hex"00");

        // New maintainer can.
        vm.prank(newMaintainer);
        repo.createVersion(1, address(setupV3), hex"33", hex"00");
        assertEq(repo.buildCount(1), 3, "V1 + V2 + V3 published across two maintainers");
    }
}
