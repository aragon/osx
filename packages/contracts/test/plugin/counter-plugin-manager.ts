// This is an extension (adaptation) of the work at:
// https://github.com/aragon/apm/blob/next/test/contracts/apm/apm_repo.js

import {expect} from 'chai';
import {ethers} from 'hardhat';

import {PluginRepo, PluginManagerMock, DAOMock, CounterV1PluginManager, CounterV1} from '../../typechain';
import {deployMockPluginManager} from '../test-utils/repo';
import {customError} from '../test-utils/custom-error-helper';

const emptyBytes = '0x00';

describe.only('CounterPluginManager(Example)', function () {
    let ownerAddress: string;
    let signers: any;
    let counterV1Manager: CounterV1PluginManager;
    let daoMock: DAOMock;

    before(async () => {
        signers = await ethers.getSigners();
        ownerAddress = await signers[0].getAddress();

        const DAOMock = await ethers.getContractFactory('DAOMock');
        daoMock = await DAOMock.deploy(ownerAddress);

        const CounterV1Manager = await ethers.getContractFactory('CounterV1PluginManager');
        counterV1Manager = await CounterV1Manager.deploy()

    });

  
    it("should deploy helper and apply permissions correctly", async () => {
        const num = 10;

        const encoded = ethers.utils.defaultAbiCoder.encode(
            ["address", "uint256"],
            [ethers.constants.AddressZero, num]
        )

        const data = await counterV1Manager.callStatic.deploy(daoMock.address, encoded);
        const permissions = data['permissions']
        const pluginAddress = data['plugin']
        

        // console.log(permissions, ' good')
        // console.log(permissions[2], ' good')
        // const multiplyHelper = permissions[2]['where']
        console.log(pluginAddress, ' good')
        const CounterV1 = await ethers.getContractFactory("CounterV1");
        const plugin = CounterV1.attach(pluginAddress);
    

        expect(await plugin.count()).to.equal(num)
        // expect(await plugin.multiplyHelper()).to.equal(multiplyHelper)


        expect(permissions.length).to.be.equal(3);
    })
});
