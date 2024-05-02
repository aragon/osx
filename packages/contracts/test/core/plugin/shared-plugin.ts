import {expect} from 'chai';
import hre, {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  TestSharedPlugin,
  TestIdGatingCondition,
  DAO,
  TestIdGatingCondition__factory,
  TestSharedPlugin__factory,
} from '../../../typechain';
import {deployNewDAO} from '../../test-utils/dao';
import {deployWithProxy} from '../../test-utils/proxy';

const ID_GATED_ACTION_PERMISSION_ID = ethers.utils.id(
  'ID_GATED_ACTION_PERMISSION'
);

describe('SharedPlugin', function () {
  let signers: SignerWithAddress[];
  let testPlugin: TestSharedPlugin;
  let managingDao: DAO;
  let dao1: DAO;
  let dao2: DAO;
  let ownerAddress: string;
  let expectedUnauthorizedErrorArguments: string[];

  beforeEach(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    // Deploy the managing DAO and two other DAOs
    managingDao = await deployNewDAO(signers[0]);
    dao1 = await deployNewDAO(signers[0]);
    dao2 = await deployNewDAO(signers[0]);

    // Deploy the `TestSharedPlugin`
    // TODO:GIORGI test commented
    // const TestSharedPlugin = new TestSharedPlugin__factory(signers[0]);
    // testPlugin = await deployWithProxy(TestSharedPlugin);
    testPlugin = await hre.wrapper.deploy('TestSharedPlugin', {
      withProxy: true,
    });
    await testPlugin.initialize(managingDao.address);

    expectedUnauthorizedErrorArguments = [
      managingDao.address,
      testPlugin.address,
      ownerAddress,
      ID_GATED_ACTION_PERMISSION_ID,
    ];
  });

  it('increments IDs', async () => {
    expect(
      await testPlugin.callStatic.createNewObject(dao1.address)
    ).to.be.equal(0);

    const tx = await testPlugin.createNewObject(dao1.address);
    await tx.wait();
    await ethers.provider.send('evm_mine', []);

    expect(
      await testPlugin.callStatic.createNewObject(dao1.address)
    ).to.be.equal(1);
  });

  describe('idGatedAction:', async () => {
    let condition: TestIdGatingCondition;

    beforeEach(async () => {});
    it('executes if the ID is allowed', async () => {
      const allowedId = 0;

      // Deploy `TestIdGatingCondition` and set the allowed ID in the constructor
      // TODO:GIORGI test commented
      // const Condition = new TestIdGatingCondition__factory(signers[0]);
      // condition = await Condition.deploy(allowedId);

      condition = await hre.wrapper.deploy('TestIdGatingCondition', {
        args: [allowedId],
      });

      // Grants signers[0] the permission to do ID gated actions with the deployed `TestIdGatingCondition` condition
      await dao1.grantWithCondition(
        testPlugin.address,
        ownerAddress,
        ID_GATED_ACTION_PERMISSION_ID,
        condition.address
      );

      // Deploy a new object in the `TestPlugin` which will have the ID 0
      const tx = await testPlugin.createNewObject(dao1.address);
      await tx.wait();
      await ethers.provider.send('evm_mine', []);

      // Check that the ID gated action can be executed
      await expect(testPlugin.callStatic.idGatedAction(allowedId)).not.to.be
        .reverted;
    });

    it('reverts if the ID does not exist', async () => {
      const allowedId = 0;
      const nonExistingId = 1;

      // Deploy the condition and set the allowed ID
      // TODO:GIORGI test commented
      // const Condition = new TestIdGatingCondition__factory(signers[0]);
      // condition = await Condition.deploy(allowedId);

      condition = await hre.wrapper.deploy('TestIdGatingCondition', {
        args: [allowedId],
      });

      // Grants signers[0] the permission to do ID gated actions with the deployed `TestIdGatingCondition` condition
      await dao1.grantWithCondition(
        testPlugin.address,
        ownerAddress,
        ID_GATED_ACTION_PERMISSION_ID,
        condition.address
      );

      // The call fails because no object with ID 1 exists
      await expect(testPlugin.callStatic.idGatedAction(nonExistingId))
        .to.be.revertedWithCustomError(testPlugin, 'ObjectIdNotAssigned')
        .withArgs(nonExistingId);

      // Create object with ID 0
      let tx = await testPlugin.createNewObject(dao1.address);
      await tx.wait();
      await ethers.provider.send('evm_mine', []);

      // The call still fails because no object with ID 1 exists
      await expect(testPlugin.callStatic.idGatedAction(nonExistingId))
        .to.be.revertedWithCustomError(testPlugin, 'ObjectIdNotAssigned')
        .withArgs(nonExistingId);

      // The call executes for the allowed ID 0
      await expect(testPlugin.callStatic.idGatedAction(allowedId)).not.to.be
        .reverted;
    });

    it('reverts if the ID is not allowed', async () => {
      // deploy condition and set allowed ID
      const allowedId = 1;
      const existingButNotAllowedId = 0;

      // TODO:GIORGI test commented
      // const Condition = new TestIdGatingCondition__factory(signers[0]);
      // condition = await Condition.deploy(allowedId);

      condition = await hre.wrapper.deploy('TestIdGatingCondition', {
        args: [allowedId],
      });

      // Grants signers[0] the permission to do ID gated actions on `testPlugin` via `condition`
      await dao1.grantWithCondition(
        testPlugin.address,
        ownerAddress,
        ID_GATED_ACTION_PERMISSION_ID,
        condition.address
      );
      await dao2.grantWithCondition(
        testPlugin.address,
        ownerAddress,
        ID_GATED_ACTION_PERMISSION_ID,
        condition.address
      );

      // Create ID-gated object associated with `dao1`
      let tx = await testPlugin.createNewObject(dao1.address);
      await tx.wait();
      tx = await testPlugin.createNewObject(dao2.address);
      await tx.wait();

      await ethers.provider.send('evm_mine', []);

      // The call is allowed for the allowed ID
      await expect(testPlugin.callStatic.idGatedAction(allowedId)).not.to.be
        .reverted;

      // The call fails if the ID differs
      await expect(testPlugin.callStatic.idGatedAction(existingButNotAllowedId))
        .to.be.revertedWithCustomError(testPlugin, 'DaoUnauthorized')
        .withArgs(...expectedUnauthorizedErrorArguments);
    });

    it('reverts if the permission is missing', async () => {
      // Deploy condition and set allowed ID
      const allowedId = 0;

      // TODO:GIORGI test commented
      // const Condition = new TestIdGatingCondition__factory(signers[0]);
      // condition = await Condition.deploy(allowedId);

      condition = await hre.wrapper.deploy('TestIdGatingCondition', {
        args: [allowedId],
      });

      // Create ID-gated object associated with `dao1`
      const tx = await testPlugin.createNewObject(dao1.address);
      await tx.wait();
      await ethers.provider.send('evm_mine', []);

      await expect(testPlugin.callStatic.idGatedAction(allowedId))
        .to.be.revertedWithCustomError(testPlugin, 'DaoUnauthorized')
        .withArgs(...expectedUnauthorizedErrorArguments);
    });

    it('reverts if the permission is set in the wrong DAO', async () => {
      // Deploy condition and set allowed ID
      const allowedId = 0;

      // TODO:GIORGI test commented
      // const Condition = new TestIdGatingCondition__factory(signers[0]);
      // condition = await Condition.deploy(allowedId);

      condition = await hre.wrapper.deploy('TestIdGatingCondition', {
        args: [allowedId],
      });

      // Grants signers[0] the permission to do ID gated actions with the deployed `TestIdGatingCondition` condition
      await dao2.grantWithCondition(
        testPlugin.address,
        ownerAddress,
        ID_GATED_ACTION_PERMISSION_ID,
        condition.address
      );

      // Create ID-gated object associated with `dao1`
      const tx = await testPlugin.createNewObject(dao1.address);
      await tx.wait();
      await ethers.provider.send('evm_mine', []);

      await expect(testPlugin.callStatic.idGatedAction(allowedId))
        .to.be.revertedWithCustomError(testPlugin, 'DaoUnauthorized')
        .withArgs(...expectedUnauthorizedErrorArguments);
    });

    it('reverts if the object belongs to the wrong DAO', async () => {
      // Deploy condition and set allowed ID
      const allowedId = 0;

      // TODO:GIORGI test commented
      // const Condition = new TestIdGatingCondition__factory(signers[0]);
      // condition = await Condition.deploy(allowedId);

      condition = await hre.wrapper.deploy('TestIdGatingCondition', {
        args: [allowedId],
      });

      // Grants signers[0] the permission to do ID gated actions with the deployed `TestIdGatingCondition` condition
      await dao1.grantWithCondition(
        testPlugin.address,
        ownerAddress,
        ID_GATED_ACTION_PERMISSION_ID,
        condition.address
      );

      // Create ID-gated object associated with `dao1`
      const tx = await testPlugin.createNewObject(dao2.address);
      await tx.wait();
      await ethers.provider.send('evm_mine', []);

      await expect(testPlugin.callStatic.idGatedAction(allowedId))
        .to.be.revertedWithCustomError(testPlugin, 'DaoUnauthorized')
        .withArgs(...expectedUnauthorizedErrorArguments);
    });
  });
});
