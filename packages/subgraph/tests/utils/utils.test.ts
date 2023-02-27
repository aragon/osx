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

describe('Test bytes', function() {
  test('`bigIntToBytes32` with a range of `bigInt`s', function() {
    const MAX_UINT256 = BigInt.fromString(MAX_UINT256_NUMBER_STRING);

    assert.stringEquals(bigIntToBytes32(BigInt.fromString(ZERO)), ZERO_BYTES32);
    assert.stringEquals(bigIntToBytes32(BigInt.fromString(ONE)), ONE_BYTES32);
    assert.stringEquals(
      bigIntToBytes32(MAX_UINT256.div(BigInt.fromString(TWO))),
      HALF_UINT256_BYTES32
    );
    assert.stringEquals(bigIntToBytes32(MAX_UINT256), MAX_UINT256_BYTES32);
  });
});
