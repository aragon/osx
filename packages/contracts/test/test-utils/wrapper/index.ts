import hre, { ethers } from 'hardhat';
import {findEvent} from '../../../utils/event';
import {ProxyCreatedEvent} from '../../../typechain/ProxyFactory';
import {BigNumberish, Contract, Wallet} from 'ethers';
import {providers} from 'ethers';

import {HardhatClass} from './hardhat';
import {ZkSync} from './zksync';

// TODO: generate paths programatically.
export const ARTIFACT_SOURCES = {
  DAO: 'src/core/dao/DAO.sol:DAO',
  DAO_V1_0_0: '@aragon/osx-v1.0.1/core/dao/DAO.sol:DAO',
  PLUGIN_REPO: 'src/framework/plugin/repo/PluginRepo.sol:PluginRepo',
  PLUGIN_REPO_V1_0_0:
    '@aragon/osx-v1.0.1/framework/plugin/repo/PluginRepo.sol:PluginRepo',
  DAO_REGISTRY: 'src/framework/dao/DAORegistry.sol:DAORegistry',
  DAO_REGISTRY_V1_0_0:
    '@aragon/osx-v1.0.1/framework/dao/DAORegistry.sol:DAORegistry',
  PLUGIN_REPO_REGISTRY:
    'src/framework/plugin/repo/PluginRepoRegistry.sol:PluginRepoRegistry',
  PLUGIN_REPO_REGISTRY_V1_0_0:
    '@aragon/osx-v1.0.1/framework/plugin/repo/PluginRepoRegistry.sol:PluginRepoRegistry',
  ENS_SUBDOMAIN_REGISTRAR:
    'src/framework/utils/ens/ENSSubdomainRegistrar.sol:ENSSubdomainRegistrar',
  ENS_SUBDOMAIN_REGISTRAR_V1_0_0:
    '@aragon/osx-v1.0.1/framework/utils/ens/ENSSubdomainRegistrar.sol:ENSSubdomainRegistrar',
  MERKLE_DISTRIBUTOR:
    'src/plugins/token/MerkleDistributor.sol:MerkleDistributor',
  MERKLE_DISTRIBUTOR_V1_0_0:
    '@aragon/osx-v1.0.1/plugins/token/MerkleDistributor.sol:MerkleDistributor',
  MERKLE_MINTER: 'src/plugins/token/MerkleMinter.sol:MerkleMinter',
  MERKLE_MINTER_V1_0_0:
    '@aragon/osx-v1.0.1/plugins/token/MerkleMinter.sol:MerkleMinter',
  ADDRESSLIST_VOTING:
    'src/plugins/governance/majority-voting/addresslist/AddresslistVoting.sol:AddresslistVoting',
  ADDRESSLIST_VOTING_V1_0_0:
    '@aragon/osx-v1.0.1/plugins/governance/majority-voting/addresslist/AddresslistVoting.sol:AddresslistVoting',
  TOKEN_VOTING:
    'src/plugins/governance/majority-voting/token/TokenVoting.sol:TokenVoting',
  TOKEN_VOTING_V1_0_0:
    '@aragon/osx-v1.0.1/plugins/governance/majority-voting/token/TokenVoting.sol:TokenVoting',
  MULTISIG: 'src/plugins/governance/multisig/Multisig.sol:Multisig',
  MULTISIG_V1_0_0:
    '@aragon/osx-v1.0.1/plugins/governance/multisig/Multisig.sol:Multisig',
};

export type DeploySettings = {
  args?: any[];
  withProxy?: boolean;
  proxySettings?: {
    type?: 'UUPS' | 'clones';
    initializer?: string;
  };
};

export interface NetworkDeployment {
  deploy(artifactName: string, args: any[]): any;
  getCreateAddress(sender: string, nonce: BigNumberish): string;
  getNonce(
    sender: string,
    type?: 'Deployment' | 'Transaction'
  ): Promise<number>;
  deployProxy(
    deployer: number,
    artifactName: string,
    type: string,
    args: any[],
    initializer: string | null
  ): Promise<Contract>;
  upgradeProxy(
    upgrader: number,
    proxyAddress: string,
    newArtifactName: string
  ): Promise<Contract>;
}

export class Wrapper {
  network: NetworkDeployment;

  constructor(_network: NetworkDeployment) {
    this.network = _network;
  }

  static async create(networkName: string, provider: providers.BaseProvider) {
    if (networkName == 'zkLocalTestnet' || networkName == 'zkSyncLocal') {
      const signers = await ethers.getSigners()
      const allSigners = signers.map(signer => signer.address)

      for(let i = 10; i < 20; i++) {
        await signers[0].sendTransaction({
          to: allSigners[i],
          value: ethers.utils.parseEther("0.5"),
        })
      }
      
      // @ts-ignore TODO:GIORGI
      return new Wrapper(new ZkSync(provider));
    }

    return new Wrapper(new HardhatClass(provider));
  }

  async deploy(artifactName: string, settings?: DeploySettings) {
    let {artifact, contract} = await this.network.deploy(
      artifactName,
      settings?.args ?? []
    );
    if (settings?.withProxy) {
      const {contract: proxyFactoryContract} = await this.network.deploy(
        'ProxyFactory',
        [contract.address]
      );

      // Currently, always deploys with UUPS
      const tx = await proxyFactoryContract.deployUUPSProxy('0x');

      const event = await findEvent<ProxyCreatedEvent>(tx, 'ProxyCreated');
      
      contract = new hre.ethers.Contract(
        event.args.proxy,
        artifact.abi,
        (await hre.ethers.getSigners())[0]
      );
    }

    return contract;
  }

  getCreateAddress(sender: string, nonce: BigNumberish): string {
    return this.network.getCreateAddress(sender, nonce);
  }

  async getNonce(
    sender: string,
    type?: 'Deployment' | 'Transaction'
  ): Promise<number> {
    return this.network.getNonce(sender, type ?? 'Deployment');
  }

  async deployProxy(
    deployer: number,
    artifactName: string,
    options?: DeploySettings
  ) {
    const args = options?.args ?? [];
    const type = options?.proxySettings?.type ?? 'UUPS';
    const initializer = options?.proxySettings?.initializer ?? null;

    return this.network.deployProxy(
      deployer,
      artifactName,
      type,
      args,
      initializer
    );
  }

  async upgradeProxy(
    upgrader: number,
    proxyAddress: string,
    newArtifactName: string,
    options?: DeploySettings
  ) {
    return this.network.upgradeProxy(upgrader, proxyAddress, newArtifactName);
  }

}
