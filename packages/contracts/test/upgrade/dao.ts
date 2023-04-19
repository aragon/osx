import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {DAO__factory, DAOV100, DAOV100__factory} from '../../typechain';

import {daoExampleURI} from '../test-utils/dao';

import {deployWithProxy} from '../test-utils/proxy';
import {UPGRADE_PERMISSIONS} from '../test-utils/permissions';
import {findEventTopicLog} from '../../utils/event';
import {readImplementationValueFromSlot} from '../../utils/storage';

let signers: SignerWithAddress[];
let DaoV100: DAOV100__factory;
let DaoV110: DAO__factory;

const DUMMY_METADATA = ethers.utils.hexlify(
  ethers.utils.toUtf8Bytes('0x123456789')
);

describe('DAO Upgrade', function () {
  before(async function () {
    signers = await ethers.getSigners();
    DaoV100 = new DAOV100__factory(signers[0]);
    DaoV110 = new DAO__factory(signers[0]);
  });

  it('upgrades v1.0.0 to v1.1.0', async () => {
    const proxy = await deployWithProxy<DAOV100>(DaoV100);
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
    const newImplementation = await DaoV110.deploy();

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
      await findEventTopicLog(upgradeTx, DaoV100.interface, 'Upgraded')
    ).args.implementation;
    expect(emittedImplementation).to.equal(newImplementation.address);

    // Check that storage is not corrupted.
    expect(await proxy.callStatic.daoURI()).to.equal(daoExampleURI);
  });
});
