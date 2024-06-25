import {expect} from 'chai';
import {BigNumberish} from 'ethers';
import hre, {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  DAOMock,
  CounterV1PluginSetup,
  CounterV2PluginSetup,
  MultiplyHelper,
  CounterV2PluginSetup__factory,
  CounterV1__factory,
  MultiplyHelper__factory,
  CounterV1PluginSetup__factory,
  DAOMock__factory,
} from '../../../typechain';
import {Operation} from '../../../utils/types';

const abiCoder = ethers.utils.defaultAbiCoder;
const AddressZero = ethers.constants.AddressZero;

const EMPTY_DATA = '0x';

// TODO 1. add type GRANT/REVOKE check in permissions
// TODO 2. in order to detect encode abi for deploy/update, use deployABI/updateABI
describe('CounterPluginSetup(Example)', function () {
  let ownerAddress: string;
  let signers: SignerWithAddress[];
  let counterV1Setup: CounterV1PluginSetup;
  let counterV2Setup: CounterV2PluginSetup;
  let implementationAddress: string;
  let daoMock: DAOMock;
  let multiplyPermissionId: string;
  let multiplyHelper: MultiplyHelper;
  let address1: string;
  let address2: string;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
    address1 = await signers[1].getAddress();
    address2 = await signers[2].getAddress();

    daoMock = await hre.wrapper.deploy('DAOMock', {args: [ownerAddress]});

    counterV1Setup = await hre.wrapper.deploy('CounterV1PluginSetup');

    const counterV1 = CounterV1__factory.connect(
      await counterV1Setup.multiplyHelperBase(),
      signers[0]
    );
    multiplyPermissionId = await counterV1.MULTIPLY_PERMISSION_ID();

    implementationAddress = await counterV1Setup.implementation();

    multiplyHelper = await hre.wrapper.deploy('MultiplyHelper');

    counterV2Setup = await hre.wrapper.deploy('CounterV2PluginSetup', {
      args: [multiplyHelper.address],
    });
  });

  describe('prepareInstallation', async () => {
    it('correctly returns permissions/helpers/plugin when helper is passed', async () => {
      const num = 10;

      const data = abiCoder.encode(['address', 'uint256'], [ownerAddress, num]);

      const {
        plugin,
        preparedSetupData: {helpers, permissions},
      } = await counterV1Setup.callStatic.prepareInstallation(
        daoMock.address,
        data
      );

      expect(permissions.length).to.be.equal(2);
      expect(helpers.length).to.be.equal(1);
      expect(plugin).not.to.be.equal(AddressZero);

      expect(permissions).to.deep.equal([
        [
          Operation.Grant,
          daoMock.address,
          plugin,
          AddressZero,
          ethers.utils.id('EXECUTE_PERMISSION'),
        ],
        [
          Operation.Grant,
          plugin,
          daoMock.address,
          AddressZero,
          multiplyPermissionId,
        ],
      ]);
    });

    it('correcly returns permissions/helpers/plugin when helper is NOT passed', async () => {
      const num = 10;

      const data = abiCoder.encode(['address', 'uint256'], [AddressZero, num]);

      const {
        plugin,
        preparedSetupData: {helpers, permissions},
      } = await counterV1Setup.callStatic.prepareInstallation(
        daoMock.address,
        data
      );

      expect(permissions.length).to.be.equal(3);
      expect(helpers.length).to.be.equal(1);
      expect(plugin).not.to.be.equal(AddressZero);

      expect(permissions).to.deep.equal([
        [
          Operation.Grant,
          daoMock.address,
          plugin,
          AddressZero,
          ethers.utils.id('EXECUTE_PERMISSION'),
        ],
        [
          Operation.Grant,
          plugin,
          daoMock.address,
          AddressZero,
          multiplyPermissionId,
        ],
        [
          Operation.Grant,
          helpers[0],
          plugin,
          AddressZero,
          multiplyPermissionId,
        ],
      ]);
    });
  });

  describe('prepareUpdate', async () => {
    it('correcly returns activeHelpers/initData/permissions', async () => {
      const num = 10;
      const data = abiCoder.encode(['uint256'], [num]);
      const plugin = address1;
      const helper = address2;
      const ABI = ['function setNewVariable(uint256 _newVariable)'];
      const iface = new ethers.utils.Interface(ABI);
      const expectedInitData = iface.encodeFunctionData('setNewVariable', [
        num,
      ]);

      const {
        initData,
        preparedSetupData: {permissions, helpers},
      } = await counterV2Setup.callStatic.prepareUpdate(daoMock.address, 1, {
        plugin,
        currentHelpers: [helper],
        data: data,
      });

      expect(helpers.length).to.be.equal(1);
      expect(initData).to.be.equal(expectedInitData);
      expect(permissions).to.deep.equal([
        [
          Operation.Revoke,
          daoMock.address,
          plugin,
          AddressZero,
          multiplyPermissionId,
        ],
      ]);
    });
  });

  describe('prepareUninstallation', async () => {
    it('correcly returns permissions when helper is NOT passed', async () => {
      const permissions = await counterV1Setup.callStatic.prepareUninstallation(
        daoMock.address,
        {
          plugin: address1,
          currentHelpers: [],
          data: EMPTY_DATA,
        }
      );

      expect(permissions).to.deep.equal([
        [
          Operation.Revoke,
          daoMock.address,
          address1,
          AddressZero,
          ethers.utils.id('EXECUTE_PERMISSION'),
        ],
        [
          Operation.Revoke,
          address1,
          daoMock.address,
          AddressZero,
          multiplyPermissionId,
        ],
      ]);
    });

    it('correcly returns permissions when helper is passed.', async () => {
      const plugin = address1;
      const helper = address2;

      const permissions = await counterV1Setup.callStatic.prepareUninstallation(
        daoMock.address,
        {
          plugin,
          currentHelpers: [helper],
          data: EMPTY_DATA,
        }
      );

      expect(permissions).to.deep.equal([
        [
          Operation.Revoke,
          daoMock.address,
          plugin,
          AddressZero,
          ethers.utils.id('EXECUTE_PERMISSION'),
        ],
        [
          Operation.Revoke,
          plugin,
          daoMock.address,
          AddressZero,
          multiplyPermissionId,
        ],
        [Operation.Revoke, helper, plugin, AddressZero, multiplyPermissionId],
      ]);
    });
  });

  // TODO: include more interesting example in CounterV2PluginSetup + add tests below.
});
