import {ethers} from 'hardhat';
import {utils, constants} from 'ethers';
import {Operation} from '../../../utils/types';

export function mockPermissionsOperations(
  start: number,
  end: number,
  op: Operation
) {
  let arr = [];

  for (let i = start; i < end; i++) {
    arr.push({
      operation: op,
      where: utils.hexZeroPad(ethers.utils.hexlify(i), 20),
      who: utils.hexZeroPad(ethers.utils.hexlify(i), 20),
      condition: constants.AddressZero,
      permissionId: utils.id('MOCK_PERMISSION'),
    });
  }

  return arr.map(item => Object.values(item));
}

export function mockHelpers(amount: number): string[] {
  let arr: string[] = [];

  for (let i = 0; i < amount; i++) {
    arr.push(utils.hexZeroPad(ethers.utils.hexlify(i), 20));
  }

  return arr;
}
