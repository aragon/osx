import {getLatestContractAddress} from '../../deploy/helpers';
import {Multisig__factory as Multisig_v1_3_0__factory} from '../../typechain/@aragon/osx-v1.3.0/plugins/governance/multisig/Multisig.sol';
import {closeFork, initForkForOsxVersion} from '../test-utils/fixture';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import * as fs from 'fs';
import hre, {ethers} from 'hardhat';
import * as path from 'path';

// change to test on a different network
const NETWORK = 'sepolia';

const mergedProposalActionsPath = path.join(
  __dirname,
  '../../scripts/merged-proposals.json'
);

const calldataPath = path.join(__dirname, '../../scripts/calldata.json');

const daoAddress = '0xca834b3f404c97273f34e108029eed776144d324';
const daoMultisigAddr = '0xfcead61339e3e73090b587968fce8b090e0600ef';
const daoMultisigMembers = [
  '0x25cd4b8a02a8f9e920eb02fac38c2954694a3fa5',
  '0x3ffe3f16d47a54b1c6a3f47c9e6ff5c2c1b32859',
  '0x42342037e0fc34c130cdb079139f8ae56d38453f',
  '0xaf2c536f9af22548829b20e9afc567259c820c62',
  '0xdf62645a2c714febbf6060d1fb607e7eccef0659',
];

async function forkNetwork(network: string) {
  hre.network.deploy = ['./deploy/update/to_v1.4.0'];

  await initForkForOsxVersion(network, {
    version: '1.3.0',
    forkBlockNumber: 7680675, // todo adjust to latest block
    activeContracts: [],
  });
}

function getCalldataJson() {
  // read calldata json
  const calldataJson = JSON.parse(fs.readFileSync(calldataPath, 'utf8'));

  return calldataJson;
}

async function impersonateAccount(addr: string) {
  await hre.network.provider.send('hardhat_setBalance', [
    addr,
    ethers.utils.parseUnits('3', 'ether').toHexString(),
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

describe.only('1.4.0 Deployment', function () {
  let deployer: SignerWithAddress;
  let calldataJson: any;

  beforeEach(async () => {
    await forkNetwork(NETWORK);

    calldataJson = getCalldataJson();

    [deployer] = await ethers.getSigners();
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
    });

    let receipt = await tx.wait();

    const proposalCountAfter = await multisig.proposalCount();

    // check proposal count is increased
    expect(proposalCountAfter).to.be.greaterThan(
      ethers.BigNumber.from(proposalCountBefore)
    );

    // check proposal created event

    // get the event
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
    const proposal = await multisig.getProposal(proposalId);

    expect(proposal.executed).to.be.false;
    expect(proposal.approvals).to.equal(0);
    expect(proposal.actions.length).to.equal(
      calldataJson.functionArgs[1].length
    );

    // impersonate member1 member2 and member3 to approve proposal
    const member1 = await impersonateAccount(daoMultisigMembers[1]);
    const member2 = await impersonateAccount(daoMultisigMembers[2]);
    const member3 = await impersonateAccount(daoMultisigMembers[3]);
    const member4 = await impersonateAccount(daoMultisigMembers[4]);

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

    // todo think on a way to parse all events
    // check the proposal is executed event
    // let proposalExecutedEvent = getMultisigEvents(
    //   receipt,
    //   'ProposalExecuted',
    //   multisig
    // );

    // expect(proposalExecutedEvent).to.not.be.undefined;
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

    // todo add check for
    // 1- permissions are correct
    // 1.1- new factories and old factories have permission
    // 2- all plugins new versions are created
  });
});
