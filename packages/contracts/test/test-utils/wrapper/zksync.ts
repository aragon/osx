import hre from 'hardhat';
import { BigNumberish } from "ethers";
import { NetworkDeployment } from "./Wrapper";
import {Provider} from 'zksync-ethers'
import  {utils} from 'zksync-ethers'

export class ZkSync implements NetworkDeployment {

    provider: Provider;
    constructor(_provider: Provider) {
      this.provider = _provider;
    }
    
    async deploy(artifactName: string, args:any[] = []) {
      const {deployer} = hre;
      const artifact = await deployer.loadArtifact(artifactName);
      let contract = await deployer.deploy(artifact, args);
  
      return {artifact, contract};
    }
  
    getCreateAddress(sender: string, nonce: BigNumberish): string {    
      return utils.createAddress(sender, nonce)
    }
  
    async getNonce(sender: string, type: 'Deployment'| 'Transaction' = 'Deployment'): Promise<BigNumberish> {
      if(type == 'Deployment') {
        const {ethers} = hre;
        const NONCE_HOLDER_ADDRESS ='0x0000000000000000000000000000000000008003';
        const abi = ['function getDeploymentNonce(address) public view returns(uint256)']
        let signers = await ethers.getSigners();
        let contract = new ethers.Contract(NONCE_HOLDER_ADDRESS, abi, signers[0])
        return contract.getDeploymentNonce(sender)
      }
      
      return this.provider.getTransactionCount(sender)
    }
  }