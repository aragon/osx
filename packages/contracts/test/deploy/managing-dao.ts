import {expect} from 'chai';
import {readImplementationValuesFromSlot} from '../../utils/storage';

import hre, {ethers, deployments, getNamedAccounts} from 'hardhat';
import {Deployment} from 'hardhat-deploy/dist/types';
import {
  DAO,
  DAORegistry,
  DAORegistry__factory,
  DAO__factory,
  ENSSubdomainRegistrar,
  ENSSubdomainRegistrar__factory,
  Multisig,
  Multisig__factory,
  PluginRepoRegistry,
  PluginRepoRegistry__factory,
} from '../../typechain';

import daoArtifactData from '../../artifacts/src/core/dao/DAO.sol/DAO.json';
import daoRegistryArtifactData from '../../artifacts/@aragon/osx-v1.0.1/framework/dao/DAORegistry.sol/DAORegistry.json';
import pluginRepoRegistryArtifactData from '../../artifacts/@aragon/osx-v1.0.1/framework/plugin/repo/PluginRepoRegistry.sol/PluginRepoRegistry.json';
import pluginRepoArtifactData from '../../artifacts/@aragon/osx-v1.0.1/framework/plugin/repo/PluginRepo.sol/PluginRepo.json';
import ensSubdomainRegistrarArtifactData from '../../artifacts/@aragon/osx-v1.0.1/framework/utils/ens/ENSSubdomainRegistrar.sol/ENSSubdomainRegistrar.json';

import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {initializeDeploymentFixture} from '../test-utils/fixture';

async function deployAll() {
  await initializeDeploymentFixture('New');
}

describe('Managing DAO', function () {
  let signers: SignerWithAddress[];
  let ownerAddress: string;
  let managingDaoDeployment: Deployment;
  let managingDao: DAO;
  let multisig: Multisig;
  let daoRegistryDeployment: Deployment;
  let daoRegistry: DAORegistry;
  let pluginRepoRegistryDeployment: Deployment;
  let pluginRepoRegistry: PluginRepoRegistry;
  let ensSubdomainRegistrarDeployments: Deployment[];
  let ensSubdomainRegistrars: ENSSubdomainRegistrar[];

  async function createUpgradeProposal(
    contractAddress: string[],
    newImplementationAddress: string
  ) {
    // create proposal to upgrade to new implementation
    const data = DAO__factory.createInterface().encodeFunctionData(
      'upgradeTo',
      [newImplementationAddress]
    );
    const actions = contractAddress
      .filter(address => address != '')
      .map(contract => {
        return {to: contract, value: 0, data: data};
      });

    await multisig.createProposal(
      '0x', // metadata
      actions,
      0, // allowFailureMap
      true, // approve proposal
      true, // execute proposal
      0, // start date: now
      Math.floor(Date.now() / 1000) + 86400 // end date: now + 1 day
    );
  }

  before(async () => {
    signers = await ethers.getSigners();

    // deployment should be empty
    expect(await deployments.all()).to.be.empty;

    // deploy framework
    await deployAll();

    // ManagingDAO
    managingDaoDeployment = await deployments.get('DAO');
    managingDao = DAO__factory.connect(
      managingDaoDeployment.address,
      signers[0]
    );

    // DAORegistry
    daoRegistryDeployment = await deployments.get('DAORegistry');
    daoRegistry = DAORegistry__factory.connect(
      daoRegistryDeployment.address,
      signers[0]
    );

    // PluginRepoRegistry
    pluginRepoRegistryDeployment = await deployments.get('PluginRepoRegistry');
    pluginRepoRegistry = PluginRepoRegistry__factory.connect(
      pluginRepoRegistryDeployment.address,
      signers[0]
    );

    // ENSSubdomainRegistrar
    ensSubdomainRegistrarDeployments = [
      await deployments.get('DAO_ENSSubdomainRegistrar'),
      await deployments.get('Plugin_ENSSubdomainRegistrar'),
    ];
    ensSubdomainRegistrars = [
      ENSSubdomainRegistrar__factory.connect(
        ensSubdomainRegistrarDeployments[0].address,
        signers[0]
      ),
      ENSSubdomainRegistrar__factory.connect(
        ensSubdomainRegistrarDeployments[1].address,
        signers[0]
      ),
    ];

    const {deployer} = await getNamedAccounts();
    ownerAddress = deployer;

    multisig = Multisig__factory.connect(
      hre.managingDAOMultisigPluginAddress,
      signers[0]
    );
  });

  it('should have deployments', async function () {
    expect(await deployments.all()).to.not.be.empty;
  });

  it('should be able to upgrade `ManagingDAO` itself', async function () {
    // deploy a new dao implementation.
    await deployments.deploy('DAOv2', {
      contract: daoArtifactData,
      from: ownerAddress,
      args: [],
      log: true,
    });

    const managingDaoV2Deployment: Deployment = await deployments.get('DAOv2');

    // make sure new `ManagingDAO` deployment is just an implementation and not a proxy
    expect(managingDaoV2Deployment.implementation).to.be.equal(undefined);

    // check new implementation is deferent from the one on the ManagingDao.
    // read from slot
    let implementationAddress = (
      await readImplementationValuesFromSlot([managingDao.address])
    )[0];

    expect(managingDaoV2Deployment.address).not.equal(implementationAddress);

    // create proposal to upgrade to new implementation
    await createUpgradeProposal(
      [managingDao.address],
      managingDaoV2Deployment.address
    );

    // re-read from slot
    implementationAddress = (
      await readImplementationValuesFromSlot([managingDao.address])
    )[0];

    expect(managingDaoV2Deployment.address).to.be.equal(implementationAddress);
  });

  it('Should be able to upgrade `DaoRegistry`', async function () {
    // deploy a new implementation.
    const daoRegistry_v1_0_0_Deployment = await deployments.deploy(
      'DAORegistry_v1_0_0',
      {
        contract: daoRegistryArtifactData,
        from: ownerAddress,
        args: [],
        log: true,
      }
    );

    // make sure new `DAORegistryV2` deployment is just an implementation and not a proxy
    expect(daoRegistry_v1_0_0_Deployment.implementation).to.be.equal(undefined);

    // check new implementation is deferent from the one on the `DaoRegistry`.
    // read from slot
    let implementationAddress = (
      await readImplementationValuesFromSlot([daoRegistry.address])
    )[0];

    expect(daoRegistry_v1_0_0_Deployment.address).not.equal(
      implementationAddress
    );

    // create proposal to upgrade to new implementation
    await createUpgradeProposal(
      [daoRegistry.address],
      daoRegistry_v1_0_0_Deployment.address
    );

    // re-read from slot
    implementationAddress = (
      await readImplementationValuesFromSlot([daoRegistry.address])
    )[0];

    expect(daoRegistry_v1_0_0_Deployment.address).to.be.equal(
      implementationAddress
    );
  });

  it('Should be able to upgrade `PluginRepoRegistry`', async function () {
    // deploy a new implementation.
    const pluginRepoRegistry_v1_0_0_Deployment = await deployments.deploy(
      'PluginRepoRegistry_v1_0_0',
      {
        contract: pluginRepoRegistryArtifactData,
        from: ownerAddress,
        args: [],
        log: true,
      }
    );

    // make sure new `PluginRepoRegistryV2` deployment is just an implementation and not a proxy
    expect(pluginRepoRegistry_v1_0_0_Deployment.implementation).to.be.equal(
      undefined
    );

    // check new implementation is deferent from the one on the `DaoRegistry`.
    // read from slot
    let implementationAddress = (
      await readImplementationValuesFromSlot([pluginRepoRegistry.address])
    )[0];

    expect(pluginRepoRegistry_v1_0_0_Deployment.address).not.equal(
      implementationAddress
    );

    // create proposal to upgrade to new implementation
    await createUpgradeProposal(
      [pluginRepoRegistry.address],
      pluginRepoRegistry_v1_0_0_Deployment.address
    );

    // re-read from slot
    implementationAddress = (
      await readImplementationValuesFromSlot([pluginRepoRegistry.address])
    )[0];

    expect(pluginRepoRegistry_v1_0_0_Deployment.address).to.be.equal(
      implementationAddress
    );
  });

  it('Should be able to upgrade `ENSSubdomainRegistrar`', async function () {
    // deploy a new implementation.
    const ensSubdomainRegistrar_v1_0_0_Deployment = await deployments.deploy(
      'ENSSubdomainRegistrar_v1_0_0',
      {
        contract: ensSubdomainRegistrarArtifactData,
        from: ownerAddress,
        args: [],
        log: true,
      }
    );

    // make sure new `ENSSubdomainRegistrarV2` deployment is just an implementation and not a proxy
    expect(ensSubdomainRegistrar_v1_0_0_Deployment.implementation).to.be.equal(
      undefined
    );

    // check new implementation is deferent from the one on the `DaoRegistry`.
    // read from slot
    let implementationValues = await readImplementationValuesFromSlot([
      ensSubdomainRegistrars[0].address,
      ensSubdomainRegistrars[1].address,
    ]);

    for (let index = 0; index < implementationValues.length; index++) {
      const implementationAddress = implementationValues[index];
      expect(ensSubdomainRegistrar_v1_0_0_Deployment.address).not.equal(
        implementationAddress
      );
    }

    // create proposal to upgrade to new implementation
    await createUpgradeProposal(
      ensSubdomainRegistrars.map(ensSR => ensSR.address),
      ensSubdomainRegistrar_v1_0_0_Deployment.address
    );

    // re-read from slot
    implementationValues = await readImplementationValuesFromSlot([
      ensSubdomainRegistrars[0].address,
      ensSubdomainRegistrars[1].address,
    ]);

    for (let index = 0; index < implementationValues.length; index++) {
      const implementationAddress = implementationValues[index];
      expect(ensSubdomainRegistrar_v1_0_0_Deployment.address).to.be.equal(
        implementationAddress
      );
    }
  });

  it('Should be able to upgrade `PluginRepo`s', async function () {
    // deploy a new implementation.
    const PluginRepo_v1_0_0_Deployment = await deployments.deploy(
      'PluginRepo_v1_0_0',
      {
        contract: pluginRepoArtifactData,
        from: ownerAddress,
        args: [],
        log: true,
      }
    );

    // For some networks, not every repo is deployed, in which case
    // hre.aragonPluginRepos contains empty string for that repo and
    // causing the below code to fail.
    const deployedRepoAddresses = [];

    for (const [key, value] of Object.entries(hre.aragonPluginRepos)) {
      if (value == '') continue;
      deployedRepoAddresses.push(value);
    }

    // make sure new `PluginRepoV2` deployment is just an implementation and not a proxy
    expect(PluginRepo_v1_0_0_Deployment.implementation).to.be.equal(undefined);

    // check new implementation is deferent from the one on the `DaoRegistry`.
    // read from slot

    const repos = hre.aragonPluginRepos.filter;

    let implementationValues = await readImplementationValuesFromSlot(
      deployedRepoAddresses
    );

    for (let index = 0; index < implementationValues.length; index++) {
      const implementationAddress = implementationValues[index];
      expect(PluginRepo_v1_0_0_Deployment.address).to.not.equal(
        implementationAddress
      );
    }

    // create proposal to upgrade to new implementation
    await createUpgradeProposal(
      Object.values(hre.aragonPluginRepos),
      PluginRepo_v1_0_0_Deployment.address
    );

    // re-read from slot
    implementationValues = await readImplementationValuesFromSlot(
      deployedRepoAddresses
    );

    for (let index = 0; index < implementationValues.length; index++) {
      const implementationAddress = implementationValues[index];
      expect(PluginRepo_v1_0_0_Deployment.address).to.be.equal(
        implementationAddress
      );
    }
  });
});
