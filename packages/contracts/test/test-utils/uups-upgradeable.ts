import {expect} from 'chai';
import {errors} from 'ethers';
import hre from 'hardhat';
import {DAO} from '../../typechain';
import {readImplementationValueFromSlot} from '../../utils/storage';
import {Contract} from 'zksync-ethers';

type options = {
  args?: Record<string, any>;
  initArgs?: Record<string, any>;
  initializer?: string | undefined;
};

// Deploys and upgrades a contract that is managed by a DAO
export async function ozUpgradeCheckManagedContract(
  deployer: number,
  upgrader: number,
  managingDao: DAO,
  {args = {}, initArgs = {}, initializer = undefined}: options,
  from: string,
  to: string,
  upgradePermissionId: string
): Promise<{
  proxy: Contract;
  fromImplementation: string;
  toImplementation: string;
}> {
  const deployerSigner = (await hre.ethers.getSigners())[deployer];
  const upgraderSigner = (await hre.ethers.getSigners())[upgrader];

  let proxy = await hre.wrapper.deployProxy(deployer, from, {
    args: Object.values(args),
    initArgs: Object.values(initArgs),
    proxySettings: {
      initializer: initializer,
    },
  });

  const fromImplementation = await readImplementationValueFromSlot(
    proxy.address
  );

  // Check that upgrade permission is required
  await expect(
    hre.wrapper.upgradeProxy(upgrader, proxy.address, to, {
      args: Object.values(args),
    })
  )
    .to.be.revertedWithCustomError(proxy, 'DaoUnauthorized')
    .withArgs(
      managingDao.address,
      proxy.address,
      upgraderSigner.address,
      upgradePermissionId
    );

  // Grant the upgrade permission
  await managingDao
    .connect(deployerSigner)
    .grant(proxy.address, upgraderSigner.address, upgradePermissionId);

  // Upgrade the proxy
  await hre.wrapper.upgradeProxy(upgrader, proxy.address, to, {
    args: Object.values(args),
  });

  const toImplementation = await readImplementationValueFromSlot(proxy.address);

  return {proxy, fromImplementation, toImplementation};
}

// Deploys and upgrades a contract that has its own permission manager
export async function ozUpgradeCheckManagingContract(
  deployer: number,
  upgrader: number,
  {args = {}, initArgs = {}, initializer = undefined}: options,
  from: string,
  to: string,
  upgradePermissionId: string
): Promise<{
  proxy: Contract;
  fromImplementation: string;
  toImplementation: string;
}> {
  const deployerSigner = (await hre.ethers.getSigners())[deployer];
  const upgraderSigner = (await hre.ethers.getSigners())[upgrader];

  // Deploy the proxy
  let proxy = await hre.wrapper.deployProxy(deployer, from, {
    args: Object.values(args),
    initArgs: Object.values(initArgs),
    proxySettings: {
      initializer: initializer,
    },
  });

  const fromImplementation = await readImplementationValueFromSlot(
    proxy.address
  );

  // Check that upgrade permission is required
  await expect(
    hre.wrapper.upgradeProxy(upgrader, proxy.address, to, {
      args: Object.values(args),
    })
  )
    .to.be.revertedWithCustomError(proxy, 'Unauthorized')
    .withArgs(proxy.address, upgraderSigner.address, upgradePermissionId);

  // Grant the upgrade permission
  await proxy
    .connect(deployerSigner)
    .grant(proxy.address, upgraderSigner.address, upgradePermissionId);

  await hre.wrapper.upgradeProxy(upgrader, proxy.address, to, {
    args: Object.values(args),
  });

  const toImplementation = await readImplementationValueFromSlot(proxy.address);

  return {proxy, fromImplementation, toImplementation};
}

export async function getProtocolVersion(
  contract: Contract
): Promise<[number, number, number]> {
  let protocolVersion: [number, number, number];
  try {
    contract.interface.getFunction('protocolVersion');
    protocolVersion = await contract.protocolVersion();
  } catch (error) {
    if (error.code === errors.INVALID_ARGUMENT) {
      protocolVersion = [1, 0, 0];
    } else {
      throw error;
    }
  }
  return protocolVersion;
}
