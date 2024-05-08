import hre from 'hardhat';

import {BigNumberish, Contract, providers} from 'ethers';
import {utils} from 'ethers';

import {NetworkDeployment} from '.';
import { getTime } from '../voting';

export class HardhatClass implements NetworkDeployment {
  provider: providers.BaseProvider;
  constructor(_provider: providers.BaseProvider) {
    this.provider = _provider;
  }

  async deploy(artifactName: string, args: any[] = []) {
    const {ethers} = hre;
    const signers = await ethers.getSigners();
    const artifact = await hre.artifacts.readArtifact(artifactName);
    let contract = await new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode,
      signers[0]
    ).deploy(...args);

    return {artifact, contract};
  }

  getCreateAddress(sender: string, nonce: BigNumberish): string {
    return utils.getContractAddress({from: sender, nonce: nonce});
  }

  async getNonce(
    sender: string,
    type?: 'Deployment' | 'Transaction'
  ): Promise<number> {
    return this.provider.getTransactionCount(sender);
  }

  async deployProxy(
    deployer: number,
    artifactName: string,
    type: string,
    args: any[],
    initializer: string
  ): Promise<Contract> {
    const {ethers} = hre;
    const signer = (await ethers.getSigners())[deployer];

    const artifact = await hre.artifacts.readArtifact(artifactName);
    let contract = new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode,
      signer
    );

    // Currently, it doesn't use type and always deployes with uups
    return hre.upgrades.deployProxy(contract, args, {
      kind: 'uups',
      initializer: initializer,
      unsafeAllow: ['constructor'],
      constructorArgs: [],
    });
  }

  async upgradeProxy(
    upgrader: number,
    proxyAddress: string,
    newArtifactName: string
  ): Promise<Contract> {
    const {ethers} = hre;
    const signer = (await ethers.getSigners())[upgrader];

    const artifact = await hre.artifacts.readArtifact(newArtifactName);

    let contract = new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode,
      signer
    );

    return hre.upgrades.upgradeProxy(proxyAddress, contract, {
      unsafeAllow: ['constructor'],
      constructorArgs: [],
    });
  }

  async nextBlockTimestamp(timestamp?: number): Promise<number> {
    if(timestamp) {
      return timestamp + 12;
    }
    return (await getTime()) + 12;
  }
}
