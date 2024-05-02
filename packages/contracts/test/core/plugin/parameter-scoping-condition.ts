import {expect} from 'chai';
import hre, {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  TestParameterScopingPermissionCondition,
  TestPlugin,
  DAO,
  TestPlugin__factory,
  TestParameterScopingPermissionCondition__factory,
} from '../../../typechain';
import {deployNewDAO} from '../../test-utils/dao';
import {deployWithProxy} from '../../test-utils/proxy';

const DO_SOMETHING_PERMISSION_ID = ethers.utils.id('DO_SOMETHING_PERMISSION');

describe('TestParameterScopingCondition', function () {
  let signers: SignerWithAddress[];
  let parameterCondition: TestParameterScopingPermissionCondition;
  let testPlugin: TestPlugin;
  let managingDao: DAO;
  let ownerAddress: string;
  let expectedUnauthorizedErrorArguments: string[];

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    // create a DAO
    managingDao = await deployNewDAO(signers[0]);

    // Deploy the component
    // TODO:GIORGI test commented
    // const TestPlugin = new TestPlugin__factory(signers[0]);
    // testPlugin = await deployWithProxy(TestPlugin);

    testPlugin = await hre.wrapper.deploy('TestPlugin', {withProxy: true});
    await testPlugin.initialize(managingDao.address);

    // Deploy the condition

    // TODO:GIORGI test commented
    // const ParameterCondition =
    //   new TestParameterScopingPermissionCondition__factory(signers[0]);
    // parameterCondition = await ParameterCondition.deploy();

    parameterCondition = await hre.wrapper.deploy(
      'TestParameterScopingPermissionCondition'
    );

    // Give signers[0] the `DO_SOMETHING_PERMISSION_ID` on the TestPlugin
    await managingDao.grantWithCondition(
      testPlugin.address,
      ownerAddress,
      DO_SOMETHING_PERMISSION_ID,
      parameterCondition.address
    );

    expectedUnauthorizedErrorArguments = [
      managingDao.address,
      testPlugin.address,
      ownerAddress,
      DO_SOMETHING_PERMISSION_ID,
    ];
  });

  describe('condition conditions:', async () => {
    it('adds if the first parameter is larger than the second', async () => {
      let param1 = 10;
      let param2 = 1;

      expect(
        await testPlugin.callStatic.addPermissioned(param1, param2)
      ).to.be.equal(11);
    });

    it('reverts if the condition is called by the wrong function', async () => {
      let param1 = 10;
      let param2 = 1;

      await expect(testPlugin.callStatic.subPermissioned(param1, param2))
        .to.be.revertedWithCustomError(testPlugin, 'DaoUnauthorized')
        .withArgs(...expectedUnauthorizedErrorArguments);
    });

    it('reverts if the first parameter is equal to the second', async () => {
      let param1 = 1;
      let param2 = 1;

      await expect(testPlugin.callStatic.addPermissioned(param1, param2))
        .to.be.revertedWithCustomError(testPlugin, 'DaoUnauthorized')
        .withArgs(...expectedUnauthorizedErrorArguments);
    });

    it('reverts if the first parameter is smaller than the second', async () => {
      let param1 = 1;
      let param2 = 10;

      await expect(testPlugin.callStatic.addPermissioned(param1, param2))
        .to.be.revertedWithCustomError(testPlugin, 'DaoUnauthorized')
        .withArgs(...expectedUnauthorizedErrorArguments);
    });
  });
});
