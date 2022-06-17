import chai, {expect} from 'chai';
import {ethers} from 'hardhat';
import chaiUtils from '../../../test-utils';
import {customError} from '../../../test-utils/custom-error-helper';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {
  TestSharedComponent,
  TestIdGatingOracle,
  DAO,
} from '../../../../typechain';

chai.use(chaiUtils);

const ID_GATED_ACTION_ROLE = ethers.utils.id('ID_GATED_ACTION_ROLE');

describe('SharedComponent', function () {
  let signers: SignerWithAddress[];
  let testComponent: TestSharedComponent;
  let owningDao: DAO;
  let dao1: DAO;
  let dao2: DAO;
  let ownerAddress: string;
  let expectedACLAuthError: string;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    // create a DAO
    const DAO = await ethers.getContractFactory('DAO');
    owningDao = await DAO.deploy();
    dao1 = await DAO.deploy();
    dao2 = await DAO.deploy();
    await owningDao.initialize(
      '0x',
      ownerAddress,
      ethers.constants.AddressZero
    );
    await dao1.initialize('0x', ownerAddress, ethers.constants.AddressZero);
    await dao2.initialize('0x', ownerAddress, ethers.constants.AddressZero);

    // create a component
    const TestSharedComponent = await ethers.getContractFactory(
      'TestSharedComponent'
    );
    testComponent = await TestSharedComponent.deploy();
    await testComponent.initialize(owningDao.address);

    expectedACLAuthError = customError(
      'ACLAuth',
      testComponent.address,
      testComponent.address,
      ownerAddress,
      ID_GATED_ACTION_ROLE
    );
  });

  it('increments IDs', async () => {
    expect(
      await testComponent.callStatic.createNewObject(dao1.address)
    ).to.be.equal(0);

    const tx = await testComponent.createNewObject(dao1.address);
    await tx.wait();
    await ethers.provider.send('evm_mine', []);

    expect(
      await testComponent.callStatic.createNewObject(dao1.address)
    ).to.be.equal(1);
  });

  describe('idGatedAction:', async () => {
    let oracle: TestIdGatingOracle;

    beforeEach(async () => {});
    it('executes if the ID is allowed', async () => {
      const allowedId = 0;

      // deploy oracle and set allowed ID
      const Oracle = await ethers.getContractFactory('TestIdGatingOracle');
      oracle = await Oracle.deploy(allowedId);

      // Grants signers[0] the permission to do ID gated actions with the deployed oracle
      dao1.grantWithOracle(
        testComponent.address,
        ownerAddress,
        ID_GATED_ACTION_ROLE,
        oracle.address
      );

      // Deploy the oracle and set the allowed ID
      const tx = await testComponent.createNewObject(dao1.address);
      await tx.wait();
      await ethers.provider.send('evm_mine', []);

      expect(testComponent.callStatic.idGatedAction(allowedId));
    });

    it('reverts if the ID does not exist', async () => {
      const allowedId = 0;
      const nonExistingId = 1;

      // Deploy the oracle and set the allowed ID
      const Oracle = await ethers.getContractFactory('TestIdGatingOracle');
      oracle = await Oracle.deploy(allowedId);

      // Grant signers[0] the permission to do ID gated actions with the deployed oracle
      dao1.grantWithOracle(
        testComponent.address,
        ownerAddress,
        ID_GATED_ACTION_ROLE,
        oracle.address
      );

      // The call fails if the ID differs
      await expect(
        testComponent.callStatic.idGatedAction(nonExistingId)
      ).to.be.revertedWith(customError('ObjectIdNotAssigned', nonExistingId));
    });

    it('reverts if the ID is not allowed', async () => {
      // deploy oracle and set allowed ID
      const allowedId = 1;
      const existingButNotAllowedId = 0;

      const Oracle = await ethers.getContractFactory('TestIdGatingOracle');
      oracle = await Oracle.deploy(allowedId);

      // Grant signers[0] the permission to do ID gated actions with the deployed oracle
      dao1.grantWithOracle(
        testComponent.address,
        ownerAddress,
        ID_GATED_ACTION_ROLE,
        oracle.address
      );
      dao2.grantWithOracle(
        testComponent.address,
        ownerAddress,
        ID_GATED_ACTION_ROLE,
        oracle.address
      );

      // Create ID-gated object associated with dao1
      let tx = await testComponent.createNewObject(dao1.address);
      await tx.wait();
      tx = await testComponent.createNewObject(dao2.address);
      await tx.wait();

      await ethers.provider.send('evm_mine', []);

      // The call is allowed for the allowed ID
      expect(testComponent.callStatic.idGatedAction(allowedId));

      // The call fails if the ID differs
      await expect(
        testComponent.callStatic.idGatedAction(existingButNotAllowedId)
      ).to.be.revertedWith(expectedACLAuthError);
    });

    it('reverts if the role name is wrong', async () => {
      // Deploy oracle and set allowed ID
      const allowedId = 1;

      const Oracle = await ethers.getContractFactory('TestIdGatingOracle');
      oracle = await Oracle.deploy(allowedId);

      // Grant signers[0] permission to do ID gated actions with the deployed oracle
      dao1.grantWithOracle(
        testComponent.address,
        ownerAddress,
        ethers.utils.id('WRONG_ROLE'),
        oracle.address
      );

      // Create ID-gated object associated with dao1
      const tx = await testComponent.createNewObject(dao1.address);
      await tx.wait();
      await ethers.provider.send('evm_mine', []);

      await expect(
        testComponent.callStatic.idGatedAction(0)
      ).to.be.revertedWith(expectedACLAuthError);
    });

    it('reverts if the permission is set in the wrong DAO', async () => {
      // Deploy oracle and set allowed ID
      const allowedId = 0;

      const Oracle = await ethers.getContractFactory('TestIdGatingOracle');
      oracle = await Oracle.deploy(allowedId);

      // Grant signers[0] the permission to do ID gated actions with the deployed oracle
      dao2.grantWithOracle(
        testComponent.address,
        ownerAddress,
        ID_GATED_ACTION_ROLE,
        oracle.address
      );

      // Create ID-gated object associated with dao1
      const tx = await testComponent.createNewObject(dao1.address);
      await tx.wait();
      await ethers.provider.send('evm_mine', []);

      await expect(
        testComponent.callStatic.idGatedAction(0)
      ).to.be.revertedWith(expectedACLAuthError);
    });

    it('reverts if the object belongs to the wrong DAO', async () => {
      // Deploy oracle and set allowed ID
      const allowedId = 0;

      const Oracle = await ethers.getContractFactory('TestIdGatingOracle');
      oracle = await Oracle.deploy(allowedId);

      // Grant signer[0] permission to do ID gated actions with the deployed oracle
      dao1.grantWithOracle(
        testComponent.address,
        ownerAddress,
        ID_GATED_ACTION_ROLE,
        oracle.address
      );

      // Create ID-gated object associated with dao1
      const tx = await testComponent.createNewObject(dao2.address);
      await tx.wait();
      await ethers.provider.send('evm_mine', []);

      await expect(
        testComponent.callStatic.idGatedAction(0)
      ).to.be.revertedWith(expectedACLAuthError);
    });
  });
});
