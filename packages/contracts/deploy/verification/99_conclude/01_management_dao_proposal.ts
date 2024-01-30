import {Multisig__factory} from '../../../typechain';
import {getManagementDAOMultisigAddress, uploadToIPFS} from '../../helpers';
import {writeFile} from 'fs/promises';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nCreating management DAO Proposal');
  if (hre.managementDAOActions.length === 0) {
    console.log('No actions defined');
    return;
  }

  const {ethers, network} = hre;
  const [deployer] = await ethers.getSigners();

  const managementDAOMultisigAddress = await getManagementDAOMultisigAddress(
    hre
  );
  const managementDAOMultisig = Multisig__factory.connect(
    managementDAOMultisigAddress,
    ethers.provider
  );
  const managementDAOMultisigSettings =
    await managementDAOMultisig.callStatic.multisigSettings();

  const proposalDescription = hre.managementDAOActions
    .map(action => `<li>${action.description}</li>`)
    .join('');
  const cid = await uploadToIPFS(
    JSON.stringify({
      title: 'Framework Upgrade 1.3.0',
      summary: `This proposal upgrades the framework on ${network.name} to version 1.3.0.`,
      description: `<ul>${proposalDescription}</ul>`,
      resources: [],
    }),
    network.name
  );

  if (managementDAOMultisigSettings.onlyListed) {
    if (!(await managementDAOMultisig.callStatic.isMember(deployer.address))) {
      console.log(
        `ManagementDAOMultisig (${managementDAOMultisigAddress}) doesn't allow deployer ${deployer.address} to create proposal.`
      );
      const tx = await managementDAOMultisig.populateTransaction.createProposal(
        ethers.utils.toUtf8Bytes(`ipfs://${cid}`),
        hre.managementDAOActions,
        0,
        true,
        false,
        0,
        Math.round(Date.now() / 1000) + 30 * 24 * 60 * 60 // Lets the proposal end in 30 days
      );
      await writeFile('./managementDAOTX.json', JSON.stringify(tx));
      console.log('Saved transaction to managementDAOTX.json');
    }
    return;
  }

  console.log(
    `ManagementDAOMultisig (${managementDAOMultisigAddress}) does allow deployer ${deployer.address} to create proposal.`
  );
  const tx = await managementDAOMultisig.createProposal(
    ethers.utils.toUtf8Bytes(`ipfs://${cid}`),
    hre.managementDAOActions,
    0,
    true,
    true,
    0,
    Math.round(Date.now() / 1000) + 30 * 24 * 60 * 60 // Lets the proposal end in 30 days
  );
  console.log(`Creating proposal with tx ${tx.hash}`);
  await tx.wait();
  console.log(
    `Proposal created in managementDAO Multisig ${managementDAOMultisigAddress}`
  );
};
export default func;
func.tags = ['New', 'ManagementDAOProposal'];
