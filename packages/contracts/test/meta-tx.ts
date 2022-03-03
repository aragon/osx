import { RelayProvider }  from '@opengsn/provider'
import { GsnTestEnvironment } from '@opengsn/dev'
import { ethers, run } from 'hardhat';
// const { it, describe, before } = require('mocha')
import { assert } from 'chai'
import { getGSNProvider } from './test-utils/meta'

const Web3HttpProvider = require('web3-providers-http')

const RelayHub = require("../artifacts/@opengsn/contracts/src/interfaces/IRelayHub.sol/IRelayHub.json");
const BasePaymaster = require("../artifacts/@opengsn/contracts/src/BasePaymaster.sol/BasePaymaster.json");


describe('using ethers with OpenGSN', () => {
    let counter:any;
    let accounts
    let web3provider
    let from: any;
    before(async () => {
        const { 
            gsnEthersProvider, 
            deploymentProvider, 
            forwarderAddress,
            zeroBalanceAddress
        } = await getGSNProvider()
        
        from = zeroBalanceAddress;

        // Deploy Counter Test Contract...(Recipient)
        const CounterContract = await ethers.getContractFactory(
            'Counter', 
            deploymentProvider.getSigner()
        );

        // @ts-ignore
        counter = await CounterContract.deploy(forwarderAddress);               
        
        counter = counter.connect(gsnEthersProvider.getSigner(from))
    })

    describe('make a call', async () => {
        it('should make a call (have counter incremented)', async () => {
            assert.equal(0, await counter.provider.getBalance(from))
            await counter.increment()
            assert.equal(0, await counter.provider.getBalance(from))
        })
    })
})