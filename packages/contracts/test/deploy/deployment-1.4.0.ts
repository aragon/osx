import {getLatestContractAddress} from '../../deploy/helpers';
import {DAO__factory, PluginRepo__factory} from '../../typechain';
import {Multisig__factory as Multisig_v1_3_0__factory} from '../../typechain/@aragon/osx-v1.3.0/plugins/governance/multisig/Multisig.sol';
import {closeFork, initForkForOsxVersion} from '../test-utils/fixture';
import {
  DAO_REGISTRY_PERMISSIONS,
  PLUGIN_REGISTRY_PERMISSIONS,
} from '@aragon/osx-commons-sdk';
import {expect} from 'chai';
import {defaultAbiCoder} from 'ethers/lib/utils';
import * as fs from 'fs';
import hre, {ethers} from 'hardhat';
import * as path from 'path';

// change to test on a different network
const NETWORK = 'sepolia';

const mergedProposalActionsPath = path.join(
  __dirname,
  '../../scripts/management-dao-proposal/generated/merged-proposals.json'
);

const calldataPath = path.join(
  __dirname,
  '../../scripts/management-dao-proposal/generated/calldata.json'
);

const daoAddress = '0xca834b3f404c97273f34e108029eed776144d324';
const daoMultisigAddr = '0xfcead61339e3e73090b587968fce8b090e0600ef';
const daoMultisigMembers = [
  '0x25cd4b8a02a8f9e920eb02fac38c2954694a3fa5',
  '0x3ffe3f16d47a54b1c6a3f47c9e6ff5c2c1b32859',
  '0x42342037e0fc34c130cdb079139f8ae56d38453f',
  '0xaf2c536f9af22548829b20e9afc567259c820c62',
  '0xdf62645a2c714febbf6060d1fb607e7eccef0659',
];

const IMPLEMENTATION_ADDRESS_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

type OldAddresses = {
  daoRegistry: string;
  pluginRepoRegistry: string;
  oldDaoFactory: string;
  oldPluginRepoFactory: string;
  oldDaoRegistryImplementation: string;
  oldPluginRepoRegistryImplementation: string;
};
type Addresses = {
  daoFactory: string;
  pluginRepoFactory: string;
  daoRegistryImplementation: string;
  pluginRepoRegistryImplementation: string;
  adminRepo: string;
  tokenVotingRepo: string;
  multisigRepo: string;
  adminPluginSetup: string;
  tokenVotingPluginSetup: string;
  multisigPluginSetup: string;
};

async function forkNetwork(network: string) {
  hre.network.deploy = ['./deploy/update/to_v1.4.0'];

  await initForkForOsxVersion(network, {
    version: '1.3.0',
    forkBlockNumber: 7685985, // todo adjust to latest block
    activeContracts: [],
  });
}

function getCalldataJson() {
  // read calldata json
  const calldataJson = JSON.parse(fs.readFileSync(calldataPath, 'utf8'));

  return calldataJson;
}

function getAddressFromDescription(description: string): string {
  const address = description.split("at '")[1].split("' \n")[0];
  return address;
}

function getAddress(name: string) {
  return getLatestContractAddress(name, hre);
}

function getOldAddresses(): OldAddresses {
  return {
    daoRegistry: getAddress('DAORegistryProxy'),
    pluginRepoRegistry: getAddress('PluginRepoRegistryProxy'),
    oldDaoFactory: getAddress('DAOFactory'),
    oldPluginRepoFactory: getAddress('PluginRepoFactory'),
    oldDaoRegistryImplementation: getAddress('DAORegistryImplementation'),
    oldPluginRepoRegistryImplementation: getAddress(
      'PluginRepoRegistryImplementation'
    ),
  };
}

function getAddresses(): Addresses {
  const addresses = JSON.parse(
    fs.readFileSync(mergedProposalActionsPath, 'utf8')
  );

  // Find Admin plugin setup address from managementDAOActions
  let adminIdx = -1;
  let multisigIdx = -1;
  let tokenVotingIdx = -1;
  for (let i = 0; i < addresses.managementDAOActions.length; i++) {
    const action = addresses.managementDAOActions[i];
    if (action.description.includes('AdminSetup')) {
      adminIdx = i;
    } else if (action.description.includes('TokenVotingSetup')) {
      tokenVotingIdx = i;
    } else if (action.description.includes('MultisigSetup')) {
      multisigIdx = i;
    }
  }
  if (adminIdx === -1 || multisigIdx === -1 || tokenVotingIdx === -1) {
    throw new Error('Admin, Multisig, or TokenVotingSetup not found');
  }

  return {
    daoFactory: addresses.deployedContractAddresses.DAOFactory,
    pluginRepoFactory: addresses.deployedContractAddresses.PluginRepoFactory,
    daoRegistryImplementation:
      addresses.deployedContractAddresses.DAORegistryImplementation,
    pluginRepoRegistryImplementation:
      addresses.deployedContractAddresses.PluginRepoRegistryImplementation,
    adminRepo: addresses.managementDAOActions[adminIdx].to,
    tokenVotingRepo: addresses.managementDAOActions[tokenVotingIdx].to,
    multisigRepo: addresses.managementDAOActions[multisigIdx].to,
    adminPluginSetup: getAddressFromDescription(
      addresses.managementDAOActions[adminIdx].description
    ),
    tokenVotingPluginSetup: getAddressFromDescription(
      addresses.managementDAOActions[tokenVotingIdx].description
    ),
    multisigPluginSetup: getAddressFromDescription(
      addresses.managementDAOActions[multisigIdx].description
    ),
  };
}

async function impersonateAccount(addr: string) {
  await hre.network.provider.send('hardhat_setBalance', [
    addr,
    ethers.utils.parseUnits('3000', 'ether').toHexString(),
  ]);

  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [addr],
  });

  return ethers.getSigner(addr);
}

function getMultisigEvents(
  receipt: any,
  eventName: string,
  multisig: any
): any {
  let event: any;
  for (const log of receipt.logs) {
    const parsedLog = multisig.interface.parseLog(log);
    if (parsedLog.name === eventName) {
      event = parsedLog;
    }
  }
  return event;
}

// this function is deployment 1.4.0 specific adjust it for future deployments
async function checkStatusAfterProposal() {
  // Actions
  // 1- grant REGISTER_DAO_PERMISSION_ID to the new DAOFactory
  // 2- grant REGISTER_PLUGIN_REPO_PERMISSION to the new PluginRepoFactory and revoke it on the old PluginRepoFactory
  // 3- upgrade the DAORegistry implementation
  // 4- upgrade the PluginRepoRegistry implementation
  // 5- upgrade the managing DAO implementation
  // 6- deploy new admin version
  // 7- deploy new token voting version
  // 8- deploy new multisig version

  const member0 = await impersonateAccount(daoMultisigMembers[0]);
  const dao = DAO__factory.connect(daoAddress, member0);

  const addresses = getAddresses();
  const oldAddresses = getOldAddresses();

  // new dao factory has REGISTER_DAO_PERMISSION_ID on the DAORegistry
  expect(
    await dao.hasPermission(
      oldAddresses.daoRegistry, // where
      addresses.daoFactory, // who
      DAO_REGISTRY_PERMISSIONS.REGISTER_DAO_PERMISSION_ID, // permission id
      '0x' // data
    ),
    'new dao factory permission'
  ).to.be.true;

  // old dao factory has REGISTER_DAO_PERMISSION_ID on the DAORegistry
  expect(
    await dao.hasPermission(
      oldAddresses.daoRegistry, // where
      oldAddresses.oldDaoFactory, // who
      DAO_REGISTRY_PERMISSIONS.REGISTER_DAO_PERMISSION_ID, // permission id
      '0x' // data
    ),
    'old dao factory permission'
  ).to.be.true;

  // new repo factory has REGISTER_PLUGIN_REPO_PERMISSION on the PluginRepoRegistry
  expect(
    await dao.hasPermission(
      oldAddresses.pluginRepoRegistry, // where
      addresses.pluginRepoFactory, // who
      PLUGIN_REGISTRY_PERMISSIONS.REGISTER_PLUGIN_REPO_PERMISSION_ID, // permission id
      '0x' // data
    ),
    'new repo factory permission'
  ).to.be.true;

  // old repo factory has not REGISTER_PLUGIN_REPO_PERMISSION on the PluginRepoRegistry
  expect(
    await dao.hasPermission(
      oldAddresses.pluginRepoRegistry, // where
      oldAddresses.oldPluginRepoFactory, // who
      PLUGIN_REGISTRY_PERMISSIONS.REGISTER_PLUGIN_REPO_PERMISSION_ID, // permission id
      '0x' // data
    ),
    'old repo factory permission'
  ).to.be.false;

  // check the dao registry implementation has changed
  const newDaoRegistryImplementation = defaultAbiCoder
    .decode(
      ['address'],
      await ethers.provider.getStorageAt(
        oldAddresses.daoRegistry,
        IMPLEMENTATION_ADDRESS_SLOT
      )
    )[0]
    .toLowerCase();

  expect(
    newDaoRegistryImplementation,
    'dao registry implementation'
  ).not.to.equal(oldAddresses.oldDaoRegistryImplementation);
  expect(
    newDaoRegistryImplementation.toLowerCase(),
    'new dao registry implementation'
  ).to.equal(addresses.daoRegistryImplementation.toLowerCase());

  // check the plugin repo registry implementation has changed
  const newPluginRepoRegistryImplementation = defaultAbiCoder
    .decode(
      ['address'],
      await ethers.provider.getStorageAt(
        oldAddresses.pluginRepoRegistry,
        IMPLEMENTATION_ADDRESS_SLOT
      )
    )[0]
    .toLowerCase();

  expect(
    newPluginRepoRegistryImplementation,
    'plugin repo registry implementation'
  ).not.to.equal(oldAddresses.oldPluginRepoRegistryImplementation);
  expect(
    newPluginRepoRegistryImplementation.toLowerCase(),
    'new plugin repo registry implementation'
  ).to.equal(addresses.pluginRepoRegistryImplementation.toLowerCase());

  // management dao implementation (version) has changed
  expect(await dao.protocolVersion(), 'managing dao version').to.deep.equal([
    1, 4, 0,
  ]);

  // check new admin version is deployed with correct setup
  const adminRepo = PluginRepo__factory.connect(addresses.adminRepo, member0);
  const adminLatestVersion = await adminRepo['getLatestVersion(uint8)'](1);

  expect(adminLatestVersion.tag.release, 'admin release').to.equal(1);
  expect(adminLatestVersion.tag.build, 'admin build').to.equal(2);
  expect(adminLatestVersion.pluginSetup, 'admin setup').to.deep.equal(
    addresses.adminPluginSetup
  );

  // check new token voting version is deployed with correct setup
  const tokenVotingRepo = PluginRepo__factory.connect(
    addresses.tokenVotingRepo,
    member0
  );
  const tokenVotingLatestVersion = await tokenVotingRepo[
    'getLatestVersion(uint8)'
  ](1);

  expect(tokenVotingLatestVersion.tag.release, 'tokenVoting release').to.equal(
    1
  );
  expect(tokenVotingLatestVersion.tag.build, 'tokenVoting build').to.equal(3);
  expect(tokenVotingLatestVersion.pluginSetup, 'tokenVoting setup').to.equal(
    addresses.tokenVotingPluginSetup
  );

  // check new multisig version is deployed with correct setup
  const multisigRepo = PluginRepo__factory.connect(
    addresses.multisigRepo,
    member0
  );
  const multisigLatestVersion = await multisigRepo['getLatestVersion(uint8)'](
    1
  );

  expect(multisigLatestVersion.tag.release, 'multisig release').to.equal(1);
  expect(multisigLatestVersion.tag.build, 'multisig build').to.equal(3);
  expect(multisigLatestVersion.pluginSetup, 'multisig setup').to.equal(
    addresses.multisigPluginSetup
  );
}

// todo think when do this this test because it should only run when testing deployment
describe.only('1.4.0 Deployment', function () {
  let calldataJson: any;

  beforeEach(async () => {
    await forkNetwork(NETWORK);
    console.log('forked network: ', NETWORK);

    calldataJson = getCalldataJson();
  });

  // Close fork so that other tests(not related to this file) are
  // not run in forked network.
  afterEach(async () => {
    closeFork();
  });

  it('test the proposal can be created', async () => {
    const member0 = await impersonateAccount(daoMultisigMembers[0]);
    const multisig = Multisig_v1_3_0__factory.connect(daoMultisigAddr, member0);

    // get proposal count before
    const proposalCountBefore = await multisig.proposalCount();

    // execute the generated calldata
    let tx = await member0.sendTransaction({
      to: multisig.address,
      data: calldataJson.calldata,
      gasLimit: 3000000,
    });

    let receipt = await tx.wait();

    const proposalCountAfter = await multisig.proposalCount();

    // check proposal count is increased
    expect(proposalCountAfter).to.be.greaterThan(
      ethers.BigNumber.from(proposalCountBefore)
    );

    // check proposal created event
    let proposalCreatedEvent = getMultisigEvents(
      receipt,
      'ProposalCreated',
      multisig
    );

    const proposalId = proposalCreatedEvent.args.proposalId;
    expect(proposalCreatedEvent).to.not.be.undefined;
    expect(proposalCreatedEvent.args.creator).to.equal(member0.address);
    expect(proposalCreatedEvent.args.endDate).to.equal(
      calldataJson.functionArgs[calldataJson.functionArgs.length - 1]
    );
    expect(proposalCreatedEvent.args.actions.length).to.equal(
      calldataJson.functionArgs[1].length
    );
    expect(proposalCreatedEvent.args.actions.length).to.equal(
      calldataJson.functionArgs[1].length
    );

    // get proposal and check the info
    let proposal = await multisig.getProposal(proposalId);

    expect(proposal.executed).to.be.false;
    expect(proposal.approvals).to.equal(0);
    expect(proposal.actions.length).to.equal(
      calldataJson.functionArgs[1].length
    );

    // impersonate member1 member2 and member3 to approve proposal
    const member1 = await impersonateAccount(daoMultisigMembers[1]);
    const member2 = await impersonateAccount(daoMultisigMembers[2]);
    const member3 = await impersonateAccount(daoMultisigMembers[3]);

    const multisigAsMember1 = Multisig_v1_3_0__factory.connect(
      daoMultisigAddr,
      member1
    );
    const multisigAsMember2 = Multisig_v1_3_0__factory.connect(
      daoMultisigAddr,
      member2
    );
    const multisigAsMember3 = Multisig_v1_3_0__factory.connect(
      daoMultisigAddr,
      member3
    );

    // vote for the proposal
    await multisigAsMember1.approve(proposalId, false);
    await multisigAsMember2.approve(proposalId, false);
    await multisigAsMember3.approve(proposalId, false);

    // check the members approved the proposal
    expect(await multisig.hasApproved(proposalId, member0.address)).to.be.false;
    expect(await multisig.hasApproved(proposalId, member1.address)).to.be.true;
    expect(await multisig.hasApproved(proposalId, member2.address)).to.be.true;
    expect(await multisig.hasApproved(proposalId, member3.address)).to.be.true;

    // check the proposal can execute
    expect(await multisig.canExecute(proposalId)).to.be.true;

    // execute the proposal
    tx = await multisig.execute(proposalId);
    receipt = await tx.wait();

    // todo think on a way to parse all events or if it is worthy

    // check the proposal is executed
    proposal = await multisig.getProposal(proposalId);
    expect(proposal.executed).to.be.true;

    await checkStatusAfterProposal();
  });

  it('execute all the proposal actions one by one', async () => {
    const daoSigner = await impersonateAccount(daoAddress);

    // iterate over the actions and execute them one by one
    const actions = calldataJson.functionArgs[1];
    for (const action of actions) {
      let tx = await daoSigner.sendTransaction({
        to: action.to,
        data: action.data,
      });
    }

    await checkStatusAfterProposal();
  });
});
