import { expect } from 'chai';
import { ethers } from 'hardhat';

import {
    DAOMock,
    CounterV1PluginManager,
    CounterV2PluginManager
} from '../../typechain';

const EVENTS = {
    PLUGIN_UPDATED: 'PluginUpdated',
    PLUGIN_DEPLOYED: 'PluginDeployed'
}

enum Op {
    Grant,
    Revoke,
    Freeze,
    GrantWithOracle
}

const abiCoder = ethers.utils.defaultAbiCoder;
const AddressZero = ethers.constants.AddressZero

// TODO 1. add type GRANT/REVOKE check in permissions
// TODO 2. in order to detect encode abi for deploy/update, use deployABI/updateABI
describe('CounterPluginManager(Example)', function () {
    let ownerAddress: string;
    let signers: any;
    let counterV1Manager: CounterV1PluginManager;
    let counterV2Manager: CounterV2PluginManager;
    let implementationAddress: string;
    let daoMock: DAOMock;
    let multiplyPermissionId: string;

    async function decodeEvent(tx: any, eventName: string) {
        const { events } = await tx.wait()
        const event = events.find(
            ({ event }: { event: any }) => event === eventName
        ).args;
        const { plugin, permissions } = event
        return { plugin, permissions }
    }

    before(async () => {
        signers = await ethers.getSigners();
        ownerAddress = await signers[0].getAddress();

        const DAOMock = await ethers.getContractFactory('DAOMock');
        daoMock = await DAOMock.deploy(ownerAddress);

        const CounterV1Manager = await ethers.getContractFactory('CounterV1PluginManager');
        counterV1Manager = await CounterV1Manager.deploy()
        
        const COUNTER_V1 = await ethers.getContractFactory('CounterV1')
        const counterV1 = COUNTER_V1.attach(await counterV1Manager.multiplyHelperBase())
        multiplyPermissionId = await counterV1.MULTIPLY_PERMISSION_ID()

        implementationAddress = await counterV1Manager.getImplementationAddress()
    });

    describe("getInstallInstruction", async () => {
        it("correctly returns permissions/helpers/plugin when helper is passed", async () => {
            const num = 10;
    
            const params = abiCoder.encode(
                ["address", "uint256"],
                [ownerAddress, num]
            )
            
            const salt = ethers.utils.formatBytes32String("hello world");
            const data = await counterV1Manager.getInstallInstruction(daoMock.address, salt, ownerAddress, params)

            expect(data.permissions.length).to.be.equal(2);
            expect(data.helpers.length).to.be.equal(0);
            expect(data.plugins.length).to.be.equal(1);

            // compute the address of the plugin in advance
            const predictedPluginAddr = ethers.utils.getCreate2Address(
                ownerAddress,
                salt,
                ethers.utils.keccak256(data.plugins[0].initCode)
            )
            
            // Inside permissions, there should be the same address as predictedPluginAddr
            expect(data.permissions).to.deep.equal([
                [Op.Grant, daoMock.address, predictedPluginAddr, AddressZero, ethers.utils.id('EXEC_PERMISSION')],
                [Op.Grant, predictedPluginAddr, daoMock.address, AddressZero, multiplyPermissionId],
            ])
        })

        it("correcly returns permissions/helpers/plugin when helper is NOT passed", async () => {
            const num = 10;
    
            const params = abiCoder.encode(
                ["address", "uint256"],
                [AddressZero, num]
            )
            
            const salt = ethers.utils.formatBytes32String("hello world");
            const data = await counterV1Manager.getInstallInstruction(daoMock.address, salt, ownerAddress, params)

            expect(data.permissions.length).to.be.equal(3);
            expect(data.helpers.length).to.be.equal(1);
            expect(data.plugins.length).to.be.equal(1);

            // compute the address of the plugin in advance
            const predictedPluginAddr = ethers.utils.getCreate2Address(
                ownerAddress,
                salt,
                ethers.utils.keccak256(data.plugins[0].initCode)
            )
            const predictedHelperAddr = ethers.utils.getCreate2Address(
                ownerAddress,
                salt,
                ethers.utils.keccak256(data.helpers[0].initCode)
            )
            
            // Inside permissions, there should be the same address as predictedPluginAddr
            expect(data.permissions).to.deep.equal([
                [Op.Grant, daoMock.address, predictedPluginAddr, AddressZero, ethers.utils.id('EXEC_PERMISSION')],
                [Op.Grant, predictedPluginAddr, daoMock.address, AddressZero, multiplyPermissionId],
                [Op.Grant, predictedHelperAddr, predictedPluginAddr, AddressZero, multiplyPermissionId],
            ])
        })
    })

    // TODO: include more interesting example in CounterV2PluginManager + add tests below.
    describe("getUpdateInstruction", async () => {

    })
  
})