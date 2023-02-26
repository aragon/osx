import {BigInt} from '@graphprotocol/graph-ts';

import {assert, describe, test, log} from 'matchstick-as/assembly/index';
import {bigIntToBytes32} from '../../src/utils/bytes';
import {
  HALF_UINT256_BYTES32,
  MAX_UINT256_BYTES32,
  MAX_UINT256_NUMBER_STRING,
  ONE,
  ONE_BYTES32,
  TWO,
  ZERO,
  ZERO_BYTES32
} from '../constants';

describe('Test bytes', function() {
  test('`bigIntToBytes32` with a range of `bigInt`s', function() {
    const MAX_UINT256 = BigInt.fromString(MAX_UINT256_NUMBER_STRING);

    let inputs = [
      BigInt.fromString(ZERO),
      BigInt.fromString(ONE),
      MAX_UINT256.div(BigInt.fromString(TWO)),
      MAX_UINT256
    ];

    const results = [
      ZERO_BYTES32,
      ONE_BYTES32,
      HALF_UINT256_BYTES32,
      MAX_UINT256_BYTES32
    ];

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const result = bigIntToBytes32(input);
      const expectedResult = results[i];
      assert.stringEquals(result, expectedResult);
    }
  });
});
