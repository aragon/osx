import {ProtocolVersionMock__factory} from '../typechain';
import {osxContractsVersion} from './test-utils/protocol-version';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import hre, {ethers} from 'hardhat';

describe.only('ProtocolVersion', function () {
  let signers: SignerWithAddress[];
  before(async () => {
    signers = await ethers.getSigners();
  });

  it('returns the current protocol version that must match the semantic version of the `osx-contracts` package', async () => {
    const versionedContract = await hre.wrapper.deploy('ProtocolVersionMock');

    expect(await versionedContract.protocolVersion()).to.deep.equal(
      osxContractsVersion()
    );
  });
});
