import {
  v1_0_0_mainnet_goerli_active_contracts,
  v1_0_0_mainnet_goerli_typechain,
} from '@aragon/osx-versions';
import {ethers} from 'ethers';

describe('contract-versions', () => {
  it('should get typechain for a specific version', async () => {
    const typechain = v1_0_0_mainnet_goerli_typechain;
    expect(typechain).toBeDefined();
  });

  it('should get active contracts for a specific version', async () => {
    const activeContracts = v1_0_0_mainnet_goerli_active_contracts;
    expect(activeContracts).toBeDefined();
  });

  it('should exported the types properly for a specific version', async () => {
    const typechain = v1_0_0_mainnet_goerli_typechain;
    const idao: v1_0_0_mainnet_goerli_typechain.IDAO =
      typechain.IDAO__factory.connect(
        ethers.constants.AddressZero,
        ethers.providers.getDefaultProvider()
      );
    expect(idao).toBeDefined();
  });
});
