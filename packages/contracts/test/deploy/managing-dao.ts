import {expect} from 'chai';
import {BigNumberish} from 'ethers';
import {defaultAbiCoder} from 'ethers/lib/utils';

import hre, {ethers, deployments, getNamedAccounts, artifacts} from 'hardhat';
import {Deployment} from 'hardhat-deploy/dist/types';
import {
  DAO,
  DAORegistry,
  ENSSubdomainRegistrar,
  Multisig,
  PluginRepoRegistry,
  PluginSetupProcessor,
} from '../../typechain';
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
  let daoRegistryDeployment: Deployment;
  let daoRegistry: DAORegistry;
  let pluginRepoRegistryDeployment: Deployment;
  let pluginRepoRegistry: PluginRepoRegistry;
  let ensSubdomainRegistrarDeployments: Deployment[];
  let ensSubdomainRegistrars: ENSSubdomainRegistrar[];

  before(async () => {
    // deployment should be empty
    expect(await deployments.all()).to.be.empty;

    // deploy framework
    await deployAll();

    // prepare ehre
    ehre = hre as EHRE;

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
      ehre.managingDAOMultisigPluginAddress
    );
  });

  it('should has deployments', async function () {
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
    let implementationValuePaddedSlot = await ethers.provider.getStorageAt(
      managingDao.address,
      IMPLEMENTATION_SLOT
    );

    let implementationValue = defaultAbiCoder.decode(
      ['address'],
      implementationValuePaddedSlot
    )[0];

    expect(managingDaoV2Deployment.address).not.equal(implementationValue);

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
    implementationValuePaddedSlot = await ethers.provider.getStorageAt(
      managingDao.address,
      IMPLEMENTATION_SLOT
    );

    implementationValue = defaultAbiCoder.decode(
      ['address'],
      implementationValuePaddedSlot
    )[0];

    expect(implementationValue).to.be.equal(managingDaoV2Deployment.address);
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
    let implementationValuePaddedSlot = await ethers.provider.getStorageAt(
      daoRegistry.address,
      IMPLEMENTATION_SLOT
    );

    let implementationValue = defaultAbiCoder.decode(
      ['address'],
      implementationValuePaddedSlot
    )[0];

    expect(daoRegistryV2Deployment.address).not.equal(implementationValue);

    // create proposal to upgrade to new implementation
    const iface = new ethers.utils.Interface(daoRegistryDeployment.abi);
    const data = iface.encodeFunctionData('upgradeTo', [
      daoRegistryV2Deployment.address,
    ]);
    const actions = [{to: daoRegistry.address, value: 0, data: data}];
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
    implementationValuePaddedSlot = await ethers.provider.getStorageAt(
      daoRegistry.address,
      IMPLEMENTATION_SLOT
    );

    implementationValue = defaultAbiCoder.decode(
      ['address'],
      implementationValuePaddedSlot
    )[0];

    expect(implementationValue).to.be.equal(daoRegistryV2Deployment.address);
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
    let implementationValuePaddedSlot = await ethers.provider.getStorageAt(
      pluginRepoRegistry.address,
      IMPLEMENTATION_SLOT
    );

    let implementationValue = defaultAbiCoder.decode(
      ['address'],
      implementationValuePaddedSlot
    )[0];

    expect(pluginRepoRegistryV2Deployment.address).not.equal(
      implementationValue
    );

    // create proposal to upgrade to new implementation
    const iface = new ethers.utils.Interface(pluginRepoRegistryDeployment.abi);
    const data = iface.encodeFunctionData('upgradeTo', [
      pluginRepoRegistryV2Deployment.address,
    ]);
    const actions = [{to: pluginRepoRegistry.address, value: 0, data: data}];
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
    implementationValuePaddedSlot = await ethers.provider.getStorageAt(
      pluginRepoRegistry.address,
      IMPLEMENTATION_SLOT
    );

    implementationValue = defaultAbiCoder.decode(
      ['address'],
      implementationValuePaddedSlot
    )[0];

    expect(implementationValue).to.be.equal(
      pluginRepoRegistryV2Deployment.address
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
    let implementationValuesPaddedSlot = [
      await ethers.provider.getStorageAt(
        ensSubdomainRegistrars[0].address,
        IMPLEMENTATION_SLOT
      ),
      await ethers.provider.getStorageAt(
        ensSubdomainRegistrars[1].address,
        IMPLEMENTATION_SLOT
      ),
    ];

    let implementationValues = [
      defaultAbiCoder.decode(['address'], implementationValuesPaddedSlot[0])[0],
      defaultAbiCoder.decode(['address'], implementationValuesPaddedSlot[1])[0],
    ];

    for (let index = 0; index < implementationValues.length; index++) {
      const value = implementationValues[index];
      expect(ensSubdomainRegistrarV2Deployment.address).not.equal(value);
    }

    // create proposal to upgrade to new implementation
    const iface = new ethers.utils.Interface(
      ensSubdomainRegistrarDeployments[0].abi
    );
    const data = iface.encodeFunctionData('upgradeTo', [
      ensSubdomainRegistrarV2Deployment.address,
    ]);
    // upgrade both `DAO_ENSSubdomainRegistrar` & `Plugin_ENSSubdomainRegistrar`.
    const actions = [
      {to: ensSubdomainRegistrars[0].address, value: 0, data: data},
      {to: ensSubdomainRegistrars[1].address, value: 0, data: data},
    ];
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
    implementationValuesPaddedSlot = [
      await ethers.provider.getStorageAt(
        ensSubdomainRegistrars[0].address,
        IMPLEMENTATION_SLOT
      ),
      await ethers.provider.getStorageAt(
        ensSubdomainRegistrars[1].address,
        IMPLEMENTATION_SLOT
      ),
    ];

    implementationValues = [
      defaultAbiCoder.decode(['address'], implementationValuesPaddedSlot[0])[0],
      defaultAbiCoder.decode(['address'], implementationValuesPaddedSlot[1])[0],
    ];

    for (let index = 0; index < implementationValues.length; index++) {
      const value = implementationValues[index];
      expect(value).to.be.equal(ensSubdomainRegistrarV2Deployment.address);
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
    let implementationValuesPaddedSlot = [
      await ethers.provider.getStorageAt(
        ehre.aragonPluginRepos['token-voting'],
        IMPLEMENTATION_SLOT
      ),
      await ethers.provider.getStorageAt(
        ehre.aragonPluginRepos['address-list-voting'],
        IMPLEMENTATION_SLOT
      ),
      await ethers.provider.getStorageAt(
        ehre.aragonPluginRepos.admin,
        IMPLEMENTATION_SLOT
      ),
      await ethers.provider.getStorageAt(
        ehre.aragonPluginRepos.multisig,
        IMPLEMENTATION_SLOT
      ),
    ];

    let implementationValues = [
      defaultAbiCoder.decode(['address'], implementationValuesPaddedSlot[0])[0],
      defaultAbiCoder.decode(['address'], implementationValuesPaddedSlot[1])[0],
      defaultAbiCoder.decode(['address'], implementationValuesPaddedSlot[2])[0],
      defaultAbiCoder.decode(['address'], implementationValuesPaddedSlot[3])[0],
    ];

    for (let index = 0; index < implementationValues.length; index++) {
      const value = implementationValues[index];
      expect(pluginRepoV2Deployment.address).to.not.equal(value);
    }

    // create proposal to upgrade to new implementation
    const iface = new ethers.utils.Interface(
      artifacts.readArtifactSync('PluginRepo').abi
    );
    const data = iface.encodeFunctionData('upgradeTo', [
      pluginRepoV2Deployment.address,
    ]);
    // upgrade all `PluginRepo`s.
    const actions = [
      {to: ehre.aragonPluginRepos['token-voting'], value: 0, data: data},
      {to: ehre.aragonPluginRepos['address-list-voting'], value: 0, data: data},
      {to: ehre.aragonPluginRepos.admin, value: 0, data: data},
      {to: ehre.aragonPluginRepos.multisig, value: 0, data: data},
    ];
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
    implementationValuesPaddedSlot = [
      await ethers.provider.getStorageAt(
        ehre.aragonPluginRepos['token-voting'],
        IMPLEMENTATION_SLOT
      ),
      await ethers.provider.getStorageAt(
        ehre.aragonPluginRepos['address-list-voting'],
        IMPLEMENTATION_SLOT
      ),
      await ethers.provider.getStorageAt(
        ehre.aragonPluginRepos.admin,
        IMPLEMENTATION_SLOT
      ),
      await ethers.provider.getStorageAt(
        ehre.aragonPluginRepos.multisig,
        IMPLEMENTATION_SLOT
      ),
    ];

    implementationValues = [
      defaultAbiCoder.decode(['address'], implementationValuesPaddedSlot[0])[0],
      defaultAbiCoder.decode(['address'], implementationValuesPaddedSlot[1])[0],
      defaultAbiCoder.decode(['address'], implementationValuesPaddedSlot[2])[0],
      defaultAbiCoder.decode(['address'], implementationValuesPaddedSlot[3])[0],
    ];

    for (let index = 0; index < implementationValues.length; index++) {
      const value = implementationValues[index];
      expect(value).to.be.equal(pluginRepoV2Deployment.address);
    }
  });

  // TODO: should we also test if we can upgrade the multisig of the Managing dao?
});
