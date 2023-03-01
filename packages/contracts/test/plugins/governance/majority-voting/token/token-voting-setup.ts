import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {ERC20, TokenVotingSetup} from '../../../../../typechain';
import {deployNewDAO} from '../../../../test-utils/dao';
import {getInterfaceID} from '../../../../test-utils/interfaces';
import {Operation} from '../../../../../utils/types';
import metadata from '../../../../../src/plugins/governance/majority-voting/token/build-metadata.json';

import {
  VotingSettings,
  VotingMode,
  pctToRatio,
  ONE_HOUR,
} from '../../../../test-utils/voting';
import {tokenVotingInterface} from './token-voting';

let defaultData: any;
let defaultVotingSettings: VotingSettings;
let defaultTokenSettings: {addr: string; name: string; symbol: string};
let defaultMintSettings: {receivers: string[]; amounts: number[]};

const abiCoder = ethers.utils.defaultAbiCoder;
const AddressZero = ethers.constants.AddressZero;
const EMPTY_DATA = '0x';

const prepareInstallationDataTypes =
  metadata.pluginSetupABI.prepareInstallation;

const tokenName = 'name';
const tokenSymbol = 'symbol';
const merkleMintToAddressArray = [ethers.Wallet.createRandom().address];
const merkleMintToAmountArray = [1];

// Permissions
const UPDATE_VOTING_SETTINGS_PERMISSION_ID = ethers.utils.id(
  'UPDATE_VOTING_SETTINGS_PERMISSION'
);
const UPGRADE_PERMISSION_ID = ethers.utils.id('UPGRADE_PLUGIN_PERMISSION');
const EXECUTE_PERMISSION_ID = ethers.utils.id('EXECUTE_PERMISSION');
const MINT_PERMISSION_ID = ethers.utils.id('MINT_PERMISSION');

describe('TokenVotingSetup', function () {
  let signers: SignerWithAddress[];
  let tokenVotingSetup: TokenVotingSetup;
  let implementationAddress: string;
  let targetDao: any;
  let erc20Token: ERC20;

  before(async () => {
    signers = await ethers.getSigners();
    targetDao = await deployNewDAO(signers[0].address);

    defaultVotingSettings = {
      votingMode: VotingMode.EarlyExecution,
      supportThreshold: pctToRatio(50),
      minParticipation: pctToRatio(20),
      minDuration: ONE_HOUR,
      minProposerVotingPower: 0,
    };
    defaultTokenSettings = {addr: AddressZero, name: '', symbol: ''};
    defaultMintSettings = {receivers: [], amounts: []};

    const TokenVotingSetup = await ethers.getContractFactory(
      'TokenVotingSetup'
    );
    tokenVotingSetup = await TokenVotingSetup.deploy();

    implementationAddress = await tokenVotingSetup.implementation();

    const ERC20Token = await ethers.getContractFactory('ERC20');
    erc20Token = await ERC20Token.deploy(tokenName, tokenSymbol);

    defaultData = abiCoder.encode(prepareInstallationDataTypes, [
      Object.values(defaultVotingSettings),
      Object.values(defaultTokenSettings),
      Object.values(defaultMintSettings),
    ]);
  });

  it('does not support the empty interface', async () => {
    expect(await tokenVotingSetup.supportsInterface('0xffffffff')).to.be.false;
  });

  it('creates token voting base with the correct interface', async () => {
    const factory = await ethers.getContractFactory('TokenVoting');
    const tokenVoting = factory.attach(implementationAddress);

    expect(
      await tokenVoting.supportsInterface(getInterfaceID(tokenVotingInterface))
    ).to.be.eq(true);
  });

  describe('prepareInstallation', async () => {
    it('fails if data is empty, or not of minimum length', async () => {
      await expect(
        tokenVotingSetup.prepareInstallation(targetDao.address, EMPTY_DATA)
      ).to.be.reverted;

      await expect(
        tokenVotingSetup.prepareInstallation(
          targetDao.address,
          defaultData.substring(0, defaultData.length - 2)
        )
      ).to.be.reverted;

      await expect(
        tokenVotingSetup.prepareInstallation(targetDao.address, defaultData)
      ).not.to.be.reverted;
    });

    it('fails if `MintSettings` arrays do not have the same length', async () => {
      const receivers: string[] = [AddressZero];
      const amounts: number[] = [];
      const data = abiCoder.encode(prepareInstallationDataTypes, [
        Object.values(defaultVotingSettings),
        Object.values(defaultTokenSettings),
        {receivers: receivers, amounts: amounts},
      ]);

      const nonce = await ethers.provider.getTransactionCount(
        tokenVotingSetup.address
      );
      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: tokenVotingSetup.address,
        nonce,
      });

      const GovernanceERC20 = await ethers.getContractFactory(
        'GovernanceERC20'
      );

      const govToken = GovernanceERC20.attach(anticipatedPluginAddress);

      await expect(
        tokenVotingSetup.prepareInstallation(targetDao.address, data)
      )
        .to.be.revertedWithCustomError(
          govToken,
          'MintSettingsArrayLengthMismatch'
        )
        .withArgs(1, 0);
    });

    it('fails if passed token address is not a contract', async () => {
      const tokenAddress = signers[0].address;
      const data = abiCoder.encode(prepareInstallationDataTypes, [
        Object.values(defaultVotingSettings),
        [tokenAddress, '', ''],
        Object.values(defaultMintSettings),
      ]);

      await expect(
        tokenVotingSetup.prepareInstallation(targetDao.address, data)
      )
        .to.be.revertedWithCustomError(tokenVotingSetup, 'TokenNotContract')
        .withArgs(tokenAddress);
    });

    it('fails if passed token address is not ERC20', async () => {
      const tokenAddress = implementationAddress;
      const data = abiCoder.encode(prepareInstallationDataTypes, [
        Object.values(defaultVotingSettings),
        [tokenAddress, '', ''],
        Object.values(defaultMintSettings),
      ]);

      await expect(
        tokenVotingSetup.prepareInstallation(targetDao.address, data)
      )
        .to.be.revertedWithCustomError(tokenVotingSetup, 'TokenNotERC20')
        .withArgs(tokenAddress);
    });

    it('correctly returns plugin, helpers and permissions, when an ERC20 token address is supplied', async () => {
      const nonce = await ethers.provider.getTransactionCount(
        tokenVotingSetup.address
      );
      const anticipatedWrappedTokenAddress = ethers.utils.getContractAddress({
        from: tokenVotingSetup.address,
        nonce: nonce,
      });
      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: tokenVotingSetup.address,
        nonce: nonce + 1,
      });

      const data = abiCoder.encode(prepareInstallationDataTypes, [
        Object.values(defaultVotingSettings),
        [erc20Token.address, tokenName, tokenSymbol],
        Object.values(defaultMintSettings),
      ]);

      const {
        plugin,
        preparedSetupData: {helpers, permissions},
      } = await tokenVotingSetup.callStatic.prepareInstallation(
        targetDao.address,
        data
      );

      expect(plugin).to.be.equal(anticipatedPluginAddress);
      expect(helpers.length).to.be.equal(1);
      expect(helpers).to.be.deep.equal([anticipatedWrappedTokenAddress]);
      expect(permissions.length).to.be.equal(3);
      expect(permissions).to.deep.equal([
        [
          Operation.Grant,
          plugin,
          targetDao.address,
          AddressZero,
          UPDATE_VOTING_SETTINGS_PERMISSION_ID,
        ],
        [
          Operation.Grant,
          plugin,
          targetDao.address,
          AddressZero,
          UPGRADE_PERMISSION_ID,
        ],
        [
          Operation.Grant,
          targetDao.address,
          plugin,
          AddressZero,
          EXECUTE_PERMISSION_ID,
        ],
      ]);
    });

    it('correctly sets up `GovernanceWrappedERC20` helper, when an ERC20 token address is supplied', async () => {
      const nonce = await ethers.provider.getTransactionCount(
        tokenVotingSetup.address
      );
      const anticipatedWrappedTokenAddress = ethers.utils.getContractAddress({
        from: tokenVotingSetup.address,
        nonce: nonce,
      });

      const data = abiCoder.encode(prepareInstallationDataTypes, [
        Object.values(defaultVotingSettings),
        [erc20Token.address, tokenName, tokenSymbol],
        Object.values(defaultMintSettings),
      ]);

      await tokenVotingSetup.prepareInstallation(targetDao.address, data);

      const GovernanceWrappedERC20Factory = await ethers.getContractFactory(
        'GovernanceWrappedERC20'
      );
      const governanceWrappedERC20Contract =
        GovernanceWrappedERC20Factory.attach(anticipatedWrappedTokenAddress);

      expect(await governanceWrappedERC20Contract.name()).to.be.equal(
        tokenName
      );
      expect(await governanceWrappedERC20Contract.symbol()).to.be.equal(
        tokenSymbol
      );

      expect(await governanceWrappedERC20Contract.underlying()).to.be.equal(
        erc20Token.address
      );
    });

    it('correctly returns plugin, helpers and permissions, when a governance token address is supplied', async () => {
      const GovernanceERC20 = await ethers.getContractFactory(
        'GovernanceERC20'
      );
      const governanceERC20 = await GovernanceERC20.deploy(
        targetDao.address,
        'name',
        'symbol',
        {receivers: [], amounts: []}
      );

      const nonce = await ethers.provider.getTransactionCount(
        tokenVotingSetup.address
      );

      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: tokenVotingSetup.address,
        nonce: nonce,
      });

      const data = abiCoder.encode(prepareInstallationDataTypes, [
        Object.values(defaultVotingSettings),
        [governanceERC20.address, '', ''],
        Object.values(defaultMintSettings),
      ]);

      const {
        plugin,
        preparedSetupData: {helpers, permissions},
      } = await tokenVotingSetup.callStatic.prepareInstallation(
        targetDao.address,
        data
      );

      expect(plugin).to.be.equal(anticipatedPluginAddress);
      expect(helpers.length).to.be.equal(1);
      expect(helpers).to.be.deep.equal([governanceERC20.address]);
      expect(permissions.length).to.be.equal(3);
      expect(permissions).to.deep.equal([
        [
          Operation.Grant,
          plugin,
          targetDao.address,
          AddressZero,
          UPDATE_VOTING_SETTINGS_PERMISSION_ID,
        ],
        [
          Operation.Grant,
          plugin,
          targetDao.address,
          AddressZero,
          UPGRADE_PERMISSION_ID,
        ],
        [
          Operation.Grant,
          targetDao.address,
          plugin,
          AddressZero,
          EXECUTE_PERMISSION_ID,
        ],
      ]);
    });

    it('correctly returns plugin, helpers and permissions, when a token address is not supplied', async () => {
      const nonce = await ethers.provider.getTransactionCount(
        tokenVotingSetup.address
      );
      const anticipatedTokenAddress = ethers.utils.getContractAddress({
        from: tokenVotingSetup.address,
        nonce: nonce,
      });

      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: tokenVotingSetup.address,
        nonce: nonce + 1,
      });

      const {
        plugin,
        preparedSetupData: {helpers, permissions},
      } = await tokenVotingSetup.callStatic.prepareInstallation(
        targetDao.address,
        defaultData
      );

      expect(plugin).to.be.equal(anticipatedPluginAddress);
      expect(helpers.length).to.be.equal(1);
      expect(helpers).to.be.deep.equal([anticipatedTokenAddress]);
      expect(permissions.length).to.be.equal(4);
      expect(permissions).to.deep.equal([
        [
          Operation.Grant,
          plugin,
          targetDao.address,
          AddressZero,
          UPDATE_VOTING_SETTINGS_PERMISSION_ID,
        ],
        [
          Operation.Grant,
          plugin,
          targetDao.address,
          AddressZero,
          UPGRADE_PERMISSION_ID,
        ],
        [
          Operation.Grant,
          targetDao.address,
          plugin,
          AddressZero,
          EXECUTE_PERMISSION_ID,
        ],
        [
          Operation.Grant,
          anticipatedTokenAddress,
          targetDao.address,
          AddressZero,
          MINT_PERMISSION_ID,
        ],
      ]);
    });

    it('correctly sets up the plugin and helpers, when a token address is not passed', async () => {
      const daoAddress = targetDao.address;

      const data = abiCoder.encode(prepareInstallationDataTypes, [
        Object.values(defaultVotingSettings),
        [AddressZero, tokenName, tokenSymbol],
        [merkleMintToAddressArray, merkleMintToAmountArray],
      ]);

      const nonce = await ethers.provider.getTransactionCount(
        tokenVotingSetup.address
      );
      const anticipatedTokenAddress = ethers.utils.getContractAddress({
        from: tokenVotingSetup.address,
        nonce: nonce,
      });
      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: tokenVotingSetup.address,
        nonce: nonce + 1,
      });

      await tokenVotingSetup.prepareInstallation(daoAddress, data);

      // check plugin
      const PluginFactory = await ethers.getContractFactory('TokenVoting');
      const tokenVoting = PluginFactory.attach(anticipatedPluginAddress);

      expect(await tokenVoting.dao()).to.be.equal(daoAddress);

      expect(await tokenVoting.minParticipation()).to.be.equal(
        defaultVotingSettings.minParticipation
      );
      expect(await tokenVoting.supportThreshold()).to.be.equal(
        defaultVotingSettings.supportThreshold
      );
      expect(await tokenVoting.minDuration()).to.be.equal(
        defaultVotingSettings.minDuration
      );
      expect(await tokenVoting.minProposerVotingPower()).to.be.equal(
        defaultVotingSettings.minProposerVotingPower
      );
      expect(await tokenVoting.getVotingToken()).to.be.equal(
        anticipatedTokenAddress
      );

      // check helpers
      const GovernanceTokenFactory = await ethers.getContractFactory(
        'GovernanceERC20'
      );
      const governanceTokenContract = GovernanceTokenFactory.attach(
        anticipatedTokenAddress
      );

      expect(await governanceTokenContract.dao()).to.be.equal(daoAddress);
      expect(await governanceTokenContract.name()).to.be.equal(tokenName);
      expect(await governanceTokenContract.symbol()).to.be.equal(tokenSymbol);
    });
  });

  describe('prepareUninstallation', async () => {
    it('fails when the wrong number of helpers is supplied', async () => {
      const plugin = ethers.Wallet.createRandom().address;

      await expect(
        tokenVotingSetup.prepareUninstallation(targetDao.address, {
          plugin,
          currentHelpers: [],
          data: EMPTY_DATA,
        })
      )
        .to.be.revertedWithCustomError(
          tokenVotingSetup,
          'WrongHelpersArrayLength'
        )
        .withArgs(0);

      await expect(
        tokenVotingSetup.prepareUninstallation(targetDao.address, {
          plugin,
          currentHelpers: [AddressZero, AddressZero, AddressZero],
          data: EMPTY_DATA,
        })
      )
        .to.be.revertedWithCustomError(
          tokenVotingSetup,
          'WrongHelpersArrayLength'
        )
        .withArgs(3);
    });

    it('correctly returns permissions, when the required number of helpers is supplied', async () => {
      const plugin = ethers.Wallet.createRandom().address;
      const GovernanceERC20 = await ethers.getContractFactory(
        'GovernanceERC20'
      );
      const GovernanceWrappedERC20 = await ethers.getContractFactory(
        'GovernanceWrappedERC20'
      );
      const governanceERC20 = await GovernanceERC20.deploy(
        targetDao.address,
        tokenName,
        tokenSymbol,
        {receivers: [], amounts: []}
      );

      const governanceWrappedERC20 = await GovernanceWrappedERC20.deploy(
        governanceERC20.address,
        tokenName,
        tokenSymbol
      );

      // When the helpers contain governanceWrappedERC20 token
      const permissions1 =
        await tokenVotingSetup.callStatic.prepareUninstallation(
          targetDao.address,
          {
            plugin,
            currentHelpers: [governanceWrappedERC20.address],
            data: EMPTY_DATA,
          }
        );

      const essentialPermissions = [
        [
          Operation.Revoke,
          plugin,
          targetDao.address,
          AddressZero,
          UPDATE_VOTING_SETTINGS_PERMISSION_ID,
        ],
        [
          Operation.Revoke,
          plugin,
          targetDao.address,
          AddressZero,
          UPGRADE_PERMISSION_ID,
        ],
        [
          Operation.Revoke,
          targetDao.address,
          plugin,
          AddressZero,
          EXECUTE_PERMISSION_ID,
        ],
      ];

      expect(permissions1.length).to.be.equal(3);
      expect(permissions1).to.deep.equal([...essentialPermissions]);

      const permissions2 =
        await tokenVotingSetup.callStatic.prepareUninstallation(
          targetDao.address,
          {
            plugin,
            currentHelpers: [governanceERC20.address],
            data: EMPTY_DATA,
          }
        );

      expect(permissions2.length).to.be.equal(4);
      expect(permissions2).to.deep.equal([
        ...essentialPermissions,
        [
          Operation.Revoke,
          governanceERC20.address,
          targetDao.address,
          AddressZero,
          MINT_PERMISSION_ID,
        ],
      ]);
    });
  });
});
