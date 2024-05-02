import hre from 'hardhat';
import {findEvent} from '../../../utils/event';
import {ProxyCreatedEvent} from '../../../typechain/ProxyFactory';
import {BigNumberish, Contract} from 'ethers';
import {providers} from 'ethers';

import {HardhatClass} from './hardhat';
import {ZkSync} from './zksync';

export const ARTIFACT_SOURCES = {
  DAO: 'src/core/dao/DAO.sol:DAO',
  DAO_V1_0_0: '@aragon/osx-v1.0.1/core/dao/DAO.sol:DAO',
  DAO_REGISTRY: 'src/framework/dao/DAORegistry.sol:DAORegistry',
  PLUGIN_REPO_REGISTRY:
    'src/framework/plugin/repo/PluginRepoRegistry.sol:PluginRepoRegistry',
  PLUGIN_REPO: 'src/framework/plugin/repo/PluginRepo.sol:PluginRepo',
  ENS_SUBDOMAIN_REGISTRAR:
    'src/framework/utils/ens/ENSSubdomainRegistrar.sol:ENSSubdomainRegistrar',
  MULTISIG: 'src/plugins/governance/multisig/Multisig.sol:Multisig',
  MERKLE_DISTRIBUTOR:
    'src/plugins/token/MerkleDistributor.sol:MerkleDistributor',
  MERKLE_MINTER: 'src/plugins/token/MerkleMinter.sol:MerkleMinter',
};

export type deploySettings = {
  args?: any[];
  withProxy?: boolean;
  proxySettings?: {
    type: 'UUPS' | 'clones';
  };
};

export interface NetworkDeployment {
  deploy(artifactName: string, args: any[]): any;
  getCreateAddress(sender: string, nonce: BigNumberish): string;
  getNonce(
    sender: string,
    type?: 'Deployment' | 'Transaction'
  ): Promise<BigNumberish>;
  deployProxy(artifactName: string, args: any[], options: any): Promise<Contract>;
  upgradeProxy(proxyAddress: string, newArtifactName: string, options: any): Promise<Contract>;
}

export class Wrapper {
  network: NetworkDeployment;

  constructor(_network: NetworkDeployment) {
    this.network = _network;
  }

  static create(networkName: string, provider: providers.BaseProvider) {
    if (networkName == 'zkLocalTestnet' || networkName == 'zkSyncLocal') {
      // @ts-ignore TODO:GIORGI
      return new Wrapper(new ZkSync(provider));
    }

    return new Wrapper(new HardhatClass(provider));
  }

  async deploy(artifactName: string, settings?: deploySettings) {
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
  ): Promise<BigNumberish> {
    return this.network.getNonce(sender, type ?? 'Deployment');
  }

  async deployProxy(artifactName: string, args: any[], options: any) {
    return this.network.deployProxy(artifactName, args, options);
  }

  async upgradeProxy(proxyAddress: string, newArtifactName: string, options: any) {
    return this.network.upgradeProxy(proxyAddress, newArtifactName, options);
  }
}
