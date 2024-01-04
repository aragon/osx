import {ProtocolVersionMock__factory} from '../typechain';
import {osxContractsVersion} from './test-utils/protocol-version';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {expect} from 'chai';
import {ethers} from 'hardhat';

describe('ProtocolVersion', function () {
  let signers: SignerWithAddress[];
  before(async () => {
    signers = await ethers.getSigners();
  });

  it('returns the current protocol version that must match the semantic version of the `osx-contracts` package', async () => {
    const versionedContract = await new ProtocolVersionMock__factory(
      signers[0]
    ).deploy();
    expect(await versionedContract.protocolVersion()).to.deep.equal(
      osxContractsVersion()
    );
  });
});
