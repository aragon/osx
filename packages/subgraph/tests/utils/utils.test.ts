import {BigInt} from '@graphprotocol/graph-ts';

import {assert, describe, test} from 'matchstick-as/assembly/index';
import {bigIntToBytes32} from '../../src/utils/bytes';
import {
  ZERO,
  ONE,
  TWO,
  MAX_UINT256_NUMBER_STRING,
  ZERO_BYTES32,
  ONE_BYTES32,
  HALF_UINT256_BYTES32,
  MAX_UINT256_BYTES32
} from '../constants';
import {TestCase} from './utils';

describe('Test bytes', function() {
  test('`bigIntToBytes32` with a range of `bigInt`s', function() {
    const MAX_UINT256 = BigInt.fromString(MAX_UINT256_NUMBER_STRING);

    const testCases: TestCase[] = [
      new TestCase(BigInt.fromString(ZERO), ZERO_BYTES32),
      new TestCase(BigInt.fromString(ONE), ONE_BYTES32),
      new TestCase(
        MAX_UINT256.div(BigInt.fromString(TWO)),
        HALF_UINT256_BYTES32
      ),
      new TestCase(MAX_UINT256, MAX_UINT256_BYTES32)
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testResult = bigIntToBytes32(testCases[i].input);
      assert.stringEquals(testResult, testCases[i].expectedResult);
    }
  });
});
