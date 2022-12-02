import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  TestParameterScopingPermissionOracle,
  TestPlugin,
  DAO,
} from '../../../../typechain';
import {customError} from '../../../test-utils/custom-error-helper';
import { deployNewDAO } from '../../../test-utils/dao';

const DO_SOMETHING_PERMISSION_ID = ethers.utils.id('DO_SOMETHING_PERMISSION');

describe('TestParameterScopingOracle', function () {
  let signers: SignerWithAddress[];
  let parameterOracle: TestParameterScopingPermissionOracle;
  let testPlugin: TestPlugin;
  let managingDao: DAO;
  let ownerAddress: string;
  let expectedUnauthorizedError: string;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    // create a DAO
    managingDao = await deployNewDAO(ownerAddress);

    // Deploy the component
    const TestPlugin = await ethers.getContractFactory('TestPlugin');
    testPlugin = await TestPlugin.deploy();
    await testPlugin.initialize(managingDao.address);

    // Deploy the oracle
    const ParameterOracle = await ethers.getContractFactory(
      'TestParameterScopingPermissionOracle'
    );
    parameterOracle = await ParameterOracle.deploy();

    // Give signers[0] the `DO_SOMETHING_PERMISSION_ID` on the TestPlugin
    managingDao.grantWithOracle(
      testPlugin.address,
      ownerAddress,
      DO_SOMETHING_PERMISSION_ID,
      parameterOracle.address
    );

    expectedUnauthorizedError = customError(
      'DaoUnauthorized',
      managingDao.address,
      testPlugin.address,
      testPlugin.address,
      ownerAddress,
      DO_SOMETHING_PERMISSION_ID
    );
  });

  describe('oracle conditions:', async () => {
    it('adds if the first parameter is larger than the second', async () => {
      let param1 = 10;
      let param2 = 1;

      expect(
        await testPlugin.callStatic.addPermissioned(param1, param2)
      ).to.be.equal(11);
    });

    it('reverts if the oracle is called by the wrong function', async () => {
      let param1 = 10;
      let param2 = 1;

      await expect(
        testPlugin.callStatic.subPermissioned(param1, param2)
      ).to.be.revertedWith(expectedUnauthorizedError);
    });

    it('reverts if the first parameter is equal to the second', async () => {
      let param1 = 1;
      let param2 = 1;

      await expect(
        testPlugin.callStatic.addPermissioned(param1, param2)
      ).to.be.revertedWith(expectedUnauthorizedError);
    });

    it('reverts if the first parameter is smaller than the second', async () => {
      let param1 = 1;
      let param2 = 10;

      await expect(
        testPlugin.callStatic.addPermissioned(param1, param2)
      ).to.be.revertedWith(expectedUnauthorizedError);
    });
  });
});
