import hre from 'hardhat';

import {BigNumberish, providers} from 'ethers'
import {utils} from 'ethers'

import { NetworkDeployment } from "./Wrapper";

export class HardhatClass implements NetworkDeployment {
  
    provider: providers.BaseProvider;
    constructor(_provider: providers.BaseProvider) {
      this.provider = _provider;
    }
  
    async deploy(artifactName: string, args:any[] = []) {
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
  
    async getNonce(sender: string, type?: 'Deployment'| 'Transaction'): Promise<BigNumberish> {
      return this.provider.getTransactionCount(sender)
    }
  }