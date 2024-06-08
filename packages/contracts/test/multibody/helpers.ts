import {
  MultiBody,
  MultiBody__factory,
  TokenVotingPlugin,
  TokenVotingPlugin__factory,
  MultisigPlugin__factory,
  MultisigPlugin,
} from '../../typechain';
import {ethers} from 'hardhat';
import {deployWithProxy} from '../test-utils/proxy';
import {
  ONE_HOUR,
  VoteOption,
  VotingMode,
  pctToRatio,
} from '../test-utils/voting';
import {deployNewDAO} from '../test-utils/dao';
import {GovernanceERC20Mock__factory} from '@aragon/osx-ethers-v1.2.0';

export async function deployPluginA(executorAddr: string) {
  const signers = await ethers.getSigners();

  const TokenVotingFactory = new TokenVotingPlugin__factory(signers[0]);

  const voting = (await deployWithProxy(
    TokenVotingFactory
  )) as TokenVotingPlugin;

  const settings = {
    votingMode: VotingMode.EarlyExecution,
    supportThreshold: pctToRatio(50),
    minParticipation: pctToRatio(20),
    minDuration: ONE_HOUR,
    minProposerVotingPower: 0,
  };

  console.log(settings)

  const dao = await deployNewDAO(signers[0]);

  const GovernanceERC20Mock = new GovernanceERC20Mock__factory(signers[0]);
  const governanceErc20Mock = await GovernanceERC20Mock.deploy(
    dao.address,
    'GOV',
    'GOV',
    {
      receivers: [],
      amounts: [],
    }
  );

  await voting.initialize(dao.address, settings, governanceErc20Mock.address);

  await voting.setExecutor(executorAddr);

//   await governanceErc20Mock.setBalance(signers[1].address, 10);

  return voting;
}

export async function deployPluginB(executorAddr: string) {
  const signers = await ethers.getSigners();
  const multisigSettings = {
    minApprovals: 3,
    onlyListed: false,
  };

  const MultisigFactory = new MultisigPlugin__factory(signers[0]);
  const multisig = (await deployWithProxy(MultisigFactory)) as MultisigPlugin;

  const dao = await deployNewDAO(signers[0]);

  await multisig.initialize(
    dao.address,
    signers.slice(0, 5).map(s => s.address),
    multisigSettings
  );

  await multisig.setExecutor(executorAddr);

  return multisig;
}

export async function deployMultibody() {
  const signers = await ethers.getSigners();
  const multibodyFactory = new ethers.ContractFactory(
    MultiBody__factory.abi,
    MultiBody__factory.bytecode,
    signers[0]
  );

  const multibody = (await multibodyFactory.deploy()) as MultiBody;
  return multibody;
}
