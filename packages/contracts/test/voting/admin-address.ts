import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {ethers} from 'hardhat';

import {DAO} from '../../typechain';
import {getMergedABI} from '../../utils/abi';
import {customError, ERRORS} from '../test-utils/custom-error-helper';
import {deployNewDAO} from '../test-utils/dao';
import {getInterfaceID} from '../test-utils/interfaces';

const EVENTS = {
  ProposalCreated: 'ProposalCreated',
  ProposalExecuted: 'ProposalExecuted',
};

// Permissions
const EXECUTE_PROPOSAL_PERMISSION_ID = ethers.utils.id(
  'EXECUTE_PROPOSAL_PERMISSION'
);
const EXECUTE_PERMISSION_ID = ethers.utils.id('EXECUTE_PERMISSION');

describe('AdminAddress plugin', function () {
  let signers: SignerWithAddress[];
  let plugin: any;
  let dao: DAO;
  let ownerAddress: string;
  let dummyActions: any;
  let dummyMetadata: string;

  let mergedAbi: any;
  let adminAddressFactoryBytecode: any;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    ({abi: mergedAbi, bytecode: adminAddressFactoryBytecode} =
      await getMergedABI(
        // @ts-ignore
        hre,
        'AdminAddress',
        ['DAO']
      ));

    dummyActions = [
      {
        to: ownerAddress,
        data: '0x00000000',
        value: 0,
      },
    ];
    dummyMetadata = ethers.utils.hexlify(
      ethers.utils.toUtf8Bytes('0x123456789')
    );

    const DAO = await ethers.getContractFactory('DAO');
    dao = await DAO.deploy();
    await dao.initialize('0x', ownerAddress, ethers.constants.AddressZero);
  });

  beforeEach(async () => {
    const AdminAddressFactory = new ethers.ContractFactory(
      mergedAbi,
      adminAddressFactoryBytecode,
      signers[0]
    );
    plugin = await AdminAddressFactory.deploy();

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
        ERRORS.ALREADY_INITIALIZED
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
        'function executeProposal(bytes _proposalMetadata, tuple(address,uint256,bytes)[] _actions)',
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

      await expect(
        plugin.executeProposal(dummyMetadata, dummyActions)
      ).to.be.revertedWith(
        customError(
          'Unauthorized',
          dao.address,
          dao.address,
          plugin.address,
          EXECUTE_PERMISSION_ID
        )
      );
    });

    it('fails to call `executeProposal()` if `ADMIN_EXECUTE_PERMISSION` is not granted for the admin address', async () => {
      await dao.revoke(
        plugin.address,
        ownerAddress,
        EXECUTE_PROPOSAL_PERMISSION_ID
      );

      await expect(
        plugin.executeProposal(dummyMetadata, dummyActions)
      ).to.be.revertedWith(
        customError(
          'DaoUnauthorized',
          dao.address,
          plugin.address,
          plugin.address,
          ownerAddress,
          EXECUTE_PROPOSAL_PERMISSION_ID
        )
      );
    });

    it('correctly emits the ProposalCreated event', async () => {
      const currentExpectedProposalId = 0;

      await expect(await plugin.executeProposal(dummyMetadata, dummyActions))
        .to.emit(plugin, EVENTS.ProposalCreated)
        .withArgs(currentExpectedProposalId, ownerAddress, dummyMetadata);
    });

    it('correctly emits ProposalExecuted event', async () => {
      const currentExpectedProposalId = 0;
      const expectedDummyResults = ['0x'];

      await expect(await plugin.executeProposal(dummyMetadata, dummyActions))
        .to.emit(plugin, EVENTS.ProposalExecuted)
        .withArgs(currentExpectedProposalId, expectedDummyResults);
    });

    it('correctly increments proposal id', async () => {
      const currentExpectedProposalId = 0;

      await plugin.executeProposal(dummyMetadata, dummyActions);

      const nextExpectedProposalId = currentExpectedProposalId + 1;

      await expect(await plugin.executeProposal(dummyMetadata, dummyActions))
        .to.emit(plugin, EVENTS.ProposalCreated)
        .withArgs(nextExpectedProposalId, ownerAddress, dummyMetadata);
    });
  });
});
