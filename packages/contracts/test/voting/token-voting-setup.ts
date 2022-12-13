import {expect} from 'chai';
import {ethers} from 'hardhat';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {ERC20, TokenVotingSetup} from '../../typechain';
import {customError} from '../test-utils/custom-error-helper';
import {deployNewDAO} from '../test-utils/dao';
import {getInterfaceID} from '../test-utils/interfaces';
import {ONE_HOUR} from '../test-utils/voting';

enum Op {
  Grant,
  Revoke,
  Freeze,
  GrantWithOracle,
}

const abiCoder = ethers.utils.defaultAbiCoder;
const AddressZero = ethers.constants.AddressZero;
const EMPTY_DATA = '0x';

const prepareInstallDataTypes = [
  'uint64',
  'uint64',
  'uint64',
  'uint256',
  'tuple(address,string,string)',
  'tuple(address[],uint256[])',
];

const minParticipation = 25;
const supportThreshold = 50;
const minDuration = ONE_HOUR;
const minProposerVotingPower = 1;

// minimum bytes for `prepareInstallation` data param.
const MINIMUM_DATA = abiCoder.encode(prepareInstallDataTypes, [
  supportThreshold,
  minParticipation,
  minDuration,
  minProposerVotingPower,
  [AddressZero, '', ''],
  [[], []],
]);

const tokenName = 'name';
const tokenSymbol = 'symbol';
const merkleMintToAddressArray = [ethers.Wallet.createRandom().address];
const merkleMintToAmountArray = [1];

// Permissions
const CHANGE_VOTE_SETTINGS_PERMISSION_ID = ethers.utils.id(
  'CHANGE_VOTE_SETTINGS_PERMISSION'
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

    const TokenVotingSetup = await ethers.getContractFactory(
      'TokenVotingSetup'
    );
    tokenVotingSetup = await TokenVotingSetup.deploy();

    implementationAddress = await tokenVotingSetup.getImplementationAddress();

    const ERC20Token = await ethers.getContractFactory('ERC20');
    erc20Token = await ERC20Token.deploy(tokenName, tokenSymbol);
  });

  it('creates token voting base with the correct interface', async () => {
    const factory = await ethers.getContractFactory('TokenVoting');
    const tokenVoting = factory.attach(implementationAddress);

    const iface = new ethers.utils.Interface([
      'function getVotingToken() returns (address)',
      'function initialize(address _dao, uint64 _supportThreshold, uint64 _minParticipation, uint64 _minDuration, uint256 minProposerVotingPower, address _token)',
    ]);

    expect(await tokenVoting.supportsInterface(getInterfaceID(iface))).to.be.eq(
      true
    );
  });

  describe('prepareInstallation', async () => {
    it('correctly returns prepare installation data abi', async () => {
      // Human-Readable Abi of data param of `prepareInstallation`.
      const dataHRABI =
        '(uint64 supportThreshold, uint64 minParticipation, uint64 minDuration, uint256 minProposerVotingPower, tuple(address addr, string name, string symbol) tokenSettings, tuple(address[] receivers, uint256[] amounts) mintSettings)';

      expect(await tokenVotingSetup.prepareInstallationDataABI()).to.be.eq(
        dataHRABI
      );
    });

    it('fails if data is empty, or not of minimum length', async () => {
      await expect(
        tokenVotingSetup.prepareInstallation(targetDao.address, EMPTY_DATA)
      ).to.be.reverted;

      await expect(
        tokenVotingSetup.prepareInstallation(
          targetDao.address,
          MINIMUM_DATA.substring(0, MINIMUM_DATA.length - 2)
        )
      ).to.be.reverted;

      await expect(
        tokenVotingSetup.prepareInstallation(targetDao.address, MINIMUM_DATA)
      ).not.to.be.reverted;
    });

    it('fails if `MintSettings` arrays do not have the same length', async () => {
      const data = abiCoder.encode(prepareInstallDataTypes, [
        supportThreshold,
        minParticipation,
        minDuration,
        minProposerVotingPower,
        [AddressZero, '', ''],
        [[AddressZero], []],
      ]);

      await expect(
        tokenVotingSetup.prepareInstallation(targetDao.address, data)
      ).to.be.revertedWith(customError('MintArrayLengthMismatch', 1, 0));
    });

    it('fails if passed token address is not a contract', async () => {
      const tokenAddress = signers[0].address;
      const data = abiCoder.encode(prepareInstallDataTypes, [
        supportThreshold,
        minParticipation,
        minDuration,
        minProposerVotingPower,
        [tokenAddress, '', ''],
        [[], []],
      ]);

      await expect(
        tokenVotingSetup.prepareInstallation(targetDao.address, data)
      ).to.be.revertedWith(customError('TokenNotContract', tokenAddress));
    });

    it('fails if passed token address is not ERC20', async () => {
      const tokenAddress = implementationAddress;
      const data = abiCoder.encode(prepareInstallDataTypes, [
        supportThreshold,
        minParticipation,
        minDuration,
        minProposerVotingPower,
        [tokenAddress, '', ''],
        [[], []],
      ]);

      await expect(
        tokenVotingSetup.prepareInstallation(targetDao.address, data)
      ).to.be.revertedWith(customError('TokenNotERC20', tokenAddress));
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

      const data = abiCoder.encode(prepareInstallDataTypes, [
        supportThreshold,
        minParticipation,
        minDuration,
        minProposerVotingPower,
        [erc20Token.address, tokenName, tokenSymbol],
        [[], []],
      ]);

      const {plugin, helpers, permissions} =
        await tokenVotingSetup.callStatic.prepareInstallation(
          targetDao.address,
          data
        );

      expect(plugin).to.be.equal(anticipatedPluginAddress);
      expect(helpers.length).to.be.equal(1);
      expect(helpers).to.be.deep.equal([anticipatedWrappedTokenAddress]);
      expect(permissions.length).to.be.equal(3);
      expect(permissions).to.deep.equal([
        [
          Op.Grant,
          plugin,
          targetDao.address,
          AddressZero,
          CHANGE_VOTE_SETTINGS_PERMISSION_ID,
        ],
        [
          Op.Grant,
          plugin,
          targetDao.address,
          AddressZero,
          UPGRADE_PERMISSION_ID,
        ],
        [
          Op.Grant,
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

      const data = abiCoder.encode(prepareInstallDataTypes, [
        supportThreshold,
        minParticipation,
        minDuration,
        minProposerVotingPower,
        [erc20Token.address, tokenName, tokenSymbol],
        [[], []],
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

      const data = abiCoder.encode(prepareInstallDataTypes, [
        supportThreshold,
        minParticipation,
        minDuration,
        minProposerVotingPower,
        [governanceERC20.address, '', ''],
        [[], []],
      ]);

      const {plugin, helpers, permissions} =
        await tokenVotingSetup.callStatic.prepareInstallation(
          targetDao.address,
          data
        );

      expect(plugin).to.be.equal(anticipatedPluginAddress);
      expect(helpers.length).to.be.equal(1);
      expect(helpers).to.be.deep.equal([governanceERC20.address]);
      expect(permissions.length).to.be.equal(3);
      expect(permissions).to.deep.equal([
        [
          Op.Grant,
          plugin,
          targetDao.address,
          AddressZero,
          CHANGE_VOTE_SETTINGS_PERMISSION_ID,
        ],
        [
          Op.Grant,
          plugin,
          targetDao.address,
          AddressZero,
          UPGRADE_PERMISSION_ID,
        ],
        [
          Op.Grant,
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

      const {plugin, helpers, permissions} =
        await tokenVotingSetup.callStatic.prepareInstallation(
          targetDao.address,
          MINIMUM_DATA
        );

      expect(plugin).to.be.equal(anticipatedPluginAddress);
      expect(helpers.length).to.be.equal(1);
      expect(helpers).to.be.deep.equal([anticipatedTokenAddress]);
      expect(permissions.length).to.be.equal(4);
      expect(permissions).to.deep.equal([
        [
          Op.Grant,
          plugin,
          targetDao.address,
          AddressZero,
          CHANGE_VOTE_SETTINGS_PERMISSION_ID,
        ],
        [
          Op.Grant,
          plugin,
          targetDao.address,
          AddressZero,
          UPGRADE_PERMISSION_ID,
        ],
        [
          Op.Grant,
          targetDao.address,
          plugin,
          AddressZero,
          EXECUTE_PERMISSION_ID,
        ],
        [
          Op.Grant,
          anticipatedTokenAddress,
          targetDao.address,
          AddressZero,
          MINT_PERMISSION_ID,
        ],
      ]);
    });

    it('correctly sets up the plugin and helpers, when a token address is not passed', async () => {
      const daoAddress = targetDao.address;

      const data = abiCoder.encode(prepareInstallDataTypes, [
        supportThreshold,
        minParticipation,
        minDuration,
        minProposerVotingPower,
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

      expect(await tokenVoting.getDAO()).to.be.equal(daoAddress);
      expect(await tokenVoting.minParticipation()).to.be.equal(
        minParticipation
      );
      expect(await tokenVoting.supportThreshold()).to.be.equal(
        supportThreshold
      );
      expect(await tokenVoting.minDuration()).to.be.equal(minDuration);
      expect(await tokenVoting.minProposerVotingPower()).to.be.equal(
        minProposerVotingPower
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

      expect(await governanceTokenContract.getDAO()).to.be.equal(daoAddress);
      expect(await governanceTokenContract.name()).to.be.equal(tokenName);
      expect(await governanceTokenContract.symbol()).to.be.equal(tokenSymbol);
    });
  });

  describe('prepareUninstallation', async () => {
    it('correctly returns prepare uninstallation data abi', async () => {
      // Human-Readable Abi of data param of `prepareUninstallation`.
      const dataHRABI = '';

      expect(await tokenVotingSetup.prepareUninstallationDataABI()).to.be.eq(
        dataHRABI
      );
    });

    it('fails when the wrong number of helpers is supplied', async () => {
      const plugin = ethers.Wallet.createRandom().address;

      await expect(
        tokenVotingSetup.prepareUninstallation(
          targetDao.address,
          plugin,
          [],
          EMPTY_DATA
        )
      ).to.be.revertedWith(customError('WrongHelpersArrayLength', 0));

      await expect(
        tokenVotingSetup.prepareUninstallation(
          targetDao.address,
          plugin,
          [AddressZero, AddressZero, AddressZero],
          EMPTY_DATA
        )
      ).to.be.revertedWith(customError('WrongHelpersArrayLength', 3));
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
          plugin,
          [governanceWrappedERC20.address],
          EMPTY_DATA
        );

      const essentialPermissions = [
        [
          Op.Revoke,
          plugin,
          targetDao.address,
          AddressZero,
          CHANGE_VOTE_SETTINGS_PERMISSION_ID,
        ],
        [
          Op.Revoke,
          plugin,
          targetDao.address,
          AddressZero,
          UPGRADE_PERMISSION_ID,
        ],
        [
          Op.Revoke,
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
          plugin,
          [governanceERC20.address],
          EMPTY_DATA
        );

      expect(permissions2.length).to.be.equal(4);
      expect(permissions2).to.deep.equal([
        ...essentialPermissions,
        [
          Op.Revoke,
          governanceERC20.address,
          targetDao.address,
          AddressZero,
          MINT_PERMISSION_ID,
        ],
      ]);
    });
  });
});
