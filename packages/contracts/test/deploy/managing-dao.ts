import {expect} from 'chai';
import {defaultAbiCoder} from 'ethers/lib/utils';

import hre, {ethers, deployments, getNamedAccounts} from 'hardhat';
import {Deployment} from 'hardhat-deploy/dist/types';
import {
  DAO,
  DAORegistry,
  DAO__factory,
  ENSSubdomainRegistrar,
  Multisig,
  PluginRepoRegistry,
} from '../../typechain';

async function deployAll() {
  await deployments.fixture();
}

const IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

describe('Managing DAO', function () {
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

  async function readImplementationValueFromSlot(
    contractAddresses: string[]
  ): Promise<string[]> {
    const implementationValues: string[] = await Promise.all(
      contractAddresses.map(async contractAddress => {
        const encoded = await ethers.provider.getStorageAt(
          contractAddress,
          IMPLEMENTATION_SLOT
        );
        return defaultAbiCoder.decode(['address'], encoded)[0];
      })
    );

    return implementationValues;
  }

  async function createUpgradeProposal(
    contractAddress: string[],
    newImplementationAddress: string
  ) {
    // create proposal to upgrade to new implementation
    const data = DAO__factory.createInterface().encodeFunctionData(
      'upgradeTo',
      [newImplementationAddress]
    );
    const actions = contractAddress.map(contract => {
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
    // deployment should be empty
    expect(await deployments.all()).to.be.empty;

    // deploy framework
    await deployAll();

    // ManagingDAO
    managingDaoDeployment = await deployments.get('DAO');
    managingDao = await ethers.getContractAt(
      'DAO',
      managingDaoDeployment.address
    );

    // DAORegistry
    daoRegistryDeployment = await deployments.get('DAORegistry');
    daoRegistry = await ethers.getContractAt(
      'DAORegistry',
      daoRegistryDeployment.address
    );

    // PluginRepoRegistry
    pluginRepoRegistryDeployment = await deployments.get('PluginRepoRegistry');
    pluginRepoRegistry = await ethers.getContractAt(
      'PluginRepoRegistry',
      pluginRepoRegistryDeployment.address
    );

    // ENSSubdomainRegistrar
    ensSubdomainRegistrarDeployments = [
      await deployments.get('DAO_ENSSubdomainRegistrar'),
      await deployments.get('Plugin_ENSSubdomainRegistrar'),
    ];
    ensSubdomainRegistrars = [
      await ethers.getContractAt(
        'ENSSubdomainRegistrar',
        ensSubdomainRegistrarDeployments[0].address
      ),
      await ethers.getContractAt(
        'ENSSubdomainRegistrar',
        ensSubdomainRegistrarDeployments[1].address
      ),
    ];

    const {deployer} = await getNamedAccounts();
    ownerAddress = deployer;

    multisig = await ethers.getContractAt(
      'Multisig',
      hre.managingDAOMultisigPluginAddress
    );
  });

  it('should have deployments', async function () {
    expect(await deployments.all()).to.not.be.empty;
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

    // make sure new `ManagingDAO` deployment is just an implementation and not a proxy
    expect(managingDaoV2Deployment.implementation).to.be.equal(undefined);

    // check new implementation is deferent from the one on the ManagingDao.
    // read from slot
    let implementationAddress = (
      await readImplementationValueFromSlot([managingDao.address])
    )[0];

    expect(managingDaoV2Deployment.address).not.equal(implementationAddress);

    // create proposal to upgrade to new implementation
    await createUpgradeProposal(
      [managingDao.address],
      managingDaoV2Deployment.address
    );

    // re-read from slot
    implementationAddress = (
      await readImplementationValueFromSlot([managingDao.address])
    )[0];

    expect(managingDaoV2Deployment.address).to.be.equal(implementationAddress);
  });

  it('Should be able to upgrade `DaoRegistry`', async function () {
    // deploy a new implementation.
    await deployments.deploy('DAORegistryV2', {
      contract: 'DAORegistry',
      from: ownerAddress,
      args: [],
      log: true,
    });

    const daoRegistryV2Deployment: Deployment = await deployments.get(
      'DAORegistryV2'
    );

    // make sure new `DAORegistryV2` deployment is just an implementation and not a proxy
    expect(daoRegistryV2Deployment.implementation).to.be.equal(undefined);

    // check new implementation is deferent from the one on the `DaoRegistry`.
    // read from slot
    let implementationAddress = (
      await readImplementationValueFromSlot([daoRegistry.address])
    )[0];

    expect(daoRegistryV2Deployment.address).not.equal(implementationAddress);

    // create proposal to upgrade to new implementation
    await createUpgradeProposal(
      [daoRegistry.address],
      daoRegistryV2Deployment.address
    );

    // re-read from slot
    implementationAddress = (
      await readImplementationValueFromSlot([daoRegistry.address])
    )[0];

    expect(daoRegistryV2Deployment.address).to.be.equal(implementationAddress);
  });

  it('Should be able to upgrade `PluginRepoRegistry`', async function () {
    // deploy a new implementation.
    await deployments.deploy('PluginRepoRegistryV2', {
      contract: 'PluginRepoRegistry',
      from: ownerAddress,
      args: [],
      log: true,
    });

    const pluginRepoRegistryV2Deployment: Deployment = await deployments.get(
      'PluginRepoRegistryV2'
    );

    // make sure new `PluginRepoRegistryV2` deployment is just an implementation and not a proxy
    expect(pluginRepoRegistryV2Deployment.implementation).to.be.equal(
      undefined
    );

    // check new implementation is deferent from the one on the `DaoRegistry`.
    // read from slot
    let implementationAddress = (
      await readImplementationValueFromSlot([pluginRepoRegistry.address])
    )[0];

    expect(pluginRepoRegistryV2Deployment.address).not.equal(
      implementationAddress
    );

    // create proposal to upgrade to new implementation
    await createUpgradeProposal(
      [pluginRepoRegistry.address],
      pluginRepoRegistryV2Deployment.address
    );

    // re-read from slot
    implementationAddress = (
      await readImplementationValueFromSlot([pluginRepoRegistry.address])
    )[0];

    expect(pluginRepoRegistryV2Deployment.address).to.be.equal(
      implementationAddress
    );
  });

  it('Should be able to upgrade `ENSSubdomainRegistrar`', async function () {
    // deploy a new implementation.
    await deployments.deploy('ENSSubdomainRegistrarV2', {
      contract: 'ENSSubdomainRegistrar',
      from: ownerAddress,
      args: [],
      log: true,
    });

    const ensSubdomainRegistrarV2Deployment: Deployment = await deployments.get(
      'ENSSubdomainRegistrarV2'
    );

    // make sure new `ENSSubdomainRegistrarV2` deployment is just an implementation and not a proxy
    expect(ensSubdomainRegistrarV2Deployment.implementation).to.be.equal(
      undefined
    );

    // check new implementation is deferent from the one on the `DaoRegistry`.
    // read from slot
    let implementationValues = await readImplementationValueFromSlot([
      ensSubdomainRegistrars[0].address,
      ensSubdomainRegistrars[1].address,
    ]);

    for (let index = 0; index < implementationValues.length; index++) {
      const implementationAddress = implementationValues[index];
      expect(ensSubdomainRegistrarV2Deployment.address).not.equal(
        implementationAddress
      );
    }

    // create proposal to upgrade to new implementation
    await createUpgradeProposal(
      ensSubdomainRegistrars.map(ensSR => ensSR.address),
      ensSubdomainRegistrarV2Deployment.address
    );

    // re-read from slot
    implementationValues = await readImplementationValueFromSlot([
      ensSubdomainRegistrars[0].address,
      ensSubdomainRegistrars[1].address,
    ]);

    for (let index = 0; index < implementationValues.length; index++) {
      const implementationAddress = implementationValues[index];
      expect(ensSubdomainRegistrarV2Deployment.address).to.be.equal(
        implementationAddress
      );
    }
  });

  it('Should be able to upgrade `PluginRepo`s', async function () {
    // deploy a new implementation.
    await deployments.deploy('PluginRepoV2', {
      contract: 'PluginRepo',
      from: ownerAddress,
      args: [],
      log: true,
    });

    const pluginRepoV2Deployment: Deployment = await deployments.get(
      'PluginRepoV2'
    );

    // make sure new `PluginRepoV2` deployment is just an implementation and not a proxy
    expect(pluginRepoV2Deployment.implementation).to.be.equal(undefined);

    // check new implementation is deferent from the one on the `DaoRegistry`.
    // read from slot
    let implementationValues = await readImplementationValueFromSlot([
      hre.aragonPluginRepos['token-voting'],
      hre.aragonPluginRepos['address-list-voting'],
      hre.aragonPluginRepos['admin'],
      hre.aragonPluginRepos['multisig'],
    ]);

    for (let index = 0; index < implementationValues.length; index++) {
      const implementationAddress = implementationValues[index];
      expect(pluginRepoV2Deployment.address).to.not.equal(
        implementationAddress
      );
    }

    // create proposal to upgrade to new implementation
    await createUpgradeProposal(
      Object.values(hre.aragonPluginRepos),
      pluginRepoV2Deployment.address
    );

    // re-read from slot
    implementationValues = await readImplementationValueFromSlot([
      hre.aragonPluginRepos['token-voting'],
      hre.aragonPluginRepos['address-list-voting'],
      hre.aragonPluginRepos['admin'],
      hre.aragonPluginRepos['multisig'],
    ]);

    for (let index = 0; index < implementationValues.length; index++) {
      const implementationAddress = implementationValues[index];
      expect(pluginRepoV2Deployment.address).to.be.equal(implementationAddress);
    }
  });
});
