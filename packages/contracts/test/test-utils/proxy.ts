import { BaseContract } from 'ethers';
import { ethers } from 'hardhat';

export async function createProxy(dao: string, base: BaseContract, data?: string): Promise<unknown> {
    const erc1967Proxy = await ethers.getContractFactory(
        'PluginERC1967Proxy'
    );
        
    let plugin = await erc1967Proxy.deploy(dao, base.address, data || "0x");

    return base.attach(plugin.address)
}
