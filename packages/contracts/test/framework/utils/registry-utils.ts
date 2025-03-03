import {RegistryUtils, RegistryUtils__factory} from '../../../typechain';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import hre, {ethers} from 'hardhat';

describe('RegistryUtils', () => {
  let registryUtilsContract: RegistryUtils;
  let signers: SignerWithAddress[];

  before(async () => {
    signers = await ethers.getSigners();
  });

  beforeEach(async () => {
    registryUtilsContract = await hre.wrapper.deploy('RegistryUtils');
  });

  describe('isSubdomainValid', () => {
    it('should validate the passed name correctly (< 32 bytes long name)', async () => {
      const baseName = 'this-is-my-super-valid-name';

      // loop through the ascii table
      for (let i = 0; i < 127; i++) {
        // replace the 10th char in the baseName
        const subdomainName =
          baseName.substring(0, 10) +
          String.fromCharCode(i) +
          baseName.substring(10 + 1);

        // test success if it is a valid char [0-9a-z\-]
        if ((i > 47 && i < 58) || (i > 96 && i < 123) || i === 45) {
          expect(await registryUtilsContract.isSubdomainValid(subdomainName)).to
            .be.true;
          continue;
        }

        expect(await registryUtilsContract.isSubdomainValid(subdomainName)).to
          .be.false;
      }
    });

    it('should validate the passed name correctly (> 32 bytes long name)', async () => {
      const baseName =
        'this-is-my-super-looooooooooooooooooooooooooong-valid-name';

      // loop through the ascii table
      for (let i = 0; i < 127; i++) {
        // replace the 40th char in the baseName
        const subdomainName =
          baseName.substring(0, 40) +
          String.fromCharCode(i) +
          baseName.substring(40 + 1);

        // test success if it is a valid char [0-9a-z\-]
        if ((i > 47 && i < 58) || (i > 96 && i < 123) || i === 45) {
          expect(await registryUtilsContract.isSubdomainValid(subdomainName)).to
            .be.true;
          continue;
        }

        expect(await registryUtilsContract.isSubdomainValid(subdomainName)).to
          .be.false;
      }
    });
  });
});
