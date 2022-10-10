import {expect} from 'chai';
import {Signer} from 'ethers';
import {hexDataSlice, id} from 'ethers/lib/utils';
import {ethers} from 'hardhat';

import {
  CallbackHandlerMock,
  CallbackHandlerMockHelper,
  CallbackHandlerMock__factory,
  CallbackHandlerMockHelper__factory,
} from '../../../typechain';
import {customError} from '../../test-utils/custom-error-helper';

const EVENTS = {
  REGISTERED_CALLBACK: 'CallbackRegistered',
  REGISTERED_STANDARD: 'StandardRegistered',
  RECEIVED_CALLBACK: 'CallbackReceived',
};

const beefInterfaceId = '0xbeefbeef';
const callbackSig = hexDataSlice(id('callbackFunc()'), 0, 4); // 0x1eb2075a
const magicNumber = '0x10000000';
const magicNumberReturn = magicNumber + '0'.repeat(56);
const unregisteredNumberReturn = '0x' + '0'.repeat(64);

describe('AdaptiveErc165', function () {
  let adaptive: CallbackHandlerMock, signers: Signer[];
  let adaptiveHelper: CallbackHandlerMockHelper;

  before(async () => {
    signers = await ethers.getSigners();
    const Adaptive = (await ethers.getContractFactory(
      'CallbackHandlerMock'
    )) as CallbackHandlerMock__factory;
    const AdaptiveHelper = (await ethers.getContractFactory(
      'CallbackHandlerMockHelper'
    )) as CallbackHandlerMockHelper__factory;

    adaptive = await Adaptive.deploy();
    adaptiveHelper = await AdaptiveHelper.deploy(adaptive.address);
  });

  context('registerStandardAndCallback', () => {
    it('ensures the right events were fired', async () => {
      await expect(
        adaptive.registerStandardAndCallback(
          beefInterfaceId,
          callbackSig,
          magicNumber
        )
      )
        .to.emit(adaptive, EVENTS.REGISTERED_STANDARD)
        .withArgs(beefInterfaceId)
        .to.emit(adaptive, EVENTS.REGISTERED_CALLBACK)
        .withArgs(callbackSig, magicNumber);
    });

    it('ensures support the right interfaceID', async () => {
      await expect(await adaptive.supportsInterface(beefInterfaceId)).to.equal(
        true
      );
    });

    it('ensures the right callback was called with the right memory value', async () => {
      await expect(
        signers[0].sendTransaction({
          to: adaptive.address,
          data: callbackSig,
        })
      )
        .to.emit(adaptive, EVENTS.RECEIVED_CALLBACK)
        .withArgs(callbackSig, callbackSig);
    });

    it('reverts with unknown callback', async () => {
      await expect(
        signers[0].sendTransaction({
          to: adaptive.address,
          data: hexDataSlice(id('unknown()'), 0, 4),
        })
      ).to.be.revertedWith(
        customError('AdapERC165UnkownCallback', unregisteredNumberReturn)
      );
    });

    it('returns the correct value from handleCallback assembly', async () => {
      await expect(adaptiveHelper.handleCallback(callbackSig))
        .to.emit(adaptiveHelper, EVENTS.RECEIVED_CALLBACK)
        .withArgs(magicNumberReturn);
    });
  });

  context('ERC-165', () => {
    const ERC165_INTERFACE_ID = '0x01ffc9a7';

    it('supports ERC-165', async () => {
      expect(await adaptive.supportsInterface(ERC165_INTERFACE_ID)).to.equal(
        true
      );
    });

    it("doesn't support random interfaceID", async () => {
      expect(await adaptive.supportsInterface('0xabababab')).to.equal(false);
    });
  });
});
