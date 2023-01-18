import {ethers} from 'hardhat';
import {DAO} from '../../typechain';
import {deployWithProxy} from './proxy';

export const ZERO_BYTES32 =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
export const daoExampleURI = 'https://example.com';

export async function deployNewDAO(ownerAddress: string): Promise<DAO> {
  const DAO = await ethers.getContractFactory('DAO');
  let dao = await deployWithProxy<DAO>(DAO);

  await dao.initialize(
    '0x00',
    ownerAddress,
    ethers.constants.AddressZero,
    daoExampleURI
  );

  return dao;
}
