import {ADMIN_INTERFACE_ID} from '../../../../../subgraph/src/utils/constants';
import {
  CloneFactory,
  CloneFactory__factory,
  Admin__factory,
  IERC165Upgradeable__factory,
  IMembership__factory,
  IPlugin__factory,
  IProposal__factory,
  DAO__factory,
  IProtocolVersion__factory,
} from '../../../../typechain';
import {ProposalCreatedEvent} from '../../../../typechain/Admin';
import {ExecutedEvent} from '../../../../typechain/IDAO';
import {deployNewDAO} from '../../../test-utils/dao';
import {
  ADMIN_INTERFACE,
  EXECUTE_PROPOSAL_PERMISSION_ID,
} from './admin-constants';
import {
  IDAO_EVENTS,
  IMEMBERSHIP_EVENTS,
  IPROPOSAL_EVENTS,
  findEvent,
  findEventTopicLog,
} from '@aragon/osx-commons-sdk';
import {DAO_PERMISSIONS} from '@aragon/osx-commons-sdk';
import {proposalIdToBytes32} from '@aragon/osx-commons-sdk';
import {getInterfaceId} from '@aragon/osx-commons-sdk';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {ethers} from 'hardhat';

describe('Admin', function () {
  let signers: SignerWithAddress[];
  let plugin: any;
  let adminCloneFactory: CloneFactory;
  let dao: any;
  let ownerAddress: string;
  let dummyActions: any;
  let dummyMetadata: string;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    dummyActions = [
      {
        to: ownerAddress,
        data: '0x0000',
        value: 0,
      },
    ];
    dummyMetadata = ethers.utils.hexlify(
      ethers.utils.toUtf8Bytes('0x123456789')
    );

    dao = await deployNewDAO(signers[0]);

    const admin = await new Admin__factory(signers[0]).deploy();
    adminCloneFactory = await new CloneFactory__factory(signers[0]).deploy(
      admin.address
    );
  });

  beforeEach(async () => {
    const AdminFactory = new Admin__factory(signers[0]);

    const nonce = await ethers.provider.getTransactionCount(
      adminCloneFactory.address
    );
    const anticipatedPluginAddress = ethers.utils.getContractAddress({
      from: adminCloneFactory.address,
      nonce,
    });

    await adminCloneFactory.deployClone();
    plugin = AdminFactory.attach(anticipatedPluginAddress);

    await dao.grant(
      dao.address,
      plugin.address,
      DAO_PERMISSIONS.EXECUTE_PERMISSION_ID
    );
    await dao.grant(
      plugin.address,
      ownerAddress,
      EXECUTE_PROPOSAL_PERMISSION_ID
    );
  });

  function initializePlugin() {
    return plugin.initialize(dao.address);
  }

  describe('initialize: ', async () => {
    it('reverts if trying to re-initialize', async () => {
      await initializePlugin();

      await expect(initializePlugin()).to.be.revertedWith(
        'Initializable: contract is already initialized'
      );
    });

    it('emits the `MembershipContractAnnounced` event and returns the admin as a member afterwards', async () => {
      await expect(plugin.initialize(dao.address))
        .to.emit(plugin, IMEMBERSHIP_EVENTS.MEMBERSHIP_CONTRACT_ANNOUNCED)
        .withArgs(dao.address);

      expect(await plugin.isMember(signers[0].address)).to.be.true; // signer[0] has `EXECUTE_PROPOSAL_PERMISSION_ID`
      expect(await plugin.isMember(signers[1].address)).to.be.false; // signer[1] has not
    });
  });

  describe('ERC-165', async () => {
    it('does not support the empty interface', async () => {
      expect(await plugin.supportsInterface('0xffffffff')).to.be.false;
    });

    it('supports the `IERC165Upgradeable` interface', async () => {
      const iface = IERC165Upgradeable__factory.createInterface();
      expect(await plugin.supportsInterface(getInterfaceId(iface))).to.be.true;
    });

    it('supports the `IPlugin` interface', async () => {
      const iface = IPlugin__factory.createInterface();
      expect(await plugin.supportsInterface(getInterfaceId(iface))).to.be.true;
    });

    it('supports the `IProtocolVersion` interface', async () => {
      const iface = IProtocolVersion__factory.createInterface();
      expect(await plugin.supportsInterface(getInterfaceId(iface))).to.be.true;
    });

    it('supports the `IProposal` interface', async () => {
      const iface = IProposal__factory.createInterface();
      expect(await plugin.supportsInterface(getInterfaceId(iface))).to.be.true;
    });

    it('supports the `IMembership` interface', async () => {
      const iface = IMembership__factory.createInterface();
      expect(await plugin.supportsInterface(getInterfaceId(iface))).to.be.true;
    });

    it('supports the `Admin` interface', async () => {
      const iface = getInterfaceId(ADMIN_INTERFACE);
      expect(iface).to.equal(ADMIN_INTERFACE_ID); // checks that it didn't change
      expect(await plugin.supportsInterface(iface)).to.be.true;
    });
  });

  describe('execute proposal: ', async () => {
    beforeEach(async () => {
      await initializePlugin();
    });

    it("fails to call DAO's `execute()` if `EXECUTE_PERMISSION` is not granted to the plugin address", async () => {
      await dao.revoke(
        dao.address,
        plugin.address,
        DAO_PERMISSIONS.EXECUTE_PERMISSION_ID
      );

      await expect(plugin.executeProposal(dummyMetadata, dummyActions, 0))
        .to.be.revertedWithCustomError(dao, 'Unauthorized')
        .withArgs(
          dao.address,
          plugin.address,
          DAO_PERMISSIONS.EXECUTE_PERMISSION_ID
        );
    });

    it('fails to call `executeProposal()` if `EXECUTE_PROPOSAL_PERMISSION_ID` is not granted for the admin address', async () => {
      await dao.revoke(
        plugin.address,
        ownerAddress,
        EXECUTE_PROPOSAL_PERMISSION_ID
      );

      await expect(plugin.executeProposal(dummyMetadata, dummyActions, 0))
        .to.be.revertedWithCustomError(plugin, 'DaoUnauthorized')
        .withArgs(
          dao.address,
          plugin.address,
          ownerAddress,
          EXECUTE_PROPOSAL_PERMISSION_ID
        );
    });

    it('correctly emits the ProposalCreated event', async () => {
      const currentExpectedProposalId = 0;

      const allowFailureMap = 1;

      const tx = await plugin.executeProposal(
        dummyMetadata,
        dummyActions,
        allowFailureMap
      );

      await expect(tx).to.emit(plugin, IPROPOSAL_EVENTS.PROPOSAL_CREATED);

      const event = await findEvent<ProposalCreatedEvent>(
        tx,
        IPROPOSAL_EVENTS.PROPOSAL_CREATED
      );

      expect(event.args.proposalId).to.equal(currentExpectedProposalId);
      expect(event.args.creator).to.equal(ownerAddress);
      expect(event.args.metadata).to.equal(dummyMetadata);
      expect(event.args.actions.length).to.equal(1);
      expect(event.args.actions[0].to).to.equal(dummyActions[0].to);
      expect(event.args.actions[0].value).to.equal(dummyActions[0].value);
      expect(event.args.actions[0].data).to.equal(dummyActions[0].data);
      expect(event.args.allowFailureMap).to.equal(allowFailureMap);
    });

    it('correctly emits the `ProposalExecuted` event', async () => {
      const currentExpectedProposalId = 0;

      await expect(plugin.executeProposal(dummyMetadata, dummyActions, 0))
        .to.emit(plugin, IPROPOSAL_EVENTS.PROPOSAL_EXECUTED)
        .withArgs(currentExpectedProposalId);
    });

    it('correctly increments the proposal ID', async () => {
      const currentExpectedProposalId = 0;

      await plugin.executeProposal(dummyMetadata, dummyActions, 0);

      const nextExpectedProposalId = currentExpectedProposalId + 1;

      const tx = await plugin.executeProposal(dummyMetadata, dummyActions, 0);

      await expect(tx).to.emit(plugin, IPROPOSAL_EVENTS.PROPOSAL_CREATED);

      const event = await findEvent<ProposalCreatedEvent>(
        tx,
        IPROPOSAL_EVENTS.PROPOSAL_CREATED
      );

      expect(event.args.proposalId).to.equal(nextExpectedProposalId);
    });

    it("calls the DAO's execute function correctly with proposalId", async () => {
      {
        const proposalId = 0;
        const allowFailureMap = 1;

        const tx = await plugin.executeProposal(
          dummyMetadata,
          dummyActions,
          allowFailureMap
        );

        const event = await findEventTopicLog<ExecutedEvent>(
          tx,
          DAO__factory.createInterface(),
          IDAO_EVENTS.EXECUTED
        );

        expect(event.args.actor).to.equal(plugin.address);
        expect(event.args.callId).to.equal(proposalIdToBytes32(proposalId));
        expect(event.args.actions.length).to.equal(1);
        expect(event.args.actions[0].to).to.equal(dummyActions[0].to);
        expect(event.args.actions[0].value).to.equal(dummyActions[0].value);
        expect(event.args.actions[0].data).to.equal(dummyActions[0].data);
        // note that failureMap is different than allowFailureMap. See DAO.sol for details
        expect(event.args.failureMap).to.equal(0);
      }

      {
        const proposalId = 1;

        const tx = await plugin.executeProposal(dummyMetadata, dummyActions, 0);

        const event = await findEventTopicLog<ExecutedEvent>(
          tx,
          DAO__factory.createInterface(),
          IDAO_EVENTS.EXECUTED
        );
        expect(event.args.callId).to.equal(proposalIdToBytes32(proposalId));
      }
    });
  });
});
