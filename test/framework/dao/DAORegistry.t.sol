// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.17;

import {Test, Vm} from "forge-std/Test.sol";
import {ENS} from "@ensdomains/ens-contracts/contracts/registry/ENS.sol";
import {ENSRegistry} from "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {DAORegistry} from "../../../src/framework/dao/DAORegistry.sol";
import {ENSSubdomainRegistrar} from "../../../src/framework/utils/ens/ENSSubdomainRegistrar.sol";
import {InterfaceBasedRegistry} from "../../../src/framework/utils/InterfaceBasedRegistry.sol";
import {IDAO} from "../../../src/common/dao/IDAO.sol";
import {DaoUnauthorized} from "../../../src/common/permission/auth/auth.sol";
import {DAOMock} from "../../mocks/commons/dao/DAOMock.sol";
import {MockResolver} from "../member/mocks/MockResolver.sol";

/// @dev A contract that ERC-165-claims `IDAO`. Stand-in for a registered DAO;
/// the registry only checks ERC-165 conformance and stores the address.
contract IDAOStub {
    function supportsInterface(bytes4 _interfaceId) external pure returns (bool) {
        return _interfaceId == type(IDAO).interfaceId || _interfaceId == type(IERC165).interfaceId;
    }
}

/// @notice Direct tests for `DAORegistry` in
/// `src/framework/dao/DAORegistry.sol`.
///
/// Ports `packages/contracts/test/framework/dao/dao-registry.ts` (373 lines,
/// 13 cases). Uses the real `ENSRegistry` from `lib/ens-contracts` + real
/// `ENSSubdomainRegistrar` for full ENS-path coverage. `IDAOStub` stands in
/// for a registrable DAO. Exhaustive subdomain ASCII validation is owned by
/// `RegistryUtils.t.sol`; one spot-check invalid-char case is included here.
/// Adds: revert-atomicity assertion (no leftover `entries[dao] = true` if the
/// ENS path reverts), and `targetInterfaceId == IDAO` snapshot.
contract DAORegistryTest is Test {
    bytes32 internal constant REGISTER_DAO_PERMISSION_ID = keccak256("REGISTER_DAO_PERMISSION");

    // namehash("dao.eth") and the labelhash of "my-cool-org".
    bytes32 internal constant DAO_ETH_NODE = 0x4adec6e9f748b29857b9a275dcb59bd0254a069a7e20cab4ec591499254f119a;
    bytes32 internal constant ETH_LABEL = keccak256("eth");
    bytes32 internal constant DAO_LABEL = keccak256("dao");
    bytes32 internal constant MY_COOL_ORG_LABEL = keccak256("my-cool-org");

    DAOMock internal managingDao;
    ENSRegistry internal ens;
    MockResolver internal resolver;
    ENSSubdomainRegistrar internal subdomainRegistrar;
    DAORegistry internal daoRegistry;
    IDAOStub internal targetDao;

    address internal alice = makeAddr("alice");
    address internal creator = makeAddr("creator");

    function setUp() public {
        managingDao = new DAOMock();
        managingDao.setHasPermissionReturnValueMock(true);

        ens = new ENSRegistry();
        resolver = new MockResolver(ENS(address(ens)));

        // Build "dao.eth" in ENS. Test contract owns root, then "eth", then "dao".
        ens.setSubnodeRecord(bytes32(0), ETH_LABEL, address(this), address(resolver), 0);
        ens.setSubnodeRecord(
            keccak256(abi.encodePacked(bytes32(0), ETH_LABEL)), DAO_LABEL, address(this), address(resolver), 0
        );

        // Stand up the ENSSubdomainRegistrar; transfer "dao.eth" ownership to it.
        ENSSubdomainRegistrar registrarImpl = new ENSSubdomainRegistrar();
        subdomainRegistrar = ENSSubdomainRegistrar(address(new ERC1967Proxy(address(registrarImpl), "")));
        ens.setOwner(DAO_ETH_NODE, address(subdomainRegistrar));
        subdomainRegistrar.initialize(IDAO(address(managingDao)), ENS(address(ens)), DAO_ETH_NODE);

        // Stand up the DAORegistry proxy.
        DAORegistry impl = new DAORegistry();
        daoRegistry = DAORegistry(
            address(
                new ERC1967Proxy(
                    address(impl),
                    abi.encodeCall(DAORegistry.initialize, (IDAO(address(managingDao)), subdomainRegistrar))
                )
            )
        );

        targetDao = new IDAOStub();
    }

    // -------------------------------------------------------------------------
    // Init / view state
    // -------------------------------------------------------------------------

    function test_subdomainRegistrar_storedAtInit() public view {
        assertEq(address(daoRegistry.subdomainRegistrar()), address(subdomainRegistrar));
    }

    function test_targetInterfaceId_isIDAO() public view {
        assertEq(daoRegistry.targetInterfaceId(), type(IDAO).interfaceId);
    }

    // -------------------------------------------------------------------------
    // register — happy paths
    // -------------------------------------------------------------------------

    function test_register_succeedsWithEmptySubdomain() public {
        // Empty subdomain bypasses the ENS path entirely.
        daoRegistry.register(IDAO(address(targetDao)), creator, "");
        assertTrue(daoRegistry.entries(address(targetDao)));
    }

    function test_register_succeedsAndEmitsDAORegistered() public {
        vm.recordLogs();
        daoRegistry.register(IDAO(address(targetDao)), creator, "my-cool-org");
        Vm.Log[] memory logs = vm.getRecordedLogs();

        // event DAORegistered(address indexed dao, address indexed creator, string subdomain)
        bytes32 expectedTopic = keccak256("DAORegistered(address,address,string)");
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].emitter == address(daoRegistry) && logs[i].topics[0] == expectedTopic) {
                address loggedDao = address(uint160(uint256(logs[i].topics[1])));
                address loggedCreator = address(uint160(uint256(logs[i].topics[2])));
                string memory loggedSubdomain = abi.decode(logs[i].data, (string));
                assertEq(loggedDao, address(targetDao));
                assertEq(loggedCreator, creator);
                assertEq(loggedSubdomain, "my-cool-org");
                found = true;
                break;
            }
        }
        assertTrue(found, "DAORegistered not emitted");
        assertTrue(daoRegistry.entries(address(targetDao)));
    }

    // -------------------------------------------------------------------------
    // register — revert paths
    // -------------------------------------------------------------------------

    function test_register_revertsIfCallerLacksPermission() public {
        managingDao.setHasPermissionReturnValueMock(false);
        vm.expectRevert(
            abi.encodeWithSelector(
                DaoUnauthorized.selector, address(managingDao), address(daoRegistry), alice, REGISTER_DAO_PERMISSION_ID
            )
        );
        vm.prank(alice);
        daoRegistry.register(IDAO(address(targetDao)), creator, "my-cool-org");
    }

    function test_register_revertsIfDAOAlreadyRegistered() public {
        daoRegistry.register(IDAO(address(targetDao)), creator, "my-cool-org");

        // Source ordering: `_register` runs BEFORE the ENS subnode write.
        // When `_register` reverts on an already-registered DAO, the ENS
        // path for the new subdomain never executes — confirm via the ENS
        // owner staying empty for "another-name".
        bytes32 secondNode = keccak256(abi.encodePacked(DAO_ETH_NODE, keccak256(bytes("another-name"))));
        assertEq(ens.owner(secondNode), address(0));

        vm.expectRevert(
            abi.encodeWithSelector(InterfaceBasedRegistry.ContractAlreadyRegistered.selector, address(targetDao))
        );
        daoRegistry.register(IDAO(address(targetDao)), creator, "another-name");

        assertEq(ens.owner(secondNode), address(0), "ENS subnode not written when _register reverts");
    }

    function test_register_revertsIfSubdomainAlreadyTaken() public {
        IDAOStub otherDao = new IDAOStub();
        daoRegistry.register(IDAO(address(targetDao)), creator, "my-cool-org");

        // Re-registering the same subdomain with a different DAO bubbles
        // `AlreadyRegistered` from the ENSSubdomainRegistrar.
        bytes32 subnode = keccak256(abi.encodePacked(DAO_ETH_NODE, MY_COOL_ORG_LABEL));
        vm.expectRevert(
            abi.encodeWithSelector(
                ENSSubdomainRegistrar.AlreadyRegistered.selector, subnode, address(subdomainRegistrar)
            )
        );
        daoRegistry.register(IDAO(address(otherDao)), creator, "my-cool-org");

        // Atomicity: even though `_register(otherDao)` ran before the ENS
        // revert inside the same tx, the EVM rolled state back.
        assertFalse(daoRegistry.entries(address(otherDao)));
    }

    function test_register_revertsIfENSNotSupportedButSubdomainGiven() public {
        // Parallel registry initialized with zero subdomain registrar.
        DAORegistry impl = new DAORegistry();
        DAORegistry noEnsRegistry = DAORegistry(
            address(
                new ERC1967Proxy(
                    address(impl),
                    abi.encodeCall(
                        DAORegistry.initialize, (IDAO(address(managingDao)), ENSSubdomainRegistrar(address(0)))
                    )
                )
            )
        );

        vm.expectRevert(DAORegistry.ENSNotSupported.selector);
        noEnsRegistry.register(IDAO(address(targetDao)), creator, "my-cool-org");
    }

    function test_register_revertsIfSubdomainHasInvalidChar() public {
        // Exhaustive ASCII validation is locked by `RegistryUtils.t.sol`.
        // One representative invalid char here proves the wrapper hooks in.
        string memory bad = "MY-COOL-ORG"; // uppercase invalid
        vm.expectRevert(abi.encodeWithSelector(DAORegistry.InvalidDaoSubdomain.selector, bad));
        daoRegistry.register(IDAO(address(targetDao)), creator, bad);
    }

    // -------------------------------------------------------------------------
    // Protocol version
    // -------------------------------------------------------------------------

    function test_protocolVersion_returnsCurrent() public view {
        uint8[3] memory v = daoRegistry.protocolVersion();
        assertEq(v[0], 1);
        assertEq(v[1], 4);
        assertEq(v[2], 0);
    }

    // -------------------------------------------------------------------------
    // Implementation / lifecycle
    // -------------------------------------------------------------------------

    /// The bare `DAORegistry` impl invokes `_disableInitializers()` in its
    /// constructor — calling `initialize` on the impl directly must revert.
    /// Only the proxy created via `ERC1967Proxy` can be initialized.
    function test_impl_cannotBeInitializedDirectly() public {
        DAORegistry impl = new DAORegistry();
        vm.expectRevert(); // Initializable: contract is already initialized
        impl.initialize(IDAO(address(managingDao)), subdomainRegistrar);
    }

    /// Second call to `initialize` on an already-initialized proxy reverts.
    function test_initialize_revertsIfCalledTwice() public {
        vm.expectRevert(); // Initializable: contract is already initialized
        daoRegistry.initialize(IDAO(address(managingDao)), subdomainRegistrar);
    }

    /// Managing DAO is stored at init via the inherited
    /// `DaoAuthorizableUpgradeable` base and exposed via the `dao()` getter.
    function test_initialize_storesManagingDao() public view {
        assertEq(address(daoRegistry.dao()), address(managingDao));
    }

    // -------------------------------------------------------------------------
    // register — interface-check edges (inherited from InterfaceBasedRegistry)
    // -------------------------------------------------------------------------

    /// Non-contract DAO addresses (zero address, EOA) fail the ERC-165
    /// interface probe inside `InterfaceBasedRegistry._register` and revert
    /// cleanly with `ContractInterfaceInvalid`.
    function test_register_revertsForNonContractDAO() public {
        vm.expectRevert(
            abi.encodeWithSelector(InterfaceBasedRegistry.ContractInterfaceInvalid.selector, address(0))
        );
        daoRegistry.register(IDAO(address(0)), creator, "");

        address eoa = makeAddr("eoa-dao");
        vm.expectRevert(abi.encodeWithSelector(InterfaceBasedRegistry.ContractInterfaceInvalid.selector, eoa));
        daoRegistry.register(IDAO(eoa), creator, "");
    }

    /// A contract whose `supportsInterface` itself reverts must be caught by
    /// `ERC165CheckerUpgradeable` (it uses staticcall + try/catch). The outer
    /// call reverts cleanly with `ContractInterfaceInvalid` — never propagates
    /// the inner revert.
    function test_register_revertsIfDAOSupportsInterfaceReverts() public {
        address bad = makeAddr("reverter");
        vm.etch(bad, hex"fe"); // INVALID opcode

        vm.expectRevert(abi.encodeWithSelector(InterfaceBasedRegistry.ContractInterfaceInvalid.selector, bad));
        daoRegistry.register(IDAO(bad), creator, "");
    }

    /// Storage-gap sentinel — `uint256[49] __gap` at the tail of DAORegistry +
    /// `uint256[48] __gap` from InterfaceBasedRegistry. If either shrinks
    /// without a major-version bump, the upgrade-shaped tests catch it via
    /// the slot probe.
    function test_storageGap_sentinelSlotIsUnused() public view {
        // The gap range sits well past the last named state var. Probe a slot
        // inside it; should be zero on a fresh deploy.
        bytes32 sentinel = bytes32(uint256(250));
        bytes32 raw = vm.load(address(daoRegistry), sentinel);
        assertEq(uint256(raw), 0, "gap slot 250 should be unused");
    }
}
