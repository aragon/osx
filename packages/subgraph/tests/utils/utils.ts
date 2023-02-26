import {BigInt} from '@graphprotocol/graph-ts';

export class TestCase {
  input: BigInt;
  expectedResult: string;
  constructor(input: BigInt, expectedResult: string) {
    this.input = input;
    this.expectedResult = expectedResult;
  }
}
