import {ethers} from 'hardhat';

export async function deployNewDAO(ownerAddress: any): Promise<any> {
  const DAO = await ethers.getContractFactory('DAO');
  let dao = await DAO.deploy();
  await dao.initialize('0x00', ownerAddress, ethers.constants.AddressZero);

  return dao;
}
