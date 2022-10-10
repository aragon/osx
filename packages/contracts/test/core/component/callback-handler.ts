import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {hexDataSlice, id} from 'ethers/lib/utils';

import {
  CallbackHandlerMock,
  CallbackHandlerMockHelper,
} from '../../../typechain';
import {customError} from '../../test-utils/custom-error-helper';

const EVENTS = {
  CALLBACK_REGISTERED: 'CallbackRegistered',
  CALLBACK_RECEIVED: 'CallbackReceived',
};

const callbackSelector = hexDataSlice(id('callbackFunc()'), 0, 4); // 0x1eb2075a
const magicNumber = '0x10000000';
const magicNumberReturn = magicNumber + '0'.repeat(56);
const unregisteredNumberReturn = '0x' + '0'.repeat(64);

describe('CallbackHandler', function () {
  let signers: SignerWithAddress[];
  let callbackHandlerMock: CallbackHandlerMock;
  let callbackHandlerMockHelper: CallbackHandlerMockHelper;

  before(async () => {
    signers = await ethers.getSigners();
    const CallbackHandlerMock = await ethers.getContractFactory(
      'CallbackHandlerMock'
    );
    const CallbackHandlerHelper = await ethers.getContractFactory(
      'CallbackHandlerMockHelper'
    );

    callbackHandlerMock = await CallbackHandlerMock.deploy();
    callbackHandlerMockHelper = await CallbackHandlerHelper.deploy(
      callbackHandlerMock.address
    );
  });

  context('registerStandardCallback', () => {
    it('emits the `CallbackRegistered` event', async () => {
      await expect(
        callbackHandlerMock.registerStandardCallback(
          callbackSelector,
          magicNumber
        )
      )
        .to.emit(callbackHandlerMock, EVENTS.CALLBACK_REGISTERED)
        .withArgs(callbackSelector, magicNumber);
    });

    it('emits the `CallbackReceived` event with the correct magic number', async () => {
      await expect(
        signers[0].sendTransaction({
          to: callbackHandlerMock.address,
          data: callbackSelector,
        })
      )
        .to.emit(callbackHandlerMock, EVENTS.CALLBACK_RECEIVED)
        .withArgs(callbackSelector, callbackSelector);
    });

    it('reverts for an unknown callback function signature', async () => {
      const functionSelector = hexDataSlice(id('unknown()'), 0, 4);
      await expect(
        signers[0].sendTransaction({
          to: callbackHandlerMock.address,
          data: functionSelector,
        })
      ).to.be.revertedWith(
        customError(
          'UnkownCallback',
          functionSelector,
          unregisteredNumberReturn
        )
      );
    });

    it('returns the correct value from the `_handleCallback` assembly code', async () => {
      await expect(callbackHandlerMockHelper.handleCallback(callbackSelector))
        .to.emit(callbackHandlerMockHelper, EVENTS.CALLBACK_RECEIVED)
        .withArgs(magicNumberReturn);
    });
  });
});
