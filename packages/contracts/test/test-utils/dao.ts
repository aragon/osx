import {ethers} from 'hardhat';
import {
  ActionExecute__factory,
} from '../../typechain';

export async function deployNewDAO(ownerAddress: any): Promise<any> {
  const DAO = await ethers.getContractFactory('DAO');
  let dao = await DAO.deploy();
  await dao.initialize('0x00', ownerAddress, ethers.constants.AddressZero);

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
    failActionMessage: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("ActionExecute:Revert")).substring(2),
    successActionResult: ethers.utils.hexZeroPad(ethers.utils.hexlify(num), 32)
  };
}
