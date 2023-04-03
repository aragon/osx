import {writeFile} from 'fs/promises';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {Multisig__factory} from '../../../typechain';
import {getManagingDAOMultisigAddress, uploadToIPFS} from '../../helpers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nCreating managing DAO Proposal');
  if (hre.managingDAOActions.length === 0) {
    console.log('No actions defined');
    return;
  }

  const {ethers, network} = hre;
  const [deployer] = await ethers.getSigners();

  const managingDAOMultisigAddress = await getManagingDAOMultisigAddress(hre);
  const managingDAOMultisig = Multisig__factory.connect(
    managingDAOMultisigAddress,
    ethers.provider
  );
  const managingDAOMultisigSettings =
    await managingDAOMultisig.callStatic.multisigSettings();

  const proposalDescription = hre.managingDAOActions
    .map(action => action.description)
    .join('\n');
  const cid = await uploadToIPFS(proposalDescription, network.name);

  if (managingDAOMultisigSettings.onlyListed) {
    if (!(await managingDAOMultisig.callStatic.isMember(deployer.address))) {
      console.log(
        `ManagingDAOMultisig (${managingDAOMultisigAddress}) doesn't allow deployer ${deployer.address} to create proposal.`
      );
      const tx = await managingDAOMultisig.populateTransaction.createProposal(
        ethers.utils.toUtf8Bytes(`ipfs://${cid}`),
        hre.managingDAOActions,
        0,
        true,
        true,
        0,
        Math.round(Date.now() / 1000) + 30 * 24 * 60 * 60 // Lets the proposal end in 30 days
      );
      await writeFile('./managingDAOTX.json', JSON.stringify(tx));
      console.log('Saved transaction to managingDAOTX.json');
    }
    return;
  }

  console.log(
    `ManagingDAOMultisig (${managingDAOMultisigAddress}) does allow deployer ${deployer.address} to create proposal.`
  );
  const tx = await managingDAOMultisig.createProposal(
    ethers.utils.toUtf8Bytes(`ipfs://${cid}`),
    hre.managingDAOActions,
    0,
    true,
    true,
    0,
    Math.round(Date.now() / 1000) + 30 * 24 * 60 * 60 // Lets the proposal end in 30 days
  );
  console.log(`Creating proposal with tx ${tx.hash}`);
  await tx.wait();
  console.log(
    `Proposal created in managingDAO Multisig ${managingDAOMultisigAddress}`
  );
};
export default func;
func.tags = ['ManagingDAOProposal'];
