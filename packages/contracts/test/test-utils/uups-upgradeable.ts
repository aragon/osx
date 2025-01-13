import {DAO, PluginRepo} from '../../typechain';
import {readStorage, ERC1967_IMPLEMENTATION_SLOT} from '../../utils/storage';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {Contract, ContractFactory} from 'ethers';
import hre from 'hardhat';

type options = {
  args?: Record<string, any>;
  initArgs?: Record<string, any>;
  initializer?: string | undefined;
};

// Deploys a proxy and a new implementation from the same factory and checks that the upgrade works.
export async function deployAndUpgradeSelfCheck(
  deployer: number,
  upgrader: number,
  {args = {}, initArgs = {}, initializer = undefined}: options,
  from: string,
  to: string,
  upgradePermissionId: string,
  managingContract?: DAO
) {
  const deployerSigner = (await hre.ethers.getSigners())[deployer];
  const upgraderSigner = (await hre.ethers.getSigners())[upgrader];

  // const proxy = await hre.wrapper.deployProxy(
  //   factory.connect(deployer),
  //   Object.values(initArgs),
  //   {
  //     kind: 'uups',
  //     initializer: initializerName,
  //     unsafeAllow: ['constructor'],
  //     constructorArgs: [],
  //   }
  // );

  // Deploy proxy and implementation
  const proxy = await hre.wrapper.deployProxy(deployer, from, {
    args: Object.values(args),
    initArgs: Object.values(initArgs),
    proxySettings: {
      initializer: initializer,
    },
  });

  // Grant the upgrade permission
  const grantArgs: [string, string, string] = [
    proxy.address,
    upgraderSigner.address,
    upgradePermissionId,
  ];

  // Check if the contract is a permission manager itself
  if (managingContract === undefined) {
    await expect(
      hre.wrapper.upgradeProxy(upgrader, proxy.address, to, {
        args: Object.values(args),
      })
    )
      .to.be.revertedWithCustomError(proxy, 'Unauthorized')
      .withArgs(...grantArgs);

    await proxy.connect(deployerSigner).grant(...grantArgs);
  }
  // Or if the permission manager is located in a different contract
  else {
    await expect(
      hre.wrapper.upgradeProxy(upgrader, proxy.address, to, {
        args: Object.values(args),
      })
    )
      .to.be.revertedWithCustomError(proxy, 'DaoUnauthorized')
      .withArgs(managingContract.address, ...grantArgs);

    await managingContract.connect(deployer).grant(...grantArgs);
  }

  // Deploy a new implementation (the same contract at a different address)
  const toImplementation = (await hre.wrapper.deploy(to)).address;

  // Confirm that the two implementations are different
  const fromImplementation = await readStorage(
    proxy.address,
    ERC1967_IMPLEMENTATION_SLOT,
    ['address']
  );
  expect(toImplementation).to.not.equal(fromImplementation);

  // Upgrade from the old to the new implementation
  await proxy.connect(upgraderSigner).upgradeTo(toImplementation);

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
  deployer: number,
  upgrader: number,
  {args = {}, initArgs = {}, initializer = undefined}: options,
  from: string,
  to: string,
  upgradePermissionId: string,
  managingDao?: DAO | PluginRepo
): Promise<{
  proxy: Contract;
  fromImplementation: string;
  toImplementation: string;
}> {
  const deployerSigner = (await hre.ethers.getSigners())[deployer];
  const upgraderSigner = (await hre.ethers.getSigners())[upgrader];

  // Deploy proxy and implementation
  let proxy = await hre.wrapper.deployProxy(deployer, from, {
    args: Object.values(args),
    initArgs: Object.values(initArgs),
    proxySettings: {
      initializer: initializer,
    },
  });

  const fromImplementation = await readStorage(
    proxy.address,
    ERC1967_IMPLEMENTATION_SLOT,
    ['address']
  );

  // Grant the upgrade permission
  const grantArgs: [string, string, string] = [
    proxy.address,
    upgraderSigner.address,
    upgradePermissionId,
  ];

  if (managingDao === undefined) {
    await expect(
      hre.wrapper.upgradeProxy(upgrader, proxy.address, to, {
        args: Object.values(args),
      })
    )
      .to.be.revertedWithCustomError(proxy, 'Unauthorized')
      .withArgs(...grantArgs);

    await proxy.connect(deployerSigner).grant(...grantArgs);
  } else {
    await expect(
      hre.wrapper.upgradeProxy(upgrader, proxy.address, to, {
        args: Object.values(args),
      })
    )
      .to.be.revertedWithCustomError(proxy, 'DaoUnauthorized')
      .withArgs(managingDao.address, ...grantArgs);

    await managingDao.connect(deployerSigner).grant(...grantArgs);
  }

  // Upgrade the proxy to a new implementation from a different factory
  proxy = await hre.wrapper.upgradeProxy(upgrader, proxy.address, to, {
    args: Object.values(args),
  });

  const toImplementation = await readStorage(
    proxy.address,
    ERC1967_IMPLEMENTATION_SLOT,
    ['address']
  );
  return {proxy, fromImplementation, toImplementation};
}
