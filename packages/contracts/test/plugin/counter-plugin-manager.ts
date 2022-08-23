// This is an extension (adaptation) of the work at:
// https://github.com/aragon/apm/blob/next/test/contracts/apm/apm_repo.js

import {expect} from 'chai';
import {ethers} from 'hardhat';

import {
    DAOMock, 
    TestCounterV1Manager, 
    TestCounterV2Manager
} from '../../typechain';

const EVENTS = {
    PLUGIN_UPDATED: 'PluginUpdated',
    PLUGIN_DEPLOYED: 'PluginDeployed'
}

const abiCoder = ethers.utils.defaultAbiCoder;
const AddressZero = ethers.constants.AddressZero

// TODO 1. add type GRANT/REVOKE check in permissions
// TODO 2. in order to detect encode abi for deploy/update, use deployABI/updateABI
describe.only('CounterPluginManager(Example)', function () {
    let ownerAddress: string;
    let signers: any;
    let counterV1Manager: TestCounterV1Manager;
    let counterV2Manager: TestCounterV2Manager;
    let implementationAddress: string;
    let daoMock: DAOMock;

    async function decodeEvent(tx:any, eventName: string) {
        const { events } = await tx.wait()
        const event = events.find(
            ({event}: {event: any}) => event === eventName
        ).args;
        const { plugin, permissions } = event
        return { plugin, permissions }
    }

    before(async () => {
        signers = await ethers.getSigners();
        ownerAddress = await signers[0].getAddress();

        const DAOMock = await ethers.getContractFactory('DAOMock');
        daoMock = await DAOMock.deploy(ownerAddress);

        const CounterV1Manager = await ethers.getContractFactory('TestCounterV1Manager');
        counterV1Manager = await CounterV1Manager.deploy()

        implementationAddress = await counterV1Manager.getImplementationAddress()
    });

    describe("staticCall:deploy", async () => {
        it("should deploy helper and return permissions correctly", async () => {
            const num = 10;
    
            const encoded = abiCoder.encode(
                ["address", "uint256"],
                [AddressZero, num]
            )

            const data = await counterV1Manager.callStatic.deploy(daoMock.address, encoded);
            const permissions = data['permissions']
            const plugin = data['plugin']
            expect(permissions.length).to.be.equal(3);
            expect(plugin).to.not.eq(AddressZero)
        })

        it("should not deploy multiplyHelper and return permissions correctly", async () => {
            const num = 10;
    
            const encoded = abiCoder.encode(
                ["address", "uint256"],
                [ownerAddress, num]
            )
            // deploy with static call 
            const data = await counterV1Manager.callStatic.deploy(daoMock.address, encoded);
            const permissions = data['permissions']
            const pluginAddress = data['plugin']
            expect(permissions.length).to.be.equal(2);
            expect(pluginAddress).to.not.eq(AddressZero)
        })
    })
    
    it("should not deploy helper and not apply permissions on it", async () => {
        const num = 10;

        const encoded = abiCoder.encode(
            ["address", "uint256"],
            [ownerAddress, num]
        )

        const tx  = await counterV1Manager.deploy(daoMock.address, encoded)
        const { plugin, permissions } = await decodeEvent(tx, EVENTS.PLUGIN_DEPLOYED);
        
        const CounterV1 = await ethers.getContractFactory('CounterV1')
        const counter = CounterV1.attach(plugin)

        expect(await counter.count()).to.be.equal(10);
        expect(await counter.multiplyHelper()).to.be.equal(ownerAddress);
        expect(permissions.length).to.be.equal(2);

        // TODO: Make it struct comparison with `to.emit`
        expect(permissions[0]['where']).to.equal(daoMock.address)
        expect(permissions[0]['who']).to.equal(plugin)
        expect(permissions[0]['permissionId']).to.equal(ethers.utils.id('EXEC_PERMISSION'))
        
        // TODO: Make it struct comparison with `to.emit`
        expect(permissions[1]['where']).to.equal(plugin)
        expect(permissions[1]['who']).to.equal(daoMock.address)
        expect(permissions[1]['permissionId']).to.equal(await counter.MULTIPLY_PERMISSION_ID());
    })

    it("should deploy helper and apply permissions correctly", async () => {
        const num = 10;

        const encoded = abiCoder.encode(
            ["address", "uint256"],
            [AddressZero, num]
        )

        const tx = await counterV1Manager.deploy(daoMock.address, encoded);
        const { plugin, permissions } = await decodeEvent(tx, EVENTS.PLUGIN_DEPLOYED);
        
        const CounterV1 = await ethers.getContractFactory('CounterV1')
        const counter = CounterV1.attach(plugin)
        
        const multiplyHelper = permissions[2]['where']
        expect(await counter.count()).to.be.equal(10);
        expect(await counter.multiplyHelper()).to.be.equal(multiplyHelper);
        expect(permissions.length).to.be.equal(3);
        
        // TODO: Make it struct comparison with `to.emit`
        expect(permissions[0]['where']).to.equal(daoMock.address)
        expect(permissions[0]['who']).to.equal(plugin)
        expect(permissions[0]['permissionId']).to.equal(ethers.utils.id('EXEC_PERMISSION'))
        
        // TODO: Make it struct comparison with `to.emit`
        expect(permissions[1]['where']).to.equal(plugin)
        expect(permissions[1]['who']).to.equal(daoMock.address)
        expect(permissions[1]['permissionId']).to.equal(await counter.MULTIPLY_PERMISSION_ID());
        
        // TODO: Make it struct comparison with `to.emit`
        expect(permissions[2]['where']).to.equal(multiplyHelper)
        expect(permissions[2]['who']).to.equal(plugin)
        expect(permissions[2]['permissionId']).to.equal(await counter.MULTIPLY_PERMISSION_ID());
    })

    describe("update", async () => {
        let plugin:string, permissions;

        before(async () => {
            const oldMultiplyHelper = await counterV1Manager.multiplyHelperBase()
            const CounterV2Manager = await ethers.getContractFactory('TestCounterV2Manager');
            counterV2Manager = await CounterV2Manager.deploy(oldMultiplyHelper)
        })

        beforeEach(async () => {
            const num = 10;
    
            const encoded = abiCoder.encode(
                ["address", "uint256"],
                [ownerAddress, num]
            )
            
            const tx = await counterV1Manager.deploy(daoMock.address, encoded);
            const data = await decodeEvent(tx, EVENTS.PLUGIN_DEPLOYED);
            plugin = data.plugin;
            permissions = data.permissions;
        })

        it("updates the proxy with the new implementation and initializes new data", async () => {
            const newVariable = 15;
            const encoded = abiCoder.encode(["uint256"], [newVariable])
            const tx = await counterV2Manager.update(daoMock.address, plugin, [1,0,0], encoded)

            const CounterV2 = await ethers.getContractFactory('CounterV2')
            const counter = CounterV2.attach(plugin)

            expect(await counter.newVariable()).to.be.equal(newVariable)

            const data  = await decodeEvent(tx, EVENTS.PLUGIN_UPDATED);
            const permissionsV2 = data.permissions;

            // TODO: Make it struct comparison with `to.emit`
            expect(permissionsV2[0]['where']).to.equal(daoMock.address)
            expect(permissionsV2[0]['who']).to.equal(plugin)
            expect(permissionsV2[0]['permissionId']).to.equal(await counter.MULTIPLY_PERMISSION_ID());
        })

        
    })
});
