import chai, {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {DAO, GovernanceERC20, DAO__factory} from '../../typechain';
import {findEvent, DAO_EVENTS} from '../../utils/event';
import {ERRORS, customError} from '../test-utils/custom-error-helper';
import {getInterfaceID} from '../test-utils/interfaces';
import {IERC1271__factory} from '../../typechain/factories/IERC1271__factory';
import {smock} from '@defi-wonderland/smock';

chai.use(smock.matchers);

const abiCoder = ethers.utils.defaultAbiCoder;

const dummyAddress1 = '0x0000000000000000000000000000000000000001';
const dummyAddress2 = '0x0000000000000000000000000000000000000002';
const dummyMetadata1 = '0x0001';
const dummyMetadata2 = '0x0002';

const EVENTS = {
  MetadataSet: 'MetadataSet',
  TrustedForwarderSet: 'TrustedForwarderSet',
  DAOCreated: 'DAOCreated',
  Granted: 'Granted',
  Revoked: 'Revoked',
  Deposited: 'Deposited',
  Withdrawn: 'Withdrawn',
  Executed: 'Executed',
  NativeTokenDeposited: 'NativeTokenDeposited',
  SignatureValidatorSet: 'SignatureValidatorSet',
  StandardCallbackRegistered: 'StandardCallbackRegistered',
};

const PERMISSION_IDS = {
  UPGRADE_DAO_PERMISSION_ID: ethers.utils.id('UPGRADE_DAO_PERMISSION'),
  SET_METADATA_PERMISSION_ID: ethers.utils.id('SET_METADATA_PERMISSION'),
  EXECUTE_PERMISSION_ID: ethers.utils.id('EXECUTE_PERMISSION'),
  WITHDRAW_PERMISSION_ID: ethers.utils.id('WITHDRAW_PERMISSION'),
  SET_SIGNATURE_VALIDATOR_PERMISSION_ID: ethers.utils.id(
    'SET_SIGNATURE_VALIDATOR_PERMISSION'
  ),
  SET_TRUSTED_FORWARDER_PERMISSION_ID: ethers.utils.id(
    'SET_TRUSTED_FORWARDER_PERMISSION'
  ),
  MINT_PERMISSION_ID: ethers.utils.id('MINT_PERMISSION'),
  REGISTER_STANDARD_CALLBACK_PERMISSION_ID: ethers.utils.id(
    'REGISTER_STANDARD_CALLBACK_PERMISSION'
  ),
};

describe('DAO-1', function () {
  let signers: SignerWithAddress[];
  let ownerAddress: string;
  let dao: DAO;
  let token: GovernanceERC20;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();

    const DAO = await ethers.getContractFactory('DAO');

    dao = await DAO.deploy();
    await dao.initialize(dummyMetadata1, ownerAddress, dummyAddress1);

    const Token = await ethers.getContractFactory('GovernanceERC20');
    token = await Token.deploy(dao.address, 'GOV', 'GOV', {
      receivers: [],
      amounts: [],
    });

    // Grant permissions
    await Promise.all([
      dao.grant(
        dao.address,
        ownerAddress,
        PERMISSION_IDS.SET_METADATA_PERMISSION_ID
      ),
      dao.grant(
        dao.address,
        ownerAddress,
        PERMISSION_IDS.EXECUTE_PERMISSION_ID
      ),
      dao.grant(
        dao.address,
        ownerAddress,
        PERMISSION_IDS.WITHDRAW_PERMISSION_ID
      ),
      dao.grant(
        dao.address,
        ownerAddress,
        PERMISSION_IDS.UPGRADE_DAO_PERMISSION_ID
      ),
      dao.grant(
        dao.address,
        ownerAddress,
        PERMISSION_IDS.SET_SIGNATURE_VALIDATOR_PERMISSION_ID
      ),
      dao.grant(
        dao.address,
        ownerAddress,
        PERMISSION_IDS.SET_TRUSTED_FORWARDER_PERMISSION_ID
      ),
      dao.grant(
        dao.address,
        ownerAddress,
        PERMISSION_IDS.REGISTER_STANDARD_CALLBACK_PERMISSION_ID
      ),
      dao.grant(token.address, ownerAddress, PERMISSION_IDS.MINT_PERMISSION_ID),
    ]);
  });

  // @ts-ignore
  const setIndex = (index: number, num: ethers.BigNumber) => {
    const mask = ethers.BigNumber.from(1).shl(index & 0xff);
    return num.or(mask);
  };
  // @ts-ignore
  const getIndex = (index: number, num: ethers.BigNumber) => {
    const mask = ethers.BigNumber.from(1).shl(index & 0xff);
    return !num.and(mask).eq(0);
  };

  describe('execute:', async () => {
    const dummyActions = [
      {
        to: dummyAddress1,
        data: dummyMetadata1,
        value: 0,
      },
    ];
    const expectedDummyResults = ['0x'];

    it('reverts if one of the actions failed', async () => {
      const ActionExecuteFactory = await smock.mock('ActionExecute');
      const actionExecute = await ActionExecuteFactory.deploy();
        
      let num = ethers.BigNumber.from(0);
      num = setIndex(1, num);
      num = setIndex(7, num);
      num = setIndex(4, num);
      console.log(num);

      console.log(getIndex(1, num),getIndex(2,num), getIndex(7,num));

    //   10010010

    //   2 + 16 + 128
      await expect(
        dao.execute(0, [
          {
            to: actionExecute.address,
            data: '0x0000',
            value: 0,
          },
        ], "1".repeat(255))
      ).to.be.revertedWith(customError('ActionFailed'));


    });
  });

});