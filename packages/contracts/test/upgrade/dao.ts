import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  DAO__factory,
  DAOV101,
  DAOV101__factory,
  DAOV130Alpha,
  DAOV130Alpha__factory,
} from '../../typechain';

import {daoExampleURI} from '../test-utils/dao';
import {deployWithProxy} from '../test-utils/proxy';
import {UPGRADE_PERMISSIONS} from '../test-utils/permissions';
import {findEventTopicLog} from '../../utils/event';
import {readImplementationValueFromSlot} from '../../utils/storage';

let signers: SignerWithAddress[];
let Dao_v1_0_1: DAOV101__factory;
let Dao_v1_3_0_alpha: DAOV130Alpha__factory;
let DaoCurrent: DAO__factory;

const DUMMY_METADATA = ethers.utils.hexlify(
  ethers.utils.toUtf8Bytes('0x123456789')
);

describe('DAO Upgrade', function () {
  before(async function () {
    signers = await ethers.getSigners();
    Dao_v1_0_1 = new DAOV101__factory(signers[0]);
    Dao_v1_3_0_alpha = new DAOV130Alpha__factory(signers[0]);

    DaoCurrent = new DAO__factory(signers[0]);
  });

  it('upgrades v1.0.1 to v1.3.0', async () => {
    const proxy = await deployWithProxy<DAOV101>(Dao_v1_0_1);
    await proxy.initialize(
      DUMMY_METADATA,
      signers[0].address,
      ethers.constants.AddressZero,
      daoExampleURI
    );

    // Store the current implementation
    const implementationBeforeUpgrade = await readImplementationValueFromSlot(
      proxy.address
    );

    proxy.grant(
      proxy.address,
      signers[0].address,
      UPGRADE_PERMISSIONS.UPGRADE_DAO_PERMISSION_ID
    );

    // Deploy the new implementation
    const newImplementation = await DaoCurrent.deploy();

    // Upgrade to the new implementation
    const upgradeTx = await proxy.upgradeTo(newImplementation.address);

    // Check the stored implementation.
    const implementationAfterUpgrade = await readImplementationValueFromSlot(
      proxy.address
    );
    expect(implementationAfterUpgrade).to.equal(newImplementation.address);
    expect(implementationAfterUpgrade).to.not.equal(
      implementationBeforeUpgrade
    );

    // Check the emitted implementation.
    const emittedImplementation = (
      await findEventTopicLog(upgradeTx, Dao_v1_0_1.interface, 'Upgraded')
    ).args.implementation;
    expect(emittedImplementation).to.equal(newImplementation.address);

    // Check that storage is not corrupted.
    expect(await proxy.callStatic.daoURI()).to.equal(daoExampleURI);
  });

  it('upgrades v1.3.0-alpha (mumbai pre-release) to v1.3.0', async () => {
    const proxy = await deployWithProxy<DAOV130Alpha>(Dao_v1_3_0_alpha);
    await proxy.initialize(
      DUMMY_METADATA,
      signers[0].address,
      ethers.constants.AddressZero,
      daoExampleURI
    );

    // Store the current implementation
    const implementationBeforeUpgrade = await readImplementationValueFromSlot(
      proxy.address
    );

    proxy.grant(
      proxy.address,
      signers[0].address,
      UPGRADE_PERMISSIONS.UPGRADE_DAO_PERMISSION_ID
    );

    // Deploy the new implementation
    const newImplementation = await DaoCurrent.deploy();

    // Upgrade to the new implementation
    const upgradeTx = await proxy.upgradeTo(newImplementation.address);

    // Check the stored implementation.
    const implementationAfterUpgrade = await readImplementationValueFromSlot(
      proxy.address
    );
    expect(implementationAfterUpgrade).to.equal(newImplementation.address);
    expect(implementationAfterUpgrade).to.not.equal(
      implementationBeforeUpgrade
    );

    // Check the emitted implementation.
    const emittedImplementation = (
      await findEventTopicLog(upgradeTx, Dao_v1_3_0_alpha.interface, 'Upgraded')
    ).args.implementation;
    expect(emittedImplementation).to.equal(newImplementation.address);

    // Check that storage is not corrupted.
    expect(await proxy.callStatic.daoURI()).to.equal(daoExampleURI);
  });
});
