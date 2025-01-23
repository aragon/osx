import {getLatestContractAddress} from '../../deploy/helpers';
import {
  DAO,
  DAO__factory,
  DAOFactory__factory,
  DAORegistry__factory,
  PluginRepoRegistry__factory,
} from '../../typechain';
import {PluginRepoRegisteredEvent} from '../../typechain/PluginRepoRegistry';
import {getAnticipatedAddress} from '../framework/dao/dao-factory';
import {daoExampleURI} from '../test-utils/dao';
import {
  closeFork,
  initForkForOsxVersion,
  initializeDeploymentFixture,
} from '../test-utils/fixture';
import {createPrepareInstallationParams} from '../test-utils/psp/create-params';
import {PluginRepoPointer} from '../test-utils/psp/types';
import {skipTestSuiteIfNetworkIsZkSync} from '../test-utils/skip-functions';
import {findEventTopicLog} from '@aragon/osx-commons-sdk';
import {PluginRepoFactory__factory} from '@aragon/osx-ethers-v1.2.0';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {defaultAbiCoder} from 'ethers/lib/utils';
import hre, {ethers, deployments} from 'hardhat';

const IMPLEMENTATION_ADDRESS_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

const daoSettings = {
  trustedForwarder: ethers.constants.AddressZero,
  subdomain: 'dao1',
  metadata: '0x0000',
  daoURI: daoExampleURI,
};

const EVENTS = {
  PluginRepoRegistered: 'PluginRepoRegistered',
  DAORegistered: 'DAORegistered',
};

async function forkSepolia() {
  hre.network.deploy = ['./deploy/update/to_v1.4.0'];

  // console.log(hre);
  await initForkForOsxVersion('sepolia', {
    version: '1.3.0',
    forkBlockNumber: 7296100,
    activeContracts: [],
  });
}

function getAddress(name: string) {
  return getLatestContractAddress(name, hre);
}

async function assertImplementation(contract: string, expected: string) {
  const actual = defaultAbiCoder
    .decode(
      ['address'],
      await ethers.provider.getStorageAt(contract, IMPLEMENTATION_ADDRESS_SLOT)
    )[0]
    .toLowerCase();

  expect(actual).to.equal(expected.toLowerCase());
}

type Permission = {
  where: string;
  who: string;
  isSet: boolean;
};

async function validatePermissions(dao: DAO, p1: Permission, p2: Permission) {
  const registerDAOPermission = ethers.utils.id('REGISTER_DAO_PERMISSION');
  const registerPluginRepoPermission = ethers.utils.id(
    'REGISTER_PLUGIN_REPO_PERMISSION'
  );

  expect(
    await dao.hasPermission(p1.where, p1.who, registerDAOPermission, '0x')
  ).to.be.equal(p1.isSet);
  expect(
    await dao.hasPermission(
      p2.where,
      p2.who,
      registerPluginRepoPermission,
      '0x'
    )
  ).to.be.equal(p2.isSet);
}

async function impersonateAccount(addr: string) {
  await hre.network.provider.send('hardhat_setBalance', [
    addr,
    '0x100000000000000',
  ]);

  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [addr],
  });

  return ethers.getSigner(addr);
}

// This will need to be skipped after managing dao and framework is upgraded to 1.4.0
// and addresses are added in osx-commons. This is because update script and the below tests
// use `getLatestContractAddress` which is currently 1.3.0, but once update to 1.4.0 happens,
// getLatestContractAddress then will return 1.4.0 addresses.
skipTestSuiteIfNetworkIsZkSync('Update to 1.4.0', function () {
  let deployer: SignerWithAddress;

  before(async () => {
    await forkSepolia();

    [deployer] = await ethers.getSigners();
  });

  // Close fork so that other tests(not related to this file) are
  // not run in forked network.
  after(async () => {
    closeFork();
  });

  it.only('should update dao, daoRegistry, PluginRepoRegistry and set permissions correctly', async () => {
    const previousPluginRepoFactory = getAddress('PluginRepoFactory');
    const previousDAOFactoryAddress = getAddress('DAOFactory');

    const dao = DAO__factory.connect(
      getAddress('ManagementDAOProxy'),
      deployer
    );
    const daoRegistry = DAORegistry__factory.connect(
      getAddress('DAORegistryProxy'),
      deployer
    );
    const pluginRepoRegistry = PluginRepoRegistry__factory.connect(
      getAddress('PluginRepoRegistryProxy'),
      deployer
    );

    const multisigAddr = '0xfcead61339e3e73090b587968fce8b090e0600ef';

    await validatePermissions(
      dao,
      {
        where: daoRegistry.address,
        who: previousDAOFactoryAddress,
        isSet: true,
      },
      {
        where: pluginRepoRegistry.address,
        who: previousPluginRepoFactory,
        isSet: true,
      }
    );

    expect(await dao.protocolVersion()).to.deep.equal([1, 3, 0]);
    await expect(daoRegistry.protocolVersion()).to.be.reverted;
    await expect(pluginRepoRegistry.protocolVersion()).to.be.reverted;

    const oldDaoImplementation = await DAOFactory__factory.connect(
      previousDAOFactoryAddress,
      hre.ethers.provider
    ).daoBase();

    await assertImplementation(
      dao.address,
      getLatestContractAddress('ManagementDAOImplementation', hre)
    );
    await assertImplementation(
      daoRegistry.address,
      getLatestContractAddress('DAORegistryImplementation', hre)
    );
    await assertImplementation(
      pluginRepoRegistry.address,
      getLatestContractAddress('PluginRepoRegistryImplementation', hre)
    );

    await initializeDeploymentFixture('v1.4.0');

    let actions = hre.managementDAOActions.map(item => {
      return {to: item.to, value: item.value, data: item.data};
    });

    const signer = await impersonateAccount(multisigAddr);

    await dao
      .connect(signer)
      .execute(ethers.utils.id('someCallId'), actions, 0);

    await validatePermissions(
      dao,
      {
        where: daoRegistry.address,
        who: previousDAOFactoryAddress,
        isSet: true, // Makes sure we keep the the permission of the previouse DAO factory
      },
      {
        where: pluginRepoRegistry.address,
        who: previousPluginRepoFactory,
        isSet: false,
      }
    );

    const newDAOFactoryAddress = (await deployments.get('DAOFactory')).address;
    const newPluginRepoFactoryAddress = (
      await deployments.get('PluginRepoFactory')
    ).address;

    await validatePermissions(
      dao,
      {
        where: daoRegistry.address,
        who: newDAOFactoryAddress,
        isSet: true,
      },
      {
        where: pluginRepoRegistry.address,
        who: newPluginRepoFactoryAddress,
        isSet: true,
      }
    );

    expect(await dao.protocolVersion()).to.deep.equal([1, 4, 0]);
    expect(await daoRegistry.protocolVersion()).to.deep.equal([1, 4, 0]);
    expect(await pluginRepoRegistry.protocolVersion()).to.deep.equal([1, 4, 0]);

    const daoFactoryAddress = (await deployments.get('DAOFactory')).address;
    const newDaoImplementation = await DAOFactory__factory.connect(
      daoFactoryAddress,
      hre.ethers.provider
    ).daoBase();

    await assertImplementation(dao.address, newDaoImplementation);
    await assertImplementation(
      daoRegistry.address,
      (
        await deployments.get('DAORegistryImplementation')
      ).address
    );
    await assertImplementation(
      pluginRepoRegistry.address,
      (
        await deployments.get('PluginRepoRegistryImplementation')
      ).address
    );
  });

  it.only('Previous (v1.3) DAO Factory can still register DAOs', async () => {
    // get previouse DAO factory from OSx 1.4
    const previousDAOFactoryAddress = getAddress('DAOFactory');
    const daoFactory = new DAOFactory__factory(deployer).attach(
      previousDAOFactoryAddress
    );

    // publish a plugin based on OSx 1.4
    const pluginImp = await hre.wrapper.deploy('PluginUUPSUpgradeableV1Mock');
    const pluginSetupMock = await hre.wrapper.deploy(
      'PluginUUPSUpgradeableSetupV1Mock',
      {args: [pluginImp.address]}
    );

    const newPluginRepoFactoryAddress = (
      await deployments.get('PluginRepoFactory')
    ).address;

    const pluginRepoFactory = new PluginRepoFactory__factory(deployer).attach(
      newPluginRepoFactoryAddress
    );

    const tx = await pluginRepoFactory.createPluginRepoWithFirstVersion(
      'plugin-uupsupgradeable-setup-v1-mock',
      pluginSetupMock.address,
      deployer.address,
      '0x00',
      '0x00'
    );

    const event = findEventTopicLog<PluginRepoRegisteredEvent>(
      await tx.wait(),
      PluginRepoRegistry__factory.createInterface(),
      EVENTS.PluginRepoRegistered
    );

    const pluginSetupMockRepoAddress = event.args.pluginRepo;

    const pluginRepoPointer: PluginRepoPointer = [
      pluginSetupMockRepoAddress,
      1,
      1,
    ];

    // Get anticipated DAO contract
    const dao = await getAnticipatedAddress(previousDAOFactoryAddress);

    // Get dao registry
    const daoRegistryAddress = getAddress('DAORegistryProxy');
    const daoRegistryContract = new DAOFactory__factory(deployer).attach(
      daoRegistryAddress
    );

    expect(
      await daoFactory.createDao(daoSettings, [
        createPrepareInstallationParams(pluginRepoPointer, '0x'),
      ])
    )
      .to.emit(daoRegistryContract, EVENTS.DAORegistered)
      .withArgs(dao, deployer.address, daoSettings.subdomain);
  });
});
