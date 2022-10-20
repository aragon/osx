import {expect} from 'chai';
import {BigNumberish} from 'ethers';
import {ethers} from 'hardhat';

import {AllowlistVotingSetupV1} from '../../typechain';
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

// TODO 1. add type GRANT/REVOKE check in permissions
// TODO 2. in order to detect encode abi for deploy/update, use deployABI/updateABI
describe('AllowlistVotingSetup', function () {
  let ownerAddress: string;
  let signers: any;
  let allowlistVotingSetupV1: AllowlistVotingSetupV1;
  let implementationAddress: string;
  let targetDao: any;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
    targetDao = await deployNewDAO(ownerAddress);

    const AllowlistVotingSetup = await ethers.getContractFactory(
      'AllowlistVotingSetupV1'
    );
    allowlistVotingSetupV1 = await AllowlistVotingSetup.deploy();

    implementationAddress =
      await allowlistVotingSetupV1.getImplementationAddress();
  });

  describe('prepareInstallation', async () => {
    it('fails if data is empty', async () => {
      await expect(
        allowlistVotingSetupV1.prepareInstallation(
          targetDao.address,
          EMPTY_DATA
        )
      ).to.be.reverted;

      await expect(
        allowlistVotingSetupV1.prepareInstallation(
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
