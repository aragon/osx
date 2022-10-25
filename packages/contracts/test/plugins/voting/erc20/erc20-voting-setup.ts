import {expect} from 'chai';
import {ethers} from 'hardhat';

import {ERC20, ERC20VotingSetup} from '../../../../typechain';
import {customError} from '../../../test-utils/custom-error-helper';
import {deployNewDAO} from '../../../test-utils/deploy-helpers';
import {getInterfaceID} from '../../../test-utils/interfaces';

enum Op {
  Grant,
  Revoke,
  Freeze,
  GrantWithOracle,
}

const abiCoder = ethers.utils.defaultAbiCoder;
const AddressZero = ethers.constants.AddressZero;
const EMPTY_DATA = '0x';

// minimum bytes for `prepareInstallation` data param.
const MINIMUM_DATA = abiCoder.encode(
  [
    'uint64',
    'uint64',
    'uint64',
    'tuple(address,string,string)',
    'tuple(address[],uint256[])',
  ],
  [1, 1, 1, [AddressZero, '', ''], [[], []]]
);

const participationRequiredPct = 1;
const supportRequiredPct = 2;
const minDuration = 3;
const tokenName = 'name';
const tokenSymbol = 'symbol';
const merkleMintToAddressArray = [ethers.Wallet.createRandom().address];
const merkleMintToAmountArray = [1];

// Permissions
const SET_CONFIGURATION_PERMISSION_ID = ethers.utils.id(
  'SET_CONFIGURATION_PERMISSION'
);
const UPGRADE_PERMISSION_ID = ethers.utils.id('UPGRADE_PLUGIN_PERMISSION');
const EXECUTE_PERMISSION_ID = ethers.utils.id('EXECUTE_PERMISSION');
const MINT_PERMISSION_ID = ethers.utils.id('MINT_PERMISSION');
const MERKLE_MINT_PERMISSION_ID = ethers.utils.id('MERKLE_MINT_PERMISSION');

describe('ERC20VotingSetup', function () {
  let ownerAddress: string;
  let signers: any;
  let erc20VotingSetup: ERC20VotingSetup;
  let implementationAddress: string;
  let targetDao: any;
  let erc20TokenContract: ERC20;

  before(async () => {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
    targetDao = await deployNewDAO(ownerAddress);

    const ERC20VotingSetup = await ethers.getContractFactory(
      'ERC20VotingSetup'
    );
    erc20VotingSetup = await ERC20VotingSetup.deploy();

    implementationAddress = await erc20VotingSetup.getImplementationAddress();

    const ERC20Token = await ethers.getContractFactory('ERC20');
    erc20TokenContract = await ERC20Token.deploy(tokenName, tokenSymbol);
  });

  it('creates erc20 voting base with the correct interface', async () => {
    const factory = await ethers.getContractFactory('ERC20Voting');
    const erc20VotingContract = factory.attach(implementationAddress);

    const iface = new ethers.utils.Interface([
      'function getVotingToken() returns (address)',
      'function initialize(address _dao, uint64 _participationRequiredPct, uint64 _supportRequiredPct, uint64 _minDuration, address _token)',
    ]);

    expect(
      await erc20VotingContract.supportsInterface(getInterfaceID(iface))
    ).to.be.eq(true);
  });

  describe('prepareInstallation', async () => {
    it('correctly returns prepare installation data abi', async () => {
      // Human-Readable Abi of data param of `prepareInstallation`.
      const dataHRABI =
        '(uint64 participationRequiredPct, uint64 supportRequiredPct, uint64 minDuration, tuple(address addr, string name, string symbol) tokenSettings, tuple(address[] receivers, uint256[] amounts) mintSettings)';

      expect(await erc20VotingSetup.prepareInstallationDataABI()).to.be.eq(
        dataHRABI
      );
    });

    it('fails if data is empty, or not of minimum length', async () => {
      await expect(
        erc20VotingSetup.prepareInstallation(targetDao.address, EMPTY_DATA)
      ).to.be.reverted;

      await expect(
        erc20VotingSetup.prepareInstallation(
          targetDao.address,
          MINIMUM_DATA.substring(0, MINIMUM_DATA.length - 2)
        )
      ).to.be.reverted;

      await expect(
        erc20VotingSetup.prepareInstallation(targetDao.address, MINIMUM_DATA)
      ).not.to.be.reverted;
    });

    it('fails if `MintSettings` arrays do not have the same length', async () => {
      const data = abiCoder.encode(
        [
          'uint64',
          'uint64',
          'uint64',
          'tuple(address,string,string)',
          'tuple(address[],uint256[])',
        ],
        [1, 1, 1, [AddressZero, '', ''], [[AddressZero], []]]
      );

      await expect(
        erc20VotingSetup.prepareInstallation(targetDao.address, data)
      ).to.be.revertedWith(customError('MintArrayLengthMismatch', 1, 0));
    });

    it('fails if passed token address is not a contract', async () => {
      const tokenAddress = ownerAddress;
      const data = abiCoder.encode(
        [
          'uint64',
          'uint64',
          'uint64',
          'tuple(address,string,string)',
          'tuple(address[],uint256[])',
        ],
        [1, 1, 1, [tokenAddress, '', ''], [[], []]]
      );

      await expect(
        erc20VotingSetup.prepareInstallation(targetDao.address, data)
      ).to.be.revertedWith(customError('TokenNotContract', tokenAddress));
    });

    it('fails if passed token address is not ERC20', async () => {
      const tokenAddress = implementationAddress;
      const data = abiCoder.encode(
        [
          'uint64',
          'uint64',
          'uint64',
          'tuple(address,string,string)',
          'tuple(address[],uint256[])',
        ],
        [1, 1, 1, [tokenAddress, '', ''], [[], []]]
      );

      await expect(
        erc20VotingSetup.prepareInstallation(targetDao.address, data)
      ).to.be.revertedWith(customError('TokenNotERC20', tokenAddress));
    });

    it('correctly returns plugin, helpers and permissions, when an ERC20 token address is supplied', async () => {
      const nonce = await ethers.provider.getTransactionCount(
        erc20VotingSetup.address
      );
      const anticipatedWrappedTokenAddress = ethers.utils.getContractAddress({
        from: erc20VotingSetup.address,
        nonce: nonce,
      });
      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: erc20VotingSetup.address,
        nonce: nonce + 1,
      });

      const data = abiCoder.encode(
        [
          'uint64',
          'uint64',
          'uint64',
          'tuple(address,string,string)',
          'tuple(address[],uint256[])',
        ],
        [
          1,
          1,
          1,
          [erc20TokenContract.address, tokenName, tokenSymbol],
          [[], []],
        ]
      );

      const {plugin, helpers, permissions} =
        await erc20VotingSetup.callStatic.prepareInstallation(
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
          SET_CONFIGURATION_PERMISSION_ID,
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
        erc20VotingSetup.address
      );
      const anticipatedWrappedTokenAddress = ethers.utils.getContractAddress({
        from: erc20VotingSetup.address,
        nonce: nonce,
      });

      const data = abiCoder.encode(
        [
          'uint64',
          'uint64',
          'uint64',
          'tuple(address,string,string)',
          'tuple(address[],uint256[])',
        ],
        [
          1,
          1,
          1,
          [erc20TokenContract.address, tokenName, tokenSymbol],
          [[], []],
        ]
      );

      await erc20VotingSetup.prepareInstallation(targetDao.address, data);

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
        erc20TokenContract.address
      );
    });

    it('correctly returns plugin, helpers and permissions, when a governance token address is supplied', async () => {
      const GovernanceERC20 = await ethers.getContractFactory(
        'GovernanceERC20'
      );
      const governanceERC20 = await GovernanceERC20.deploy(
        targetDao.address,
        'name',
        'symbol'
      );

      const nonce = await ethers.provider.getTransactionCount(
        erc20VotingSetup.address
      );

      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: erc20VotingSetup.address,
        nonce: nonce,
      });

      const data = abiCoder.encode(
        [
          'uint64',
          'uint64',
          'uint64',
          'tuple(address,string,string)',
          'tuple(address[],uint256[])',
        ],
        [1, 1, 1, [governanceERC20.address, '', ''], [[], []]]
      );

      const {plugin, helpers, permissions} =
        await erc20VotingSetup.callStatic.prepareInstallation(
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
          SET_CONFIGURATION_PERMISSION_ID,
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
        erc20VotingSetup.address
      );
      const anticipatedTokenAddress = ethers.utils.getContractAddress({
        from: erc20VotingSetup.address,
        nonce: nonce,
      });
      const anticipatedMerkleMinterAddress = ethers.utils.getContractAddress({
        from: erc20VotingSetup.address,
        nonce: nonce + 1,
      });
      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: erc20VotingSetup.address,
        nonce: nonce + 2,
      });

      const {plugin, helpers, permissions} =
        await erc20VotingSetup.callStatic.prepareInstallation(
          targetDao.address,
          MINIMUM_DATA
        );

      expect(plugin).to.be.equal(anticipatedPluginAddress);
      expect(helpers.length).to.be.equal(2);
      expect(helpers).to.be.deep.equal([
        anticipatedTokenAddress,
        anticipatedMerkleMinterAddress,
      ]);
      expect(permissions.length).to.be.equal(7);
      expect(permissions).to.deep.equal([
        [
          Op.Grant,
          plugin,
          targetDao.address,
          AddressZero,
          SET_CONFIGURATION_PERMISSION_ID,
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
        [
          Op.Grant,
          anticipatedTokenAddress,
          anticipatedMerkleMinterAddress,
          AddressZero,
          MINT_PERMISSION_ID,
        ],
        [
          Op.Grant,
          anticipatedMerkleMinterAddress,
          targetDao.address,
          AddressZero,
          MERKLE_MINT_PERMISSION_ID,
        ],
        [
          Op.Grant,
          anticipatedMerkleMinterAddress,
          targetDao.address,
          AddressZero,
          UPGRADE_PERMISSION_ID,
        ],
      ]);
    });

    it('correctly sets up the plugin and helpers, when a token address is not passed', async () => {
      const daoAddress = targetDao.address;

      const data = abiCoder.encode(
        [
          'uint64',
          'uint64',
          'uint64',
          'tuple(address,string,string)',
          'tuple(address[],uint256[])',
        ],
        [
          participationRequiredPct,
          supportRequiredPct,
          minDuration,
          [AddressZero, tokenName, tokenSymbol],
          [merkleMintToAddressArray, merkleMintToAmountArray],
        ]
      );

      const nonce = await ethers.provider.getTransactionCount(
        erc20VotingSetup.address
      );
      const anticipatedTokenAddress = ethers.utils.getContractAddress({
        from: erc20VotingSetup.address,
        nonce: nonce,
      });
      const anticipatedMerkleMinterAddress = ethers.utils.getContractAddress({
        from: erc20VotingSetup.address,
        nonce: nonce + 1,
      });
      const anticipatedPluginAddress = ethers.utils.getContractAddress({
        from: erc20VotingSetup.address,
        nonce: nonce + 2,
      });

      await erc20VotingSetup.prepareInstallation(daoAddress, data);

      // check plugin
      const PluginFactory = await ethers.getContractFactory('ERC20Voting');
      const erc20VotingContract = PluginFactory.attach(
        anticipatedPluginAddress
      );

      expect(await erc20VotingContract.getDAO()).to.be.equal(daoAddress);
      expect(await erc20VotingContract.participationRequiredPct()).to.be.equal(
        participationRequiredPct
      );
      expect(await erc20VotingContract.supportRequiredPct()).to.be.equal(
        supportRequiredPct
      );
      expect(await erc20VotingContract.minDuration()).to.be.equal(minDuration);
      expect(await erc20VotingContract.getVotingToken()).to.be.equal(
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

      const MerkleMinterFactory = await ethers.getContractFactory(
        'MerkleMinter'
      );
      const merkleMinterContract = MerkleMinterFactory.attach(
        anticipatedMerkleMinterAddress
      );

      expect(await merkleMinterContract.getDAO()).to.be.equal(daoAddress);
      expect(await merkleMinterContract.token()).to.be.equal(
        anticipatedTokenAddress
      );
      expect(await merkleMinterContract.distributorBase()).to.be.equal(
        await erc20VotingSetup.distributorBase()
      );
    });
  });

  describe('prepareUninstallation', async () => {
    it('correctly returns prepare uninstallation data abi', async () => {
      // Human-Readable Abi of data param of `prepareUninstallation`.
      const dataHRABI = '';

      expect(await erc20VotingSetup.prepareUninstallationDataABI()).to.be.eq(
        dataHRABI
      );
    });

    it('fails when the wrong number of helpers is supplied', async () => {
      const plugin = ethers.Wallet.createRandom().address;

      await expect(
        erc20VotingSetup.prepareUninstallation(
          targetDao.address,
          plugin,
          [],
          EMPTY_DATA
        )
      ).to.be.revertedWith(customError('WrongHelpersArrayLength', 0));

      await expect(
        erc20VotingSetup.prepareUninstallation(
          targetDao.address,
          plugin,
          [AddressZero, AddressZero, AddressZero],
          EMPTY_DATA
        )
      ).to.be.revertedWith(customError('WrongHelpersArrayLength', 3));
    });

    it('correctly returns permissions, when the required number of helpers is supplied', async () => {
      const plugin = ethers.Wallet.createRandom().address;
      const GovernanceTokenFactory = await ethers.getContractFactory(
        'GovernanceERC20'
      );
      const token = await GovernanceTokenFactory.deploy(
        targetDao.address,
        tokenName,
        tokenSymbol
      );
      const MerkleMinterFactory = await ethers.getContractFactory(
        'MerkleMinter'
      );
      const merkleMinter = await MerkleMinterFactory.deploy();
      await merkleMinter.initialize(
        targetDao.address,
        token.address,
        AddressZero
      );

      const permissions1 =
        await erc20VotingSetup.callStatic.prepareUninstallation(
          targetDao.address,
          plugin,
          [token.address],
          EMPTY_DATA
        );

      const essentialPermissions = [
        [
          Op.Revoke,
          plugin,
          targetDao.address,
          AddressZero,
          SET_CONFIGURATION_PERMISSION_ID,
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
        await erc20VotingSetup.callStatic.prepareUninstallation(
          targetDao.address,
          plugin,
          [token.address, merkleMinter.address],
          EMPTY_DATA
        );

      expect(permissions2.length).to.be.equal(7);
      expect(permissions2).to.deep.equal([
        ...essentialPermissions,
        [
          Op.Revoke,
          token.address,
          targetDao.address,
          AddressZero,
          MINT_PERMISSION_ID,
        ],
        [
          Op.Revoke,
          token.address,
          merkleMinter.address,
          AddressZero,
          MINT_PERMISSION_ID,
        ],
        [
          Op.Revoke,
          merkleMinter.address,
          targetDao.address,
          AddressZero,
          MERKLE_MINT_PERMISSION_ID,
        ],
        [
          Op.Revoke,
          merkleMinter.address,
          targetDao.address,
          AddressZero,
          UPGRADE_PERMISSION_ID,
        ],
      ]);
    });
  });
});
