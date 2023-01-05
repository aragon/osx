import {ethers} from 'hardhat';
import {DAO} from '../../typechain';
import {deployWithProxy} from './proxy';

export async function deployNewDAO(ownerAddress: string): Promise<DAO> {
  const DAO = await ethers.getContractFactory('DAO');
  let dao = await deployWithProxy<DAO>(DAO);

  await dao.initialize('0x00', ownerAddress, ethers.constants.AddressZero);

  return dao;
}
