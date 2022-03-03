import { RelayProvider }  from '@opengsn/provider'
import { GsnTestEnvironment } from '@opengsn/dev'
import { ethers, run } from 'hardhat';
const Web3HttpProvider = require('web3-providers-http')

const RelayHub = require("../../artifacts/@opengsn/contracts/src/interfaces/IRelayHub.sol/IRelayHub.json");
const BasePaymaster = require("../../artifacts/@opengsn/contracts/src/BasePaymaster.sol/BasePaymaster.json");

/**
 * @returns forwarderAddress  Forwarder address
 * @returns gsnEthersProvider The final Ethers provider that is derived from GSNProvider 
 * @returns deploymentProvider The provider from which the contracts(paymaster + recipient) will get deployed
 * @returns zeroBalanceAddress the account address that will call the transactions on the recipient.
 * It has 0 balance, but should still be able to call txs.
 */
export async function getGSNProvider() {
    let env = await GsnTestEnvironment.startGsn('localhost')
    const { forwarderAddress, relayHubAddress } = env.contractsDeployment

    // The above deploys its own paymaster, which doesn't serve
    // our purpose of testing paymaster as well.
    const web3provider = new Web3HttpProvider('http://localhost:8545')
 
    const deploymentProvider = new ethers.providers.Web3Provider(web3provider)

    const PaymasterContract = await ethers.getContractFactory(
        'Paymaster', 
        deploymentProvider.getSigner()
    );
    
    // @ts-ignore
    let paymaster = await PaymasterContract.deploy();

    // @ts-ignore
    let relayHub = new ethers.Contract(relayHubAddress, RelayHub.abi, deploymentProvider.getSigner())
    // @ts-ignore
    paymaster = new ethers.Contract(paymaster.address, BasePaymaster.abi, deploymentProvider.getSigner())
    
    const tx = await relayHub.depositFor(paymaster.address, {
        value: ethers.utils.parseEther("1.0")
    });
    // @ts-ignore
    await paymaster.setRelayHub(relayHubAddress)
    // @ts-ignore
    await paymaster.setTrustedForwarder(forwarderAddress);
    
    const config = {
        paymasterAddress: paymaster.address
    }

    // const hdweb3provider = new HDWallet('0x123456', 'http://localhost:8545')
    let gsnProvider = RelayProvider.newProvider({provider: web3provider, config})
    await gsnProvider.init()

    // Create totally new account.
    const account = new ethers.Wallet(Buffer.from('1'.repeat(64),'hex'))
    gsnProvider.addAccount(account.privateKey)
    let zeroBalanceAddress = account.address
    

    // gsnProvider is now an rpc provider with GSN support. make it an ethers provider:
    // @ts-ignore
    const etherProvider = new ethers.providers.Web3Provider(gsnProvider)

    return {
        forwarderAddress: forwarderAddress,
        gsnEthersProvider: etherProvider,
        deploymentProvider: deploymentProvider,
        zeroBalanceAddress: zeroBalanceAddress
    }
}
