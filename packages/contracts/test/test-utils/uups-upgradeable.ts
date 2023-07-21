import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {Contract, ContractFactory, errors} from 'ethers';
import {ethers, upgrades} from 'hardhat';
import {DAO, UUPSUpgradeable} from '../../typechain';
import {readImplementationValueFromSlot} from '../../utils/storage';
import {CURRENT_PROTOCOL_VERSION} from './protocol-version';

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
  const {proxy, implementation: fromImplementation} = await deployProxy(
    from.connect(deployer),
    initArgs,
    initializerName
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
  const toImplementation = await upgradeProxy(proxy, to.connect(upgrader));

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
  // Deploy the proxy
  const {proxy, implementation: fromImplementation} = await deployProxy(
    from.connect(deployer),
    initArgs,
    initializerName
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
  const toImplementation = await upgradeProxy(proxy, to.connect(upgrader));

  return {proxy, fromImplementation, toImplementation};
}

async function deployProxy(
  factory: ContractFactory,
  initArgs: any,
  initializerName: string
): Promise<{proxy: Contract; implementation: string}> {
  let proxy = await upgrades.deployProxy(factory, Object.values(initArgs), {
    kind: 'uups',
    initializer: initializerName,
    unsafeAllow: ['constructor'],
    constructorArgs: [],
  });

  const implementation = await readImplementationValueFromSlot(proxy.address);

  return {proxy, implementation};
}

async function upgradeProxy(
  proxy: Contract,
  factory: ContractFactory
): Promise<string> {
  proxy = await upgrades.upgradeProxy(proxy.address, factory, {
    unsafeAllow: ['constructor'],
    constructorArgs: [],
  });

  const toImplementation = await readImplementationValueFromSlot(proxy.address);
  return toImplementation;
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
