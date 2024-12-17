import {getLatestContractAddress} from '../../deploy/helpers';
import {DAO, DAO__factory} from '../../typechain';
import {
  initForkForOsxVersion,
  initializeDeploymentFixture,
  initializeFork,
} from '../test-utils/fixture';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import hre, {ethers, deployments} from 'hardhat';

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
describe('Update to 1.4.0', function () {
  let deployer: SignerWithAddress;

  before(async () => {
    await forkSepolia();

    [deployer] = await ethers.getSigners();
  });

  it('should update dao and set permissions correctly', async () => {
    const daoRegistryAddress = getAddress('DAORegistryProxy');
    const previousDAOFactoryAddress = getAddress('DAOFactory');

    const pluginRepoRegistry = getAddress('PluginRepoRegistryProxy');
    const previousPluginRepoFactory = getAddress('PluginRepoFactory');

    const managementDAOAddress = getAddress('ManagementDAOProxy');

    const dao = DAO__factory.connect(managementDAOAddress, deployer);

    const multisigAddr = '0xfcead61339e3e73090b587968fce8b090e0600ef';

    await validatePermissions(
      dao,
      {
        where: daoRegistryAddress,
        who: previousDAOFactoryAddress,
        isSet: true,
      },
      {
        where: pluginRepoRegistry,
        who: previousPluginRepoFactory,
        isSet: true,
      }
    );

    expect(await dao.protocolVersion()).to.deep.equal([1, 3, 0]);

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
        where: daoRegistryAddress,
        who: previousDAOFactoryAddress,
        isSet: false,
      },
      {
        where: pluginRepoRegistry,
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
        where: daoRegistryAddress,
        who: newDAOFactoryAddress,
        isSet: true,
      },
      {
        where: pluginRepoRegistry,
        who: newPluginRepoFactoryAddress,
        isSet: true,
      }
    );

    expect(await dao.protocolVersion()).to.deep.equal([1, 4, 0]);
  });
});
