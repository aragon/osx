import {expect} from 'chai';
import {BigNumberish} from 'ethers';
import {defaultAbiCoder} from 'ethers/lib/utils';

import hre, {ethers, deployments, getNamedAccounts} from 'hardhat';
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
  let ensSubdomainRegistrarDeployment: Deployment[];
  let ensSubdomainRegistrar: ENSSubdomainRegistrar[];
  let pspDeployment: Deployment;
  let psp: PluginSetupProcessor;

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
    ensSubdomainRegistrarDeployment = [
      await deployments.get('DAO_ENSSubdomainRegistrar'),
      await deployments.get('Plugin_ENSSubdomainRegistrar'),
    ];
    ensSubdomainRegistrar = [
      await ethers.getContractAt(
        'ENSSubdomainRegistrar',
        ensSubdomainRegistrarDeployment[0].address
      ),
      await ethers.getContractAt(
        'ENSSubdomainRegistrar',
        ensSubdomainRegistrarDeployment[1].address
      ),
    ];

    // PluginSetupProcessor
    pspDeployment = await deployments.get('PluginSetupProcessor');
    psp = await ethers.getContractAt(
      'PluginSetupProcessor',
      pspDeployment.address
    );

    const {deployer} = await getNamedAccounts();
    ownerAddress = deployer;

    ehre = hre as EHRE;

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
    let implementationSlot = await ethers.provider.getStorageAt(
      managingDao.address,
      IMPLEMENTATION_SLOT
    );

    let implementationValueAtSlot = defaultAbiCoder.decode(
      ['address'],
      implementationSlot
    )[0];

    expect(managingDaoV2Deployment.address).not.equal(
      implementationValueAtSlot
    );

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

    implementationValueAtSlot = defaultAbiCoder.decode(
      ['address'],
      implementationSlot
    )[0];

    expect(implementationValueAtSlot).to.be.equal(
      managingDaoV2Deployment.address
    );
  });

  it('Should be able to upgrade `DaoRegistry`', async function () {
    // deploy a new dao implementation.
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
    let implementationSlot = await ethers.provider.getStorageAt(
      daoRegistry.address,
      IMPLEMENTATION_SLOT
    );

    let implementationValueAtSlot = defaultAbiCoder.decode(
      ['address'],
      implementationSlot
    )[0];

    expect(daoRegistryV2Deployment.address).not.equal(
      implementationValueAtSlot
    );

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
    implementationSlot = await ethers.provider.getStorageAt(
      daoRegistry.address,
      IMPLEMENTATION_SLOT
    );

    implementationValueAtSlot = defaultAbiCoder.decode(
      ['address'],
      implementationSlot
    )[0];

    expect(implementationValueAtSlot).to.be.equal(
      daoRegistryV2Deployment.address
    );
  });

  it('Should be able to upgrade `PluginRepoRegistry`', async function () {
    // deploy a new dao implementation.
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
    let implementationSlot = await ethers.provider.getStorageAt(
      pluginRepoRegistry.address,
      IMPLEMENTATION_SLOT
    );

    let implementationValueAtSlot = defaultAbiCoder.decode(
      ['address'],
      implementationSlot
    )[0];

    expect(pluginRepoRegistryV2Deployment.address).not.equal(
      implementationValueAtSlot
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
    implementationSlot = await ethers.provider.getStorageAt(
      pluginRepoRegistry.address,
      IMPLEMENTATION_SLOT
    );

    implementationValueAtSlot = defaultAbiCoder.decode(
      ['address'],
      implementationSlot
    )[0];

    expect(implementationValueAtSlot).to.be.equal(
      pluginRepoRegistryV2Deployment.address
    );
  });

  it('Should be able to upgrade `ENSSubdomainRegistrar`', async function () {
    // deploy a new dao implementation.
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
    let implementationSlot = [
      await ethers.provider.getStorageAt(
        ensSubdomainRegistrar[0].address,
        IMPLEMENTATION_SLOT
      ),
      await ethers.provider.getStorageAt(
        ensSubdomainRegistrar[1].address,
        IMPLEMENTATION_SLOT
      ),
    ];

    let implementationValueAtSlot = [
      defaultAbiCoder.decode(['address'], implementationSlot[0])[0],
      defaultAbiCoder.decode(['address'], implementationSlot[1])[0],
    ];

    expect(ensSubdomainRegistrarV2Deployment.address).not.equal(
      implementationValueAtSlot[0]
    );
    expect(ensSubdomainRegistrarV2Deployment.address).not.equal(
      implementationValueAtSlot[1]
    );

    // create proposal to upgrade to new implementation
    const iface = new ethers.utils.Interface(
      ensSubdomainRegistrarDeployment[0].abi
    );
    const data = iface.encodeFunctionData('upgradeTo', [
      ensSubdomainRegistrarV2Deployment.address,
    ]);
    // upgrade both `DAO_ENSSubdomainRegistrar` & `Plugin_ENSSubdomainRegistrar`.
    const actions = [
      {to: ensSubdomainRegistrar[0].address, value: 0, data: data},
      {to: ensSubdomainRegistrar[1].address, value: 0, data: data},
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
    implementationSlot = [
      await ethers.provider.getStorageAt(
        ensSubdomainRegistrar[0].address,
        IMPLEMENTATION_SLOT
      ),
      await ethers.provider.getStorageAt(
        ensSubdomainRegistrar[1].address,
        IMPLEMENTATION_SLOT
      ),
    ];

    implementationValueAtSlot = [
      defaultAbiCoder.decode(['address'], implementationSlot[0])[0],
      defaultAbiCoder.decode(['address'], implementationSlot[1])[0],
    ];

    expect(implementationValueAtSlot[0]).to.be.equal(
      ensSubdomainRegistrarV2Deployment.address
    );
    expect(implementationValueAtSlot[1]).to.be.equal(
      ensSubdomainRegistrarV2Deployment.address
    );
  });

  // it('Should be able to upgrade `Multisig` plugin of `ManagingDAO`', async function () {
  //   // deploy MultisigSetupV2
  //   await deployments.deploy('MultisigSetupV2', {
  //     contract: 'MultisigSetup',
  //     from: ownerAddress,
  //     args: [],
  //     log: true,
  //   });

  //   const multisigSetupV2V2Deployment: Deployment = await deployments.get(
  //     'MultisigSetupV2'
  //   );

  //   // make sure new `MultisigSetupV2` deployment is just an implementation and not a proxy
  //   expect(multisigSetupV2V2Deployment.implementation).to.be.equal(undefined);

  //   // create version on repo
  //   const multisigRepo = await ethers.getContractAt(
  //     'PluginRepo',
  //     ehre.aragonPluginRepos.multisig
  //   );

  //   await multisigRepo.createVersion(
  //     1,
  //     multisigSetupV2V2Deployment.address,
  //     '0x',
  //     '0x'
  //   );

  //   // create proposal to upgrade multisig of managingDAO via psp
  //   // prepare update
  //   const prepareUpdateParams: {
  //     currentVersionTag: {release: BigNumberish; build: BigNumberish};
  //     newVersionTag: {release: BigNumberish; build: BigNumberish};
  //     pluginSetupRepo: string;
  //     setupPayload: {plugin: string; currentHelpers: string[]; data: any};
  //   } = {
  //     currentVersionTag: {release: 1, build: 1},
  //     newVersionTag: {release: 1, build: 2},
  //     pluginSetupRepo: ehre.aragonPluginRepos.multisig,
  //     setupPayload: {
  //       plugin: ehre.managingDAOMultisigPluginAddress,
  //       currentHelpers: [],
  //       data: '0x',
  //     },
  //   };
  //   await psp.prepareUpdate(managingDao.address, prepareUpdateParams);

  //   // apply update
  //   const iface = new ethers.utils.Interface(pspDeployment.abi);
  //   const data = iface.encodeFunctionData('upgradeTo', [
  //     pluginRepoRegistryV2Deployment.address,
  //   ]);
  //   const actions = [{to: pluginRepoRegistry.address, value: 0, data: data}];
  //   await multisig.createProposal(
  //     '0x', // metadata
  //     actions,
  //     0, // allowFailureMap
  //     true, // approve proposal
  //     true, // execute proposal
  //     0, // start date: now
  //     Math.floor(Date.now() / 1000) + 86400 // end date: now + 1 day
  //   );
  // });
});
