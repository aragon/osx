import {expect} from 'chai';
import hre, {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {AddresslistMock, AddresslistMock__factory} from '../../../typechain';

describe('AddresslistMock', function () {
  let signers: SignerWithAddress[];
  let addresslist: AddresslistMock;

  before(async () => {
    signers = await ethers.getSigners();
  });

  beforeEach(async () => {
    // TODO:GIORGI test commented
    // const AddresslistMock = new AddresslistMock__factory(signers[0]);
    // addresslist = await AddresslistMock.deploy();
    addresslist = await hre.wrapper.deploy('AddresslistMock');
  });

  context('addresslistLength', function () {
    it('returns the right length after addresses were added', async () => {
      expect(await addresslist.addresslistLength()).to.equal(0);

      await addresslist.addAddresses([signers[0].address]);
      expect(await addresslist.addresslistLength()).to.equal(1);

      await addresslist.addAddresses([signers[1].address, signers[2].address]);
      expect(await addresslist.addresslistLength()).to.equal(3);
    });

    it('returns the right length after addresses were removed', async () => {
      await addresslist.addAddresses([
        signers[0].address,
        signers[1].address,
        signers[2].address,
      ]);
      expect(await addresslist.addresslistLength()).to.equal(3);

      await addresslist.removeAddresses([signers[0].address]);
      expect(await addresslist.addresslistLength()).to.equal(2);

      await addresslist.removeAddresses([
        signers[1].address,
        signers[2].address,
      ]);
      expect(await addresslist.addresslistLength()).to.equal(0);
    });
  });

  context('addresslistLengthAtBlock', function () {
    it('returns the right length after addresses were added', async () => {
      const tx1 = await addresslist.addAddresses([signers[0].address]);
      await ethers.provider.send('evm_mine', []);

      const tx2 = await addresslist.addAddresses([
        signers[1].address,
        signers[2].address,
      ]);
      await ethers.provider.send('evm_mine', []);

      const [rc1, rc2] = await Promise.all([tx1.wait(), tx2.wait()]);

      expect(
        await addresslist.addresslistLengthAtBlock(rc1.blockNumber - 1)
      ).to.equal(0);
      expect(
        await addresslist.addresslistLengthAtBlock(rc1.blockNumber)
      ).to.equal(1);
      expect(
        await addresslist.addresslistLengthAtBlock(rc2.blockNumber)
      ).to.equal(3);
    });

    it('returns the right length after addresses were removed', async () => {
      const tx1 = await addresslist.addAddresses([
        signers[0].address,
        signers[1].address,
        signers[2].address,
      ]);
      await ethers.provider.send('evm_mine', []);

      const tx2 = await addresslist.removeAddresses([signers[0].address]);
      await ethers.provider.send('evm_mine', []);

      const tx3 = await addresslist.removeAddresses([
        signers[1].address,
        signers[2].address,
      ]);
      await ethers.provider.send('evm_mine', []);

      const [rc1, rc2, rc3] = await Promise.all([
        tx1.wait(),
        tx2.wait(),
        tx3.wait(),
      ]);

      expect(rc1.blockNumber).to.be.lt(rc2.blockNumber);
      expect(rc2.blockNumber).to.be.lt(rc3.blockNumber);

      expect(
        await addresslist.addresslistLengthAtBlock(rc1.blockNumber)
      ).to.equal(3);
      expect(
        await addresslist.addresslistLengthAtBlock(rc2.blockNumber)
      ).to.equal(2);
      expect(
        await addresslist.addresslistLengthAtBlock(rc3.blockNumber)
      ).to.equal(0);
    });
  });

  context('isListed', function () {
    it('returns `true` if the address is listed', async () => {
      await addresslist.addAddresses([signers[0].address]);
      await ethers.provider.send('evm_mine', []);

      expect(await addresslist.isListed(signers[0].address)).to.equal(true);
    });

    it('returns `false` if the address is not listed', async () => {
      expect(await addresslist.isListed(signers[0].address)).to.equal(false);
    });
  });

  context('isListedAtBlock', function () {
    it('returns `true` if the address is listed at the specific block', async () => {
      let tx1 = await addresslist.addAddresses([signers[0].address]);
      await ethers.provider.send('evm_mine', []);

      let tx2 = await addresslist.removeAddresses([signers[0].address]);
      await ethers.provider.send('evm_mine', []);

      const [rc1, rc2] = await Promise.all([tx1.wait(), tx2.wait()]);

      expect(rc1.blockNumber).to.be.lt(rc2.blockNumber);

      expect(
        await addresslist.isListedAtBlock(signers[0].address, rc1.blockNumber)
      ).to.equal(true);
      expect(
        await addresslist.isListedAtBlock(signers[0].address, rc2.blockNumber)
      ).to.equal(false);
    });

    it('returns `false` if the address is not listed at the specific block', async () => {
      let tx1 = await addresslist.addAddresses([signers[0].address]);
      await ethers.provider.send('evm_mine', []);

      const rc1 = await tx1.wait();

      expect(
        await addresslist.isListedAtBlock(
          signers[0].address,
          rc1.blockNumber - 1
        )
      ).to.equal(false);
      expect(
        await addresslist.isListedAtBlock(signers[0].address, rc1.blockNumber)
      ).to.equal(true);
    });
  });

  context('addAddresses', function () {
    it('adds new addresses to the address list', async () => {
      expect(await addresslist.isListed(signers[0].address)).to.equal(false);
      expect(await addresslist.isListed(signers[1].address)).to.equal(false);
      expect(await addresslist.addresslistLength()).to.equal(0);

      await addresslist.addAddresses([signers[0].address, signers[1].address]);
      await ethers.provider.send('evm_mine', []);

      expect(await addresslist.isListed(signers[0].address)).to.equal(true);
      expect(await addresslist.isListed(signers[1].address)).to.equal(true);
      expect(await addresslist.addresslistLength()).to.equal(2);
    });

    it('reverts if an address was listed already', async () => {
      await addresslist.addAddresses([signers[0].address, signers[2].address]);
      await ethers.provider.send('evm_mine', []);
      expect(await addresslist.addresslistLength()).to.equal(2);

      // try to add signer[1] and signer[2], the latter of which is currently listed
      await expect(
        addresslist.addAddresses([signers[1].address, signers[2].address])
      )
        .to.be.revertedWithCustomError(addresslist, 'InvalidAddresslistUpdate')
        .withArgs(signers[2].address);

      // Verify that the address list has not changed
      await ethers.provider.send('evm_mine', []);
      expect(await addresslist.isListed(signers[0].address)).to.equal(true);
      expect(await addresslist.isListed(signers[2].address)).to.equal(true);
      expect(await addresslist.addresslistLength()).to.equal(2);
    });

    it('reverts if the array of new addresses to be added contains an address multiple times', async () => {
      await expect(
        addresslist.addAddresses([signers[0].address, signers[0].address])
      )
        .to.be.revertedWithCustomError(addresslist, 'InvalidAddresslistUpdate')
        .withArgs(signers[0].address);
    });
  });

  context('removeAddresses', function () {
    it('removes existing addresses from the address list', async () => {
      await addresslist.addAddresses([signers[0].address, signers[1].address]);
      await ethers.provider.send('evm_mine', []);

      expect(await addresslist.isListed(signers[0].address)).to.equal(true);
      expect(await addresslist.isListed(signers[1].address)).to.equal(true);
      expect(await addresslist.addresslistLength()).to.equal(2);

      await expect(
        addresslist.removeAddresses([signers[0].address, signers[1].address])
      ).not.to.be.reverted;

      await ethers.provider.send('evm_mine', []);

      expect(await addresslist.isListed(signers[0].address)).to.equal(false);
      expect(await addresslist.isListed(signers[1].address)).to.equal(false);
      expect(await addresslist.addresslistLength()).to.equal(0);
    });

    it('reverts removal if an address is not listed', async () => {
      await addresslist.addAddresses([signers[0].address, signers[1].address]);
      await ethers.provider.send('evm_mine', []);
      expect(await addresslist.addresslistLength()).to.equal(2);

      // try to remove signer[1] and signer[2], the latter of which is currently not listed
      await expect(
        addresslist.removeAddresses([signers[1].address, signers[2].address])
      )
        .to.be.revertedWithCustomError(addresslist, 'InvalidAddresslistUpdate')
        .withArgs(signers[2].address);

      // Verify that the address list has not changed
      await ethers.provider.send('evm_mine', []);
      expect(await addresslist.isListed(signers[0].address)).to.equal(true);
      expect(await addresslist.isListed(signers[1].address)).to.equal(true);
      expect(await addresslist.addresslistLength()).to.equal(2);
    });

    it('reverts if the array of existing addresses to be removed contains an address multiple times', async () => {
      await addresslist.addAddresses([signers[0].address, signers[1].address]);
      await ethers.provider.send('evm_mine', []);

      await expect(
        addresslist.removeAddresses([signers[0].address, signers[0].address])
      )
        .to.be.revertedWithCustomError(addresslist, 'InvalidAddresslistUpdate')
        .withArgs(signers[0].address);
    });
  });
});
