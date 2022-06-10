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

  it('increments ids', async () => {
    expect(await testComponent.callStatic.newObject(dao1.address)).to.be.equal(
      0
    );

    const tx = await testComponent.newObject(dao1.address);
    await tx.wait();
    await ethers.provider.send('evm_mine', []);

    expect(await testComponent.callStatic.newObject(dao1.address)).to.be.equal(
      1
    );
  });

  describe('idGatedAction:', async () => {
    let oracle: TestIdGatingOracle;

    beforeEach(async () => {});
    it('executes if the id is allowed', async () => {
      // deploy oracle and set allowed id
      const allowedId = 0;

      const Oracle = await ethers.getContractFactory('TestIdGatingOracle');
      oracle = await Oracle.deploy(allowedId);

      // Grants signers[0] the permission to do id gated actions with the deployed oracle
      dao1.grantWithOracle(
        testComponent.address,
        ownerAddress,
        ID_GATED_ACTION_ROLE,
        oracle.address
      );

      // Create component with id 0
      const tx = await testComponent.newObject(dao1.address);
      await tx.wait();
      await ethers.provider.send('evm_mine', []);

      expect(testComponent.callStatic.idGatedAction(0));
    });

    it('reverts if the id is not allowed', async () => {
      // deploy oracle and set allowed id
      const allowedId = 1;

      const Oracle = await ethers.getContractFactory('TestIdGatingOracle');
      oracle = await Oracle.deploy(allowedId);

      // Grant signers[0] the permission to do id gated actions with the deployed oracle
      dao1.grantWithOracle(
        testComponent.address,
        ownerAddress,
        ID_GATED_ACTION_ROLE,
        oracle.address
      );

      // Create id-gated object associated with dao1
      const tx = await testComponent.newObject(dao1.address);
      await tx.wait();
      await ethers.provider.send('evm_mine', []);

      await expect(
        testComponent.callStatic.idGatedAction(0)
      ).to.be.revertedWith(expectedACLAuthError);
    });

    it('reverts if the role name is wrong', async () => {
      // Deploy oracle and set allowed id
      const allowedId = 1;

      const Oracle = await ethers.getContractFactory('TestIdGatingOracle');
      oracle = await Oracle.deploy(allowedId);

      // Grant signers[0] permission to do id gated actions with the deployed oracle
      dao1.grantWithOracle(
        testComponent.address,
        ownerAddress,
        ethers.utils.id('WRONG_ROLE'),
        oracle.address
      );

      // Create id-gated object associated with dao1
      const tx = await testComponent.newObject(dao1.address);
      await tx.wait();
      await ethers.provider.send('evm_mine', []);

      await expect(
        testComponent.callStatic.idGatedAction(0)
      ).to.be.revertedWith(expectedACLAuthError);
    });

    it('reverts if the permission is set in the wrong DAO', async () => {
      // Deploy oracle and set allowed id
      const allowedId = 0;

      const Oracle = await ethers.getContractFactory('TestIdGatingOracle');
      oracle = await Oracle.deploy(allowedId);

      // Grant signers[0] the permission to do id gated actions with the deployed oracle
      dao2.grantWithOracle(
        testComponent.address,
        ownerAddress,
        ID_GATED_ACTION_ROLE,
        oracle.address
      );

      // Create id-gated object associated with dao1
      const tx = await testComponent.newObject(dao1.address);
      await tx.wait();
      await ethers.provider.send('evm_mine', []);

      await expect(
        testComponent.callStatic.idGatedAction(0)
      ).to.be.revertedWith(expectedACLAuthError);
    });

    it('reverts if the object belongs to the wrong DAO', async () => {
      // Deploy oracle and set allowed id
      const allowedId = 0;

      const Oracle = await ethers.getContractFactory('TestIdGatingOracle');
      oracle = await Oracle.deploy(allowedId);

      // Grant signer[0] permission to do id gated actions with the deployed oracle
      dao1.grantWithOracle(
        testComponent.address,
        ownerAddress,
        ID_GATED_ACTION_ROLE,
        oracle.address
      );

      // Create id-gated object associated with dao1
      const tx = await testComponent.newObject(dao2.address);
      await tx.wait();
      await ethers.provider.send('evm_mine', []);

      await expect(
        testComponent.callStatic.idGatedAction(0)
      ).to.be.revertedWith(expectedACLAuthError);
    });
  });
});
