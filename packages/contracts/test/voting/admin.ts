import chai, {expect} from 'chai';
import {smock} from '@defi-wonderland/smock';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ethers} from 'hardhat';

import {getMergedABI} from '../../utils/abi';
import {findEvent, PROPOSAL_EVENTS} from '../../utils/event';
import {getInterfaceID} from '../test-utils/interfaces';
import {BigNumber} from 'ethers';

chai.use(smock.matchers);

// Permissions
const EXECUTE_PROPOSAL_PERMISSION_ID = ethers.utils.id(
  'EXECUTE_PROPOSAL_PERMISSION'
);
const EXECUTE_PERMISSION_ID = ethers.utils.id('EXECUTE_PERMISSION');

describe('Admin plugin', function () {
  let signers: SignerWithAddress[];
  let plugin: any;
  let dao: any;
  let ownerAddress: string;
  let dummyActions: any;
  let dummyMetadata: string;

  let mergedAbi: any;
  let adminFactoryBytecode: any;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    ({abi: mergedAbi, bytecode: adminFactoryBytecode} = await getMergedABI(
      // @ts-ignore
      hre,
      'Admin',
      ['DAO']
    ));

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

    const mockDAOFactory = await smock.mock('DAO');
    dao = await mockDAOFactory.deploy();
    await dao.initialize('0x', ownerAddress, ethers.constants.AddressZero);
  });

  beforeEach(async () => {
    const AdminFactory = new ethers.ContractFactory(
      mergedAbi,
      adminFactoryBytecode,
      signers[0]
    );
    plugin = await AdminFactory.deploy();

    await dao.grant(dao.address, plugin.address, EXECUTE_PERMISSION_ID);
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
  });

  describe('plugin interface: ', async () => {
    it('supports plugin cloneable interface', async () => {
      // @ts-ignore
      const IPlugin = await hre.artifacts.readArtifact('IPlugin');

      const iface = new ethers.utils.Interface(IPlugin.abi);

      expect(await plugin.supportsInterface(getInterfaceID(iface))).to.be.eq(
        true
      );
    });

    it('supports admin address plugin interface', async () => {
      const iface = new ethers.utils.Interface([
        'function initialize(address  _dao)',
        'function proposalCount()',
        'function executeProposal(bytes _metadata, tuple(address,uint256,bytes)[] _actions)',
      ]);

      expect(await plugin.supportsInterface(getInterfaceID(iface))).to.be.eq(
        true
      );
    });
  });

  describe('execute proposal: ', async () => {
    beforeEach(async () => {
      await initializePlugin();
    });

    it("fails to call DAO's `execute()` if `EXECUTE_PERMISSION` is not granted to the plugin address", async () => {
      await dao.revoke(dao.address, plugin.address, EXECUTE_PERMISSION_ID);

      await expect(plugin.executeProposal(dummyMetadata, dummyActions))
        .to.be.revertedWithCustomError(dao, 'Unauthorized')
        .withArgs(
          dao.address,
          dao.address,
          plugin.address,
          EXECUTE_PERMISSION_ID
        );
    });

    it('fails to call `executeProposal()` if `EXECUTE_PROPOSAL_PERMISSION_ID` is not granted for the admin address', async () => {
      await dao.revoke(
        plugin.address,
        ownerAddress,
        EXECUTE_PROPOSAL_PERMISSION_ID
      );

      await expect(plugin.executeProposal(dummyMetadata, dummyActions))
        .to.be.revertedWithCustomError(plugin, 'DaoUnauthorized')
        .withArgs(
          dao.address,
          plugin.address,
          plugin.address,
          ownerAddress,
          EXECUTE_PROPOSAL_PERMISSION_ID
        );
    });

    it('correctly emits the ProposalCreated event', async () => {
      const currentExpectedProposalId = 0;

      const tx = await plugin.executeProposal(dummyMetadata, dummyActions);

      await expect(tx).to.emit(plugin, PROPOSAL_EVENTS.PROPOSAL_CREATED);

      const event = await findEvent(tx, PROPOSAL_EVENTS.PROPOSAL_CREATED);

      expect(event.args.proposalId).to.equal(currentExpectedProposalId);
      expect(event.args.creator).to.equal(ownerAddress);
      expect(event.args.metadata).to.equal(dummyMetadata);
      expect(event.args.actions.length).to.equal(1);
      expect(event.args.actions[0].to).to.equal(dummyActions[0].to);
      expect(event.args.actions[0].value).to.equal(dummyActions[0].value);
      expect(event.args.actions[0].data).to.equal(dummyActions[0].data);
    });

    it('correctly emits the `ProposalExecuted` event', async () => {
      const currentExpectedProposalId = 0;
      const expectedDummyResults = ['0x'];

      await expect(plugin.executeProposal(dummyMetadata, dummyActions))
        .to.emit(plugin, PROPOSAL_EVENTS.PROPOSAL_EXECUTED)
        .withArgs(currentExpectedProposalId, expectedDummyResults);
    });

    it('correctly increments the proposal ID', async () => {
      const currentExpectedProposalId = 0;

      await plugin.executeProposal(dummyMetadata, dummyActions);

      const nextExpectedProposalId = currentExpectedProposalId + 1;

      const tx = await plugin.executeProposal(dummyMetadata, dummyActions);

      await expect(tx).to.emit(plugin, PROPOSAL_EVENTS.PROPOSAL_CREATED);

      const event = await findEvent(tx, PROPOSAL_EVENTS.PROPOSAL_CREATED);

      expect(event.args.proposalId).to.equal(nextExpectedProposalId);
    });

    it("calls the DAO's execute function correctly", async () => {
      const proposalId = 1;

      await plugin.executeProposal(dummyMetadata, dummyActions);

      expect(dao.execute).has.been.calledWith(BigNumber.from(proposalId), [
        [
          dummyActions[0].to,
          BigNumber.from(dummyActions[0].value),
          dummyActions[0].data,
        ],
      ]);
    });
  });
});
