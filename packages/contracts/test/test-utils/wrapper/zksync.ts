import hre from 'hardhat';
import {BigNumberish, Contract} from 'ethers';
import {NetworkDeployment, deploySettings} from '.';
import {Provider} from 'zksync-ethers';
import {utils, Wallet} from 'zksync-ethers';
import { getTime } from '../voting';
import { Deployer } from '@matterlabs/hardhat-zksync-deploy';

export class ZkSync implements NetworkDeployment {
  provider: Provider;
  constructor(_provider: Provider) {
    this.provider = _provider;
  }

  async deploy(artifactName: string, args: any[] = []) {
    const {deployer} = hre;
    const artifact = await deployer.loadArtifact(artifactName);
    const contract = await deployer.deploy(artifact, args);
    
    return {artifact, contract};
  }

  getCreateAddress(sender: string, nonce: BigNumberish): string {
    return utils.createAddress(sender, nonce);
  }

  async getNonce(
    sender: string,
    type: 'Deployment' | 'Transaction' = 'Deployment'
  ): Promise<number> {
    if (type == 'Deployment') {
      const {ethers} = hre;
      const NONCE_HOLDER_ADDRESS = '0x0000000000000000000000000000000000008003';
      const abi = [
        'function getDeploymentNonce(address) public view returns(uint256)',
      ];
      let signers = await ethers.getSigners();
      let contract = new ethers.Contract(NONCE_HOLDER_ADDRESS, abi, signers[0]);
      return contract.getDeploymentNonce(sender);
    }

    return this.provider.getTransactionCount(sender);
  }

  // currently, type is not used and always deploys with UUPS
  async deployProxy(
    deployer: number,
    artifactName: string,
    type: string,
    args: any[],
    initializer: string | null
  ): Promise<Contract> {
    const wallets = await hre.zksyncEthers.getWallets();
    const artifact = await hre.deployer.loadArtifact(artifactName);
    return hre.zkUpgrades.deployProxy(
      wallets[deployer],
      artifact,
      args,
      {
        kind: 'uups',
        unsafeAllow: ['constructor'],
        constructorArgs: [],
      },
      true
    );
  }

  async upgradeProxy(
    upgrader: number,
    proxyAddress: string,
    newArtifactName: string
  ): Promise<Contract> {
    const wallets = await hre.zksyncEthers.getWallets();
    const newArtifact = await hre.deployer.loadArtifact(newArtifactName);
    return hre.zkUpgrades.upgradeProxy(
      wallets[upgrader],
      proxyAddress,
      newArtifact,
      {
        unsafeAllow: ['constructor'],
        constructorArgs: [],
        kind: 'uups',
      },
      true
    );
  }

  async nextBlockTimestamp(timestamp?: number): Promise<number> {
    if(timestamp) {
      return timestamp + 1;
    }
    return (await getTime()) + 1;
  }
}
