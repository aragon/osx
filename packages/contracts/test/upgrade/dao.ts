import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {DAO__factory} from '../../typechain';

import {v1_0_0_active_contracts, v1_0_0_typechain} from '@aragon/osx-versions';

import {daoExampleURI} from '../test-utils/dao';

import {deployWithProxy} from '../test-utils/proxy';
import {UPGRADE_PERMISSIONS} from '../test-utils/permissions';
import {findEventTopicLog} from '../../utils/event';
import {readImplementationValueFromSlot} from '../../utils/storage';
import {ContractFactory} from 'ethers';

let signers: SignerWithAddress[];
let DaoV1_0_0: v1_0_0_typechain.DAO__factory;
let DaoCurrent: DAO__factory;

const DUMMY_METADATA = ethers.utils.hexlify(
  ethers.utils.toUtf8Bytes('0x123456789')
);

describe('DAO Upgrade', function () {
  before(async function () {
    signers = await ethers.getSigners();
    DaoV1_0_0 = new v1_0_0_typechain.DAO__factory(signers[0]);
    DaoCurrent = new DAO__factory(signers[0]);
  });

  it('upgrades v1.0.0 to v1.1.0', async () => {
    const proxy = await deployWithProxy<v1_0_0_typechain.DAO>(DaoV1_0_0);
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
      await findEventTopicLog(upgradeTx, DaoV1_0_0.interface, 'Upgraded')
    ).args.implementation;
    expect(emittedImplementation).to.equal(newImplementation.address);

    // Check that storage is not corrupted.
    expect(await proxy.callStatic.daoURI()).to.equal(daoExampleURI);
  });
});
