// Copied and modified from: https://github.com/Uniswap/merkle-distributor/blob/master/test/MerkleDistributor.spec.ts

import {expect} from 'chai';
import hre, {artifacts, ethers} from 'hardhat';
import {BigNumber, ContractFactory} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';

import {
  MerkleMinter,
  MerkleDistributor,
  DAO,
  GovernanceERC20,
  IERC165Upgradeable__factory,
  IPlugin__factory,
  IMerkleMinter__factory,
  MerkleMinter__factory,
  MerkleDistributor__factory,
  GovernanceERC20__factory,
} from '../../../../typechain';
import {MerkleMinter__factory as MerkleMinter_V1_0_0__factory} from '../../../../typechain/@aragon/osx-v1.0.1/plugins/token/MerkleMinter.sol';

import BalanceTree from './src/balance-tree';
import {deployNewDAO} from '../../../test-utils/dao';
import {getInterfaceID} from '../../../test-utils/interfaces';
import {UPGRADE_PERMISSIONS} from '../../../test-utils/permissions';
import {
  getProtocolVersion,
  ozUpgradeCheckManagedContract,
} from '../../../test-utils/uups-upgradeable';
import {CURRENT_PROTOCOL_VERSION} from '../../../test-utils/protocol-version';
import {ARTIFACT_SOURCES} from '../../../test-utils/wrapper';

const MERKLE_MINT_PERMISSION_ID = ethers.utils.id('MERKLE_MINT_PERMISSION');
const MINT_PERMISSION_ID = ethers.utils.id('MINT_PERMISSION');

describe('MerkleMinter', function () {
  let signers: SignerWithAddress[];
  let minter: MerkleMinter;
  let distributorBase: MerkleDistributor;
  let managingDao: DAO;
  let token: GovernanceERC20;
  let ownerAddress: string;

  let tree: BalanceTree;
  let merkleRoot: string;
  let totalAmount: BigNumber;

  before(async function () {
    signers = await ethers.getSigners();
    ownerAddress = await signers[0].getAddress();
  });

  beforeEach(async function () {
    const amount0 = BigNumber.from(100);
    const amount1 = BigNumber.from(101);

    tree = new BalanceTree([
      {account: signers[0].address, amount: amount0},
      {account: signers[1].address, amount: amount1},
    ]);
    merkleRoot = tree.getHexRoot();
    totalAmount = amount0.add(amount1);

    // create a DAO
    managingDao = await deployNewDAO(signers[0]);

    token = await hre.wrapper.deploy('GovernanceERC20', {
      args: [managingDao.address, 'GOV', 'GOV', {receivers: [], amounts: []}],
    });

    distributorBase = await hre.wrapper.deploy(
      ARTIFACT_SOURCES.MERKLE_DISTRIBUTOR
    );

    minter = await hre.wrapper.deploy(ARTIFACT_SOURCES.MERKLE_MINTER, {
      withProxy: true,
    });

    await minter.initialize(
      managingDao.address,
      token.address,
      distributorBase.address
    );
    await managingDao.grant(
      minter.address,
      ownerAddress,
      MERKLE_MINT_PERMISSION_ID
    );
    await managingDao.grant(token.address, minter.address, MINT_PERMISSION_ID);
  });

  describe('Upgrades', () => {
    let legacyContractFactory: ContractFactory;
    let currentContractFactory: ContractFactory;

    before(() => {
      currentContractFactory = new MerkleMinter__factory(signers[0]);
    });

    it('from v1.0.0', async () => {
      legacyContractFactory = new MerkleMinter_V1_0_0__factory(signers[0]);

      const {fromImplementation, toImplementation} =
        await ozUpgradeCheckManagedContract(
          0,
          1,
          managingDao,
          {
            dao: managingDao.address,
            token: token.address,
            merkleDistributor: distributorBase.address,
          },
          'initialize',
          ARTIFACT_SOURCES.MERKLE_MINTER_V1_0_0,
          ARTIFACT_SOURCES.MERKLE_MINTER,
          UPGRADE_PERMISSIONS.UPGRADE_PLUGIN_PERMISSION_ID
        );

      const fromProtocolVersion = await getProtocolVersion(
        legacyContractFactory.attach(fromImplementation)
      );
      const toProtocolVersion = await getProtocolVersion(
        currentContractFactory.attach(toImplementation)
      );

      expect(fromProtocolVersion).to.deep.equal(toProtocolVersion); // The contracts inherited from OSx did not change from 1.0.0 to the current version
      expect(fromProtocolVersion).to.deep.equal([1, 0, 0]);
      expect(toProtocolVersion).to.not.deep.equal(CURRENT_PROTOCOL_VERSION);
    });
  });

  describe('plugin interface: ', async () => {
    it('does not support the empty interface', async () => {
      expect(await minter.supportsInterface('0xffffffff')).to.be.false;
    });

    it('supports the `IERC165Upgradeable` interface', async () => {
      const iface = IERC165Upgradeable__factory.createInterface();
      expect(await minter.supportsInterface(getInterfaceID(iface))).to.be.true;
    });

    it('supports the `IPlugin` interface', async () => {
      const iface = IPlugin__factory.createInterface();
      expect(await minter.supportsInterface(getInterfaceID(iface))).to.be.true;
    });

    it('supports the `IMerkleMinter` interface', async () => {
      const iface = IMerkleMinter__factory.createInterface();
      expect(await minter.supportsInterface(getInterfaceID(iface))).to.be.true;
    });
  });

  describe('merkleMint:', () => {
    const dummyMerkleTreeStorageLink: string = '0x';
    const dummyMintingContext: string = '0x';

    it('mints tokens using the merkle distributor', async () => {
      // make a static call with merkleMint to get address of the cloned minter without changing state
      let clonedAddress = await minter.callStatic.merkleMint(
        merkleRoot,
        totalAmount,
        dummyMerkleTreeStorageLink,
        dummyMintingContext
      );

      // execute merkleMint and listen for the event containing the cloned address
      await expect(
        minter.merkleMint(
          merkleRoot,
          totalAmount,
          dummyMerkleTreeStorageLink,
          dummyMintingContext
        )
      )
        .to.emit(minter, 'MerkleMinted')
        .withArgs(
          clonedAddress,
          merkleRoot,
          totalAmount,
          dummyMerkleTreeStorageLink,
          dummyMintingContext
        );
    });

    it('does not mint if the minting permissionId on the minter is missing', async () => {
      await managingDao.revoke(
        minter.address,
        ownerAddress,
        MERKLE_MINT_PERMISSION_ID
      );

      await expect(
        minter.merkleMint(
          tree.getHexRoot(),
          totalAmount,
          dummyMerkleTreeStorageLink,
          dummyMintingContext
        )
      )
        .to.be.revertedWithCustomError(minter, 'DaoUnauthorized')
        .withArgs(
          managingDao.address,
          minter.address,
          ownerAddress,
          MERKLE_MINT_PERMISSION_ID
        );
    });

    it('does not mint if the minting permissionId on the token is missing', async () => {
      await managingDao.revoke(
        token.address,
        minter.address,
        MINT_PERMISSION_ID
      );

      await expect(
        minter.merkleMint(
          tree.getHexRoot(),
          totalAmount,
          dummyMerkleTreeStorageLink,
          dummyMintingContext
        )
      )
        .to.be.revertedWithCustomError(minter, 'DaoUnauthorized')
        .withArgs(
          managingDao.address,
          token.address,
          minter.address,
          MINT_PERMISSION_ID
        );
    });
  });
});
