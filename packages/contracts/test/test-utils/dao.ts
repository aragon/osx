import {ethers} from 'hardhat';
import {DAO, ActionExecute__factory} from '../../typechain';
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

export async function getActions() {
  const ActionExecuteFactory = await ethers.getContractFactory('ActionExecute');
  let ActionExecute = await ActionExecuteFactory.deploy();
  const iface = new ethers.utils.Interface(ActionExecute__factory.abi);

  const num = 20;
  return {
    failAction: {
      to: ActionExecute.address,
      data: iface.encodeFunctionData('fail'),
      value: 0,
    },
    succeedAction: {
      to: ActionExecute.address,
      data: iface.encodeFunctionData('setTest', [num]),
      value: 0,
    },
    failActionMessage: ethers.utils
      .hexlify(ethers.utils.toUtf8Bytes('ActionExecute:Revert'))
      .substring(2),
    successActionResult: ethers.utils.hexZeroPad(ethers.utils.hexlify(num), 32),
  };
}
