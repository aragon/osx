import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {ContractFactory} from 'ethers';
import {upgrades} from 'hardhat';
import {DAO} from '../../typechain';

// See https://eips.ethereum.org/EIPS/eip-1967
export const IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'; // bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)

// Deploys and upgrades a contract that is managed by a DAO
export async function upgradeCheckManagedContract(
  deployer: SignerWithAddress,
  upgrader: SignerWithAddress,
  managingDao: DAO,
  initArgs: any,
  initializerName: string,
  from: ContractFactory,
  to: ContractFactory,
  upgradePermissionId: string
) {
  // Deploy the proxy
  const proxy = await upgrades.deployProxy(
    from.connect(deployer),
    Object.values(initArgs),
    {
      kind: 'uups',
      initializer: initializerName,
      unsafeAllow: ['constructor'],
      constructorArgs: [],
    }
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
}

// Deploys and upgrades a contract that has its own permission manager
export async function upgradeCheckManagingContract(
  deployer: SignerWithAddress,
  upgrader: SignerWithAddress,
  initArgs: any,
  initializerName: string,
  from: ContractFactory,
  to: ContractFactory,
  upgradePermissionId: string
) {
  // Deploy the proxy
  const proxy = await upgrades.deployProxy(
    from.connect(deployer),
    Object.values(initArgs),
    {
      kind: 'uups',
      initializer: initializerName,
      unsafeAllow: ['constructor'],
      constructorArgs: [],
    }
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
}
