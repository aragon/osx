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
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

async function deployAll() {
  await deployments.fixture();
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
      await readImplementationValuesFromSlot([daoRegistry.address])
    )[0];

    expect(daoRegistryV2Deployment.address).not.equal(implementationAddress);

    // create proposal to upgrade to new implementation
    await createUpgradeProposal(
      [daoRegistry.address],
      daoRegistryV2Deployment.address
    );

    // re-read from slot
    implementationAddress = (
      await readImplementationValuesFromSlot([daoRegistry.address])
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
      await readImplementationValuesFromSlot([pluginRepoRegistry.address])
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
      await readImplementationValuesFromSlot([pluginRepoRegistry.address])
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
    let implementationValues = await readImplementationValuesFromSlot([
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
    implementationValues = await readImplementationValuesFromSlot([
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
    let implementationValues = await readImplementationValuesFromSlot([
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
    implementationValues = await readImplementationValuesFromSlot([
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
