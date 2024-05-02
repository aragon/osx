import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {Contract, ContractFactory, errors} from 'ethers';
import hre, {upgrades} from 'hardhat';
import {DAO} from '../../typechain';
import {readImplementationValueFromSlot} from '../../utils/storage';

// Deploys and upgrades a contract that is managed by a DAO
export async function ozUpgradeCheckManagedContract(
  deployer: SignerWithAddress,
  upgrader: SignerWithAddress,
  managingDao: DAO,
  initArgs: any,
  initializerName: string,
  from: ContractFactory,
  to: ContractFactory,
  upgradePermissionId: string
): Promise<{
  proxy: Contract;
  fromImplementation: string;
  toImplementation: string;
}> {
  // Deploy the proxy
  let proxy = await upgrades.deployProxy(
    from.connect(deployer),
    Object.values(initArgs),
    {
      kind: 'uups',
      initializer: initializerName,
      unsafeAllow: ['constructor'],
      constructorArgs: [],
    }
  );

  const fromImplementation = await readImplementationValueFromSlot(
    proxy.address
  );

  // Check that upgrade permission is required
  await expect(
    upgrades.upgradeProxy(proxy.address, to.connect(upgrader), {
      unsafeAllow: ['constructor'],
      constructorArgs: [],
    })
  )
    .to.be.revertedWithCustomError(proxy, 'DaoUnauthorized')
    .withArgs(
      managingDao.address,
      proxy.address,
      upgrader.address,
      upgradePermissionId
    );

  // Grant the upgrade permission
  await managingDao
    .connect(deployer)
    .grant(proxy.address, upgrader.address, upgradePermissionId);

  // Upgrade the proxy
  await upgrades.upgradeProxy(proxy.address, to.connect(upgrader), {
    unsafeAllow: ['constructor'],
    constructorArgs: [],
  });

  const toImplementation = await readImplementationValueFromSlot(proxy.address);

  return {proxy, fromImplementation, toImplementation};
}

// Deploys and upgrades a contract that has its own permission manager
export async function ozUpgradeCheckManagingContract(
  deployer: SignerWithAddress,
  upgrader: SignerWithAddress,
  initArgs: any,
  initializerName: string,
  from: ContractFactory,
  to: ContractFactory,
  upgradePermissionId: string
): Promise<{
  proxy: Contract;
  fromImplementation: string;
  toImplementation: string;
}> {
  console.log(hre.upgrades, ' ooo19')

  hre.wrapper.deployProxy(
    deployer, 
    Object.values(initArgs)
  )
  // Deploy the proxy
  let proxy = await upgrades.deployProxy(
    from.connect(deployer),
    Object.values(initArgs),
    {
      kind: 'uups',
      initializer: initializerName,
      unsafeAllow: ['constructor'],
      constructorArgs: [],
    }
  );

  const fromImplementation = await readImplementationValueFromSlot(
    proxy.address
  );
  // Check that upgrade permission is required
  await expect(
    upgrades.upgradeProxy(proxy.address, to.connect(upgrader), {
      unsafeAllow: ['constructor'],
      constructorArgs: [],
    })
  )
    .to.be.revertedWithCustomError(proxy, 'Unauthorized')
    .withArgs(proxy.address, upgrader.address, upgradePermissionId);

  // Grant the upgrade permission
  await proxy
    .connect(deployer)
    .grant(proxy.address, upgrader.address, upgradePermissionId);

  // Upgrade the proxy
  await upgrades.upgradeProxy(proxy.address, to.connect(upgrader), {
    unsafeAllow: ['constructor'],
    constructorArgs: [],
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
