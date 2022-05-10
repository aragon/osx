import chai, { expect } from 'chai';
import { ethers } from 'hardhat';
import chaiUtils from '../../test-utils';
import { customError } from '../../test-utils/custom-error-helper';

chai.use(chaiUtils);

import { TestParameterScopingACLOracle, TestComponent, DAO } from '../../../typechain';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

const DO_SOMETHING_ROLE = ethers.utils.id('DO_SOMETHING_ROLE');

describe('TestParameterScopingOracle', function () {
  let signers: SignerWithAddress[];
  let parameterOracle: TestParameterScopingACLOracle;
  let testComponent: TestComponent;
  let dao: DAO;
  let ownerAddress: string;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    // create a DAO
    const DAO = await ethers.getContractFactory('DAO');
    dao = await DAO.deploy();
    await dao.initialize('0x', ownerAddress, ethers.constants.AddressZero);

    // create a component
    const TestComponent = await ethers.getContractFactory('TestComponent');
    testComponent = await TestComponent.deploy();
    await testComponent.initialize(dao.address);

    // create parameter oracle
    const ParameterOracle = await ethers.getContractFactory('TestParameterScopingACLOracle');
    parameterOracle = await ParameterOracle.deploy();

    // Giver signer[0] the DO_SOMETHING_ROLE on the TestComponent
    dao.grantWithOracle(
      testComponent.address,
      ownerAddress,
      DO_SOMETHING_ROLE,
      parameterOracle.address
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
      ).to.be.revertedWith(
        customError('ACLAuth', testComponent.address, testComponent.address, ownerAddress, DO_SOMETHING_ROLE)
      );
    });

    it('reverts the first parameter is not larger than the second', async () => {
      let param1 = 1;
      let param2 = 1;

      await expect(
        testComponent.callStatic.addPermissioned(param1, param2)
      ).to.be.revertedWith(
        customError('ACLAuth', testComponent.address, testComponent.address, ownerAddress, DO_SOMETHING_ROLE)
      );
    });
  });
});
