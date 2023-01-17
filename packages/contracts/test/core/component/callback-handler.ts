import {expect} from 'chai';
import {ethers } from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {hexDataSlice, id} from 'ethers/lib/utils';

import {DAO, CallbackHandlerMockHelper} from '../../../typechain';
import {deployWithProxy} from '../../test-utils/proxy'

const EVENTS = {
  STANDARD_CALLBACK_REGISTERED: 'StandardCallbackRegistered',
  CALLBACK_RECEIVED: 'CallbackReceived',
};

const REGISTER_STANDARD_CALLBACK_PERMISSION_ID = ethers.utils.id(
  'REGISTER_STANDARD_CALLBACK_PERMISSION'
);

const beefInterfaceId = '0xbeefbeef';
const callbackSelector = hexDataSlice(id('callbackFunc()'), 0, 4); // 0x1eb2075a
const magicNumber = `0x1${'0'.repeat(7)}`;
const magicNumberReturn = `0x1${'0'.repeat(63)}`;
export const UNREGISTERED_INTERFACE_RETURN = `0x${'0'.repeat(64)}`;

describe('CallbackHandler', function () {
  let signers: SignerWithAddress[];
  let owner: string;
  let dao: DAO;
  let callbackHandlerMockHelper: CallbackHandlerMockHelper;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    owner = await signers[0].getAddress();
    const DAO = await ethers.getContractFactory('DAO');
    const CallbackHandlerHelper = await ethers.getContractFactory(
      'CallbackHandlerMockHelper'
    );

    dao = await deployWithProxy(DAO);

    dao.initialize('0x', owner, ethers.constants.AddressZero, 'https://example.com');
    dao.grant(dao.address, owner, REGISTER_STANDARD_CALLBACK_PERMISSION_ID);

    callbackHandlerMockHelper = await CallbackHandlerHelper.deploy(dao.address);
  });

  it('reverts for an unknown callback function signature', async () => {
    // we don't register `callbackSelector` here
    await expect(
      signers[0].sendTransaction({
        to: dao.address,
        data: callbackSelector,
      })
    )
      .to.be.revertedWithCustomError(dao, 'UnkownCallback')
      .withArgs(callbackSelector, UNREGISTERED_INTERFACE_RETURN);
  });

  it('emits the `StandardCallbackRegistered` event', async () => {
    await expect(
      dao.registerStandardCallback(
        beefInterfaceId,
        callbackSelector,
        magicNumber
      )
    )
      .to.emit(dao, EVENTS.STANDARD_CALLBACK_REGISTERED)
      .withArgs(beefInterfaceId, callbackSelector, magicNumber);
  });

  it('returns the correct magic number from the `_handleCallback` assembly code', async () => {
    await dao.registerStandardCallback(
      beefInterfaceId,
      callbackSelector,
      magicNumber
    );

    expect(
      await callbackHandlerMockHelper.callStatic.handleCallback(
        callbackSelector
      )
    ).to.be.equal(magicNumberReturn);
  });
});
