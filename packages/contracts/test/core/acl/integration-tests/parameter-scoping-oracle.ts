import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  TestParameterScopingACLOracle,
  TestComponent,
  DAO,
} from '../../../../typechain';
import {customError} from '../../../test-utils/custom-error-helper';

const DO_SOMETHING_PERMISSION_ID = ethers.utils.id(
  'DO_SOMETHING_PERMISSION_ID'
);

describe('TestParameterScopingOracle', function () {
  let signers: SignerWithAddress[];
  let parameterOracle: TestParameterScopingACLOracle;
  let testComponent: TestComponent;
  let managingDao: DAO;
  let ownerAddress: string;
  let expectedPermissionUnauthorizedError: string;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    // create a DAO
    const DAO = await ethers.getContractFactory('DAO');
    managingDao = await DAO.deploy();
    await managingDao.initialize(
      '0x',
      ownerAddress,
      ethers.constants.AddressZero
    );

    // Deploy the component
    const TestComponent = await ethers.getContractFactory('TestComponent');
    testComponent = await TestComponent.deploy();
    await testComponent.initialize(managingDao.address);

    // Deploy the oracle
    const ParameterOracle = await ethers.getContractFactory(
      'TestParameterScopingACLOracle'
    );
    parameterOracle = await ParameterOracle.deploy();

    // Give signers[0] the `DO_SOMETHING_PERMISSION_ID` on the TestComponent
    managingDao.grantWithOracle(
      testComponent.address,
      ownerAddress,
      DO_SOMETHING_PERMISSION_ID,
      parameterOracle.address
    );

    expectedPermissionUnauthorizedError = customError(
      'PermissionUnauthorized',
      testComponent.address,
      testComponent.address,
      ownerAddress,
      DO_SOMETHING_PERMISSION_ID
    );
  });

  describe('oracle conditions:', async () => {
    it('adds if the first parameter is larger than the second', async () => {
      let param1 = 10;
      let param2 = 1;

      expect(
        await testComponent.callStatic.addPermissioned(param1, param2)
      ).to.be.equal(11);
    });

    it('reverts if the oracle is called by the wrong function', async () => {
      let param1 = 10;
      let param2 = 1;

      await expect(
        testComponent.callStatic.subPermissioned(param1, param2)
      ).to.be.revertedWith(expectedPermissionUnauthorizedError);
    });

    it('reverts if the first parameter is equal to the second', async () => {
      let param1 = 1;
      let param2 = 1;

      await expect(
        testComponent.callStatic.addPermissioned(param1, param2)
      ).to.be.revertedWith(expectedPermissionUnauthorizedError);
    });

    it('reverts if the first parameter is smaller than the second', async () => {
      let param1 = 1;
      let param2 = 10;

      await expect(
        testComponent.callStatic.addPermissioned(param1, param2)
      ).to.be.revertedWith(expectedPermissionUnauthorizedError);
    });
  });
});
