import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  DAOFactory__factory,
  PluginRepo__factory,
  DAORegistry__factory,
  DAO__factory,
  DAOV100,
  DAOV100__factory,
} from '../../typechain';

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
    const daoV100 = await deployWithProxy<DAOV100>(DaoV100);
    await daoV100.initialize(
      DUMMY_METADATA,
      signers[0].address,
      ethers.constants.AddressZero,
      daoExampleURI
    );

    const oldImplementation = await readImplementationValueFromSlot(
      daoV100.address
    );

    daoV100.grant(
      daoV100.address,
      signers[0].address,
      UPGRADE_PERMISSIONS.UPGRADE_DAO_PERMISSION_ID
    );

    // Deploy the new implementation
    const daoV110 = await DaoV110.deploy();

    // Upgrade to the new implementation
    const upgradeTx = await daoV100.upgradeTo(daoV110.address);

    // Check the stored implementation.
    const newImplementation = await readImplementationValueFromSlot(
      daoV100.address
    );
    expect(newImplementation).to.equal(daoV110.address);
    expect(newImplementation).to.not.equal(oldImplementation);

    // Check the emitted implementation.
    const emittedImplementation = (
      await findEventTopicLog(upgradeTx, DaoV100.interface, 'Upgraded')
    ).args.implementation;
    expect(emittedImplementation).to.equal(daoV110.address);

    // Check that storage is not corrupted.
    expect(await daoV100.callStatic.daoURI()).to.equal(daoExampleURI);
  });
});
