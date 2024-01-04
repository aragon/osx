import {DAO, PluginRepo} from '../../typechain';
import {readStorage, ERC1967_IMPLEMENTATION_SLOT} from '../../utils/storage';
import {IMPLICIT_INITIAL_PROTOCOL_VERSION} from './protocol-version';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {Contract, ContractFactory, errors} from 'ethers';
import {upgrades} from 'hardhat';

// Deploys a proxy and a new implementation from the same factory and checks that the upgrade works.
export async function deployAndUpgradeSelfCheck(
  deployer: SignerWithAddress,
  upgrader: SignerWithAddress,
  initArgs: any,
  initializerName: string,
  factory: ContractFactory,
  upgradePermissionId: string,
  managingContract?: DAO | PluginRepo | undefined
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

  // Grant the upgrade permission
  const grantArgs: [string, string, string] = [
    proxy.address,
    upgrader.address,
    upgradePermissionId,
  ];

  // Check if the contract is a permission manager itself
  if (managingContract === undefined) {
    await expect(
      upgrades.upgradeProxy(proxy.address, factory.connect(upgrader), {
        unsafeAllow: ['constructor'],
        constructorArgs: [],
      })
    )
      .to.be.revertedWithCustomError(proxy, 'Unauthorized')
      .withArgs(...grantArgs);

    await proxy.connect(deployer).grant(...grantArgs);
  }
  // Or if the permission manager is located in a different contract
  else {
    await expect(
      upgrades.upgradeProxy(proxy.address, factory.connect(upgrader), {
        unsafeAllow: ['constructor'],
        constructorArgs: [],
      })
    )
      .to.be.revertedWithCustomError(proxy, 'DaoUnauthorized')
      .withArgs(managingContract.address, ...grantArgs);

    await managingContract.connect(deployer).grant(...grantArgs);
  }

  // Deploy a new implementation (the same contract at a different address)
  const toImplementation = (await factory.deploy()).address;

  // Confirm that the two implementations are different
  const fromImplementation = await readStorage(
    proxy.address,
    ERC1967_IMPLEMENTATION_SLOT,
    ['address']
  );
  expect(toImplementation).to.not.equal(fromImplementation);

  // Upgrade from the old to the new implementation
  await proxy.connect(upgrader).upgradeTo(toImplementation);

  // Confirm that the proxy points to the new implementation
  const implementationAfterUpgrade = await readStorage(
    proxy.address,
    ERC1967_IMPLEMENTATION_SLOT,
    ['address']
  );
  expect(implementationAfterUpgrade).to.equal(toImplementation);
}

// Deploys a proxy and a new implementation via two different factories and checks that the upgrade works.
export async function deployAndUpgradeFromToCheck(
  deployer: SignerWithAddress,
  upgrader: SignerWithAddress,
  initArgs: any,
  initializerName: string,
  from: ContractFactory,
  to: ContractFactory,
  upgradePermissionId: string,
  managingDao?: DAO | PluginRepo
): Promise<{
  proxy: Contract;
  fromImplementation: string;
  toImplementation: string;
}> {
  // Deploy proxy and implementation
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

  const fromImplementation = await readStorage(
    proxy.address,
    ERC1967_IMPLEMENTATION_SLOT,
    ['address']
  );

  // Grant the upgrade permission
  const grantArgs: [string, string, string] = [
    proxy.address,
    upgrader.address,
    upgradePermissionId,
  ];

  if (managingDao === undefined) {
    await expect(
      upgrades.upgradeProxy(proxy.address, to.connect(upgrader), {
        unsafeAllow: ['constructor'],
        constructorArgs: [],
      })
    )
      .to.be.revertedWithCustomError(proxy, 'Unauthorized')
      .withArgs(...grantArgs);

    await proxy.connect(deployer).grant(...grantArgs);
  } else {
    await expect(
      upgrades.upgradeProxy(proxy.address, to.connect(upgrader), {
        unsafeAllow: ['constructor'],
        constructorArgs: [],
      })
    )
      .to.be.revertedWithCustomError(proxy, 'DaoUnauthorized')
      .withArgs(managingDao.address, ...grantArgs);

    await managingDao.connect(deployer).grant(...grantArgs);
  }

  // Upgrade the proxy to a new implementation from a different factory
  await upgrades.upgradeProxy(proxy.address, to.connect(upgrader), {
    unsafeAllow: ['constructor'],
    constructorArgs: [],
  });

  const toImplementation = await readStorage(
    proxy.address,
    ERC1967_IMPLEMENTATION_SLOT,
    ['address']
  );
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
      protocolVersion = IMPLICIT_INITIAL_PROTOCOL_VERSION;
    } else {
      throw error;
    }
  }
  return protocolVersion;
}
