import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {defaultAbiCoder, hexDataSlice, id} from 'ethers/lib/utils';

import {CallbackHandlerMockHelper} from '../../../typechain';

const EVENTS = {
  STANDARD_CALLBACK_REGISTERED: 'StandardCallbackRegistered',
  CALLBACK_RECEIVED: 'CallbackReceived',
};

const callbackSelector = hexDataSlice(id('callbackFunc()'), 0, 4); // 0x1eb2075a
const magicNumber = `0x1${'0'.repeat(7)}`;
export const UNREGISTERED_INTERFACE_RETURN = `0x${'00'.repeat(4)}`;

describe('CallbackHandler', function () {
  let signers: SignerWithAddress[];
  let owner: string;
  let callbackHandlerMockHelper: CallbackHandlerMockHelper;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    owner = await signers[0].getAddress();
    const CallbackHandlerHelper = await ethers.getContractFactory(
      'CallbackHandlerMockHelper'
    );

    callbackHandlerMockHelper = await CallbackHandlerHelper.deploy();
  });

  it('reverts for an unknown callback function signature', async () => {
    await expect(
      callbackHandlerMockHelper.handleCallback(callbackSelector, '0x')
    )
      .to.be.revertedWithCustomError(
        callbackHandlerMockHelper,
        'UnkownCallback'
      )
      .withArgs(callbackSelector, UNREGISTERED_INTERFACE_RETURN);
  });

  it('returns the correct magic number from the `_handleCallback`', async () => {
    await callbackHandlerMockHelper.registerCallback(
      callbackSelector,
      magicNumber
    );

    expect(
      await callbackHandlerMockHelper.callStatic.handleCallback(
        callbackSelector,
        '0x'
      )
    ).to.equal(magicNumber);
  });

  it('correctly emits the received callback event', async () => {
    await callbackHandlerMockHelper.registerCallback(
      callbackSelector,
      magicNumber
    );

    const data = '0x1111';

    await expect(
      callbackHandlerMockHelper.handleCallback(callbackSelector, data)
    )
      .to.emit(callbackHandlerMockHelper, EVENTS.CALLBACK_RECEIVED)
      .withArgs(owner, callbackSelector, data);
  });
});
