import {expect} from 'chai';
import {BigNumberish} from 'ethers';
import {ethers} from 'hardhat';

import {AllowlistVotingSetup} from '../../typechain';
import {deployNewDAO} from '../test-utils/dao';

enum Op {
  Grant,
  Revoke,
  Freeze,
  GrantWithOracle,
}

const abiCoder = ethers.utils.defaultAbiCoder;
const AddressZero = ethers.constants.AddressZero;
const EMPTY_DATA = '0x';
const EMPTY_BYTES_32 = `0x${'00'.repeat(32)}`;

describe('AllowlistVotingSetup', function () {
  let ownerAddress: string;
  let signers: any;
  let allowlistVotingSetup: AllowlistVotingSetup;
  let implementationAddress: string;
  let targetDao: any;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
    targetDao = await deployNewDAO(ownerAddress);

    const AllowlistVotingSetup = await ethers.getContractFactory(
      'AllowlistVotingSetup'
    );
    allowlistVotingSetup = await AllowlistVotingSetup.deploy();

    implementationAddress =
      await allowlistVotingSetup.getImplementationAddress();
  });

  describe('prepareInstallation', async () => {
    it('fails if data is empty', async () => {
      await expect(
        allowlistVotingSetup.prepareInstallation(targetDao.address, EMPTY_DATA)
      ).to.be.reverted;

      await expect(
        allowlistVotingSetup.prepareInstallation(
          targetDao.address,
          EMPTY_BYTES_32
        )
      ).to.be.reverted;
    });

    // TODO: will be done in it's own task
  });

  describe('prepareUninstallation', async () => {
    // TODO: will be done in it's own task
  });
});
