import {expect} from 'chai';
import {defaultAbiCoder} from 'ethers/lib/utils';

import hre, {ethers, deployments, getNamedAccounts} from 'hardhat';
import {Deployment} from 'hardhat-deploy/dist/types';
import {DAO, DAORegistry, Multisig} from '../../typechain';
import {EHRE} from '../../utils/types';

async function deployAll() {
  await deployments.fixture();
}

const IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

describe('Managing DAO', function () {
  let ehre: EHRE;
  let ownerAddress: string;
  let managingDaoDeployment: Deployment;
  let managingDao: DAO;
  let multisig: Multisig;
  let daoRegistryDeployment: DAORegistry;
  let daoRegistry: string;

  before(async () => {
    // deploy framework
    await deployAll();

    managingDaoDeployment = await deployments.get('DAO');

    managingDao = await ethers.getContractAt(
      'DAO',
      managingDaoDeployment.address
    );

    daoRegistryDeployment = await deployments.get('DAORegistry');

    const {deployer} = await getNamedAccounts();
    ownerAddress = deployer;

    ehre = hre as EHRE;

    multisig = await ethers.getContractAt(
      'Multisig',
      ehre.managingDAOMultisigPluginAddress
    );
  });

  it('should have deployments', async function () {
    // log deployment
    console.log(
      'ownerAddress',
      ownerAddress,
      'managingDao.address',
      managingDao.address,
      'hre managingDAOMultisigPluginAddress',
      ehre.managingDAOMultisigPluginAddress
    );
  });

  it('should be able to upgrade `ManagingDAO` itself', async function () {
    // deploy a new dao implementation.
    await deployments.deploy('DAOv2', {
      contract: 'DAO',
      from: ownerAddress,
      args: [],
      log: true,
    });

    const managingDaoV2Deployment: Deployment = await deployments.get('DAOv2');

    // make sure new dao deployment is just an implementation and not a proxy
    expect(managingDaoV2Deployment.implementation).to.be.equal(undefined);

    // check new implementation is deferent from the one on the ManagingDao.
    // read from slot
    let implementationSlot = await ethers.provider.getStorageAt(
      managingDao.address,
      IMPLEMENTATION_SLOT
    );

    let implementationAtSlot = defaultAbiCoder.decode(
      ['address'],
      implementationSlot
    )[0];

    expect(managingDaoV2Deployment.address).not.equal(implementationAtSlot);

    // create proposal to upgrade to new implementation
    const iface = new ethers.utils.Interface(managingDaoDeployment.abi);
    const data = iface.encodeFunctionData('upgradeTo', [
      managingDaoV2Deployment.address,
    ]);
    const actions = [{to: managingDao.address, value: 0, data: data}];
    await multisig.createProposal(
      '0x', // metadata
      actions,
      0, // allowFailureMap
      true, // approve proposal
      true, // execute proposal
      0, // start date: now
      Math.floor(Date.now() / 1000) + 86400 // end date: now + 1 day
    );

    // re-read from slot
    implementationSlot = await ethers.provider.getStorageAt(
      managingDao.address,
      IMPLEMENTATION_SLOT
    );

    implementationAtSlot = defaultAbiCoder.decode(
      ['address'],
      implementationSlot
    )[0];

    expect(implementationAtSlot).to.be.equal(managingDaoV2Deployment.address);
  });

  // it('Should be able to upgrade the `Multisig` of `ManagingDAO`', async function () {
  //   // deploy new multisig implementation
  //   await deployments.deploy('MultisigV2', {
  //     contract: 'Multisig',
  //     from: ownerAddress,
  //     args: [],
  //     log: true,
  //   });

  //   const multisigV2Deployment: Deployment = await deployments.get(
  //     'MultisigV2'
  //   );

  //   expect(await multisig.getImplementationAddress()).not.equal(
  //     multisigV2Deployment.address
  //   );

  //   // upgrade plugin via psp
  //   // create a proposal

  // });

  it('Should be able to upgrade `DaoRegistry`', async function () {
    // deploy a new dao implementation.
    await deployments.deploy('DAORegistryV2', {
      contract: 'DAORegistry',
      from: ownerAddress,
      args: [],
      log: true,
    });
  });
});
