import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {Contract, ContractFactory, errors} from 'ethers';
import {upgrades} from 'hardhat';
import {DAO, PluginRepo} from '../../typechain';
import {readImplementationValueFromSlot} from '../../utils/storage';
import {IMPLICIT_INITIAL_PROTOCOL_VERSION} from './protocol-version';

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

export async function upgradeCheck(
  deployer: SignerWithAddress,
  managingContract: DAO | PluginRepo | undefined,
  initArgs: any,
  initializerName: string,
  factory: ContractFactory,
  upgradePermissionId: string
) {
  // Deploy proxy and implementation
  const proxy = await upgrades.deployProxy(
    factory.connect(deployer),
    Object.values(initArgs),
    {
      kind: 'uups',
      initializer: initializerName,
      unsafeAllow: ['constructor'],
      constructorArgs: [],
    }
  );

  // Deploy a new implementation (the same contract at a different address)
  const newImpl = await factory.deploy();

  // Grant the upgrade permission
  const grantArgs: [string, string, string] = [
    proxy.address,
    deployer.address,
    upgradePermissionId,
  ];

  if (managingContract !== undefined) {
    // The permission manager is located in a different contract
    await managingContract.connect(deployer).grant(...grantArgs);
  } else {
    // The contract is a permission manager itself
    await proxy.connect(deployer).grant(...grantArgs);
  }

  // Confirm that the two implementations are different
  const fromImplementation = await readImplementationValueFromSlot(
    proxy.address
  );
  const toImplementation = newImpl.address;
  expect(toImplementation).to.not.equal(fromImplementation);

  // Upgrade from the old to the new implementation
  await proxy.connect(deployer).upgradeTo(toImplementation);

  // Confirm that the proxy points to the new implementation
  const implementationAfterUpgrade = await readImplementationValueFromSlot(
    proxy.address
  );
  expect(implementationAfterUpgrade).to.equal(toImplementation);
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
      protocolVersion = IMPLICIT_INITIAL_PROTOCOL_VERSION;
    } else {
      throw error;
    }
  }
  return protocolVersion;
}
