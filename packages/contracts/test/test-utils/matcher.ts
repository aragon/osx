import {decodeReturnData} from '@nomicfoundation/hardhat-chai-matchers/internal/reverted/utils.js';
import {buildAssert} from '@nomicfoundation/hardhat-chai-matchers/utils.js';
import {AssertionError} from 'chai';
import chai from 'chai';

/// The below code overwrites the behaviour of the `revertedWith` matcher to support how zkSync and ethers-v5
/// encode and handle errors. The functions below are lifted from the `hardhat-chai-matchers` package and modified
/// to check for deeper nesting of error.data in the error object.
/// Unfortunately, the `hardhat-chai-matchers` package does not have a way to super the `revertedWith` matcher, so
/// we have to copy the code here and modify i,t.
/// We also directly import the javascript files from the `hardhat-chai-matchers` package to avoid issues with import paths.
/// See https://github.com/ethers-io/ethers.js/discussions/4715 for full details.

chai.use(({Assertion}) => {
  supportReverted(Assertion);
  supportRevertedWith(Assertion);
  supportRevertedWithCustomError(Assertion, chai.util);
});

/**
 * Try to obtain the return data of a transaction from the given value.
 *
 * If the value is an error but it doesn't have data, we assume it's not related
 * to a reverted transaction and we re-throw it.
 */
export function getReturnDataFromError(error: any): string {
  if (!(error instanceof Error)) {
    throw new AssertionError('Expected an Error object');
  }

  // cast to any again so we don't have to cast it every time we access
  // some property that doesn't exist on Error
  error = error as any;

  // This is the changed line, we have to check for deeply nested error.data otherwise
  // ethers will re-throw our error and our tests won't work.
  // If you can find a better way to do this, please let me know.
  const errorData =
    error.data ??
    error.error?.data ??
    error.error?.error?.data ??
    error.error?.error?.error?.data;

  if (errorData === undefined) {
    throw error;
  }

  const returnData = typeof errorData === 'string' ? errorData : errorData.data;

  if (returnData === undefined || typeof returnData !== 'string') {
    throw error;
  }

  return returnData;
}

export function supportRevertedWith(Assertion: Chai.AssertionStatic) {
  console.debug('Overwriting revertedWith matcher');

  Assertion.addMethod(
    'revertedWith',
    function (this: any, expectedReason: string | RegExp) {
      // capture negated flag before async code executes; see buildAssert's jsdoc
      const negated = this.__flags.negate;

      // validate expected reason
      if (
        !(expectedReason instanceof RegExp) &&
        typeof expectedReason !== 'string'
      ) {
        throw new TypeError(
          'Expected the revert reason to be a string or a regular expression'
        );
      }

      const expectedReasonString =
        expectedReason instanceof RegExp
          ? expectedReason.source
          : expectedReason;

      const onSuccess = () => {
        const assert = buildAssert(negated, onSuccess);

        assert(
          false,
          `Expected transaction to be reverted with reason '${expectedReasonString}', but it didn't revert`
        );
      };

      const onError = (error: any) => {
        const assert = buildAssert(negated, onError);

        const returnData = getReturnDataFromError(error);
        const decodedReturnData = decodeReturnData(returnData);
        if (decodedReturnData.kind === 'Empty') {
          assert(
            false,
            `Expected transaction to be reverted with reason '${expectedReasonString}', but it reverted without a reason`
          );
        } else if (decodedReturnData.kind === 'Error') {
          const matchesExpectedReason =
            expectedReason instanceof RegExp
              ? expectedReason.test(decodedReturnData.reason)
              : decodedReturnData.reason === expectedReasonString;

          assert(
            matchesExpectedReason,
            `Expected transaction to be reverted with reason '${expectedReasonString}', but it reverted with reason '${decodedReturnData.reason}'`,
            `Expected transaction NOT to be reverted with reason '${expectedReasonString}', but it was`
          );
        } else if (decodedReturnData.kind === 'Panic') {
          assert(
            false,
            `Expected transaction to be reverted with reason '${expectedReasonString}', but it reverted with panic code ${decodedReturnData.code.toHexString()} (${
              decodedReturnData.description
            })`
          );
        } else if (decodedReturnData.kind === 'Custom') {
          assert(
            false,
            `Expected transaction to be reverted with reason '${expectedReasonString}', but it reverted with a custom error`
          );
        } else {
          const _exhaustiveCheck: never = decodedReturnData;
        }
      };

      const derivedPromise = Promise.resolve(this._obj).then(
        onSuccess,
        onError
      );

      this.then = derivedPromise.then.bind(derivedPromise);
      this.catch = derivedPromise.catch.bind(derivedPromise);

      return this;
    }
  );
}

export const REVERTED_WITH_CUSTOM_ERROR_CALLED = 'customErrorAssertionCalled';

interface CustomErrorAssertionData {
  contractInterface: any;
  returnData: string;
  customError: CustomError;
}

export function supportRevertedWithCustomError(
  Assertion: Chai.AssertionStatic,
  utils: Chai.ChaiUtils
) {
  Assertion.addMethod(
    'revertedWithCustomError',
    function (this: any, contract: any, expectedCustomErrorName: string) {
      // capture negated flag before async code executes; see buildAssert's jsdoc
      const negated = this.__flags.negate;

      // check the case where users forget to pass the contract as the first
      // argument
      if (typeof contract === 'string' || contract?.interface === undefined) {
        throw new TypeError(
          'The first argument of .revertedWithCustomError must be the contract that defines the custom error'
        );
      }

      // validate custom error name
      if (typeof expectedCustomErrorName !== 'string') {
        throw new TypeError('Expected the custom error name to be a string');
      }

      const iface: any = contract.interface;

      const expectedCustomError = findCustomErrorByName(
        iface,
        expectedCustomErrorName
      );

      // check that interface contains the given custom error
      if (expectedCustomError === undefined) {
        throw new Error(
          `The given contract doesn't have a custom error named '${expectedCustomErrorName}'`
        );
      }

      const onSuccess = () => {
        const assert = buildAssert(negated, onSuccess);

        assert(
          false,
          `Expected transaction to be reverted with custom error '${expectedCustomErrorName}', but it didn't revert`
        );
      };

      const onError = (error: any) => {
        const assert = buildAssert(negated, onError);

        const returnData = getReturnDataFromError(error);
        const decodedReturnData = decodeReturnData(returnData);

        if (decodedReturnData.kind === 'Empty') {
          assert(
            false,
            `Expected transaction to be reverted with custom error '${expectedCustomErrorName}', but it reverted without a reason`
          );
        } else if (decodedReturnData.kind === 'Error') {
          assert(
            false,
            `Expected transaction to be reverted with custom error '${expectedCustomErrorName}', but it reverted with reason '${decodedReturnData.reason}'`
          );
        } else if (decodedReturnData.kind === 'Panic') {
          assert(
            false,
            `Expected transaction to be reverted with custom error '${expectedCustomErrorName}', but it reverted with panic code ${decodedReturnData.code.toHexString()} (${
              decodedReturnData.description
            })`
          );
        } else if (decodedReturnData.kind === 'Custom') {
          if (decodedReturnData.id === expectedCustomError.id) {
            // add flag with the data needed for .withArgs
            const customErrorAssertionData: CustomErrorAssertionData = {
              contractInterface: iface,
              customError: expectedCustomError,
              returnData,
            };
            this.customErrorData = customErrorAssertionData;

            assert(
              true,
              undefined,
              `Expected transaction NOT to be reverted with custom error '${expectedCustomErrorName}', but it was`
            );
          } else {
            // try to decode the actual custom error
            // this will only work when the error comes from the given contract
            const actualCustomError = findCustomErrorById(
              iface,
              decodedReturnData.id
            );

            if (actualCustomError === undefined) {
              assert(
                false,
                `Expected transaction to be reverted with custom error '${expectedCustomErrorName}', but it reverted with a different custom error`
              );
            } else {
              assert(
                false,
                `Expected transaction to be reverted with custom error '${expectedCustomErrorName}', but it reverted with custom error '${actualCustomError.name}'`
              );
            }
          }
        } else {
          const _exhaustiveCheck: never = decodedReturnData;
        }
      };

      const derivedPromise = Promise.resolve(this._obj).then(
        onSuccess,
        onError
      );

      // needed for .withArgs
      utils.flag(this, REVERTED_WITH_CUSTOM_ERROR_CALLED, true);
      this.promise = derivedPromise;

      this.then = derivedPromise.then.bind(derivedPromise);
      this.catch = derivedPromise.catch.bind(derivedPromise);

      return this;
    }
  );
}
export type Ssfi = (...args: any[]) => any;
export async function revertedWithCustomErrorWithArgs(
  context: any,
  Assertion: Chai.AssertionStatic,
  _: Chai.ChaiUtils,
  expectedArgs: any[],
  ssfi: Ssfi
) {
  const negated = false; // .withArgs cannot be negated
  const assert = buildAssert(negated, ssfi);

  const customErrorAssertionData: CustomErrorAssertionData =
    context.customErrorData;

  if (customErrorAssertionData === undefined) {
    throw new Error(
      '[.withArgs] should never happen, please submit an issue to the Hardhat repository'
    );
  }

  const {contractInterface, customError, returnData} = customErrorAssertionData;

  const errorFragment = contractInterface.errors[customError.signature];
  // We transform ether's Array-like object into an actual array as it's safer
  const actualArgs = Array.from<any>(
    contractInterface.decodeErrorResult(errorFragment, returnData)
  );

  new Assertion(actualArgs).to.have.same.length(
    expectedArgs.length,
    `expected ${expectedArgs.length} args but got ${actualArgs.length}`
  );

  for (const [i, actualArg] of actualArgs.entries()) {
    const expectedArg = expectedArgs[i];
    if (typeof expectedArg === 'function') {
      const errorPrefix = `The predicate for custom error argument with index ${i}`;
      try {
        assert(
          expectedArg(actualArg),
          `${errorPrefix} returned false`
          // no need for a negated message, since we disallow mixing .not. with
          // .withArgs
        );
      } catch (e) {
        if (e instanceof AssertionError) {
          assert(
            false,
            `${errorPrefix} threw an AssertionError: ${e.message}`
            // no need for a negated message, since we disallow mixing .not. with
            // .withArgs
          );
        }
        throw e;
      }
    } else if (Array.isArray(expectedArg)) {
      new Assertion(actualArg).to.deep.equal(expectedArg);
    } else {
      new Assertion(actualArg).to.equal(expectedArg);
    }
  }
}

interface CustomError {
  name: string;
  id: string;
  signature: string;
}

function findCustomErrorByName(
  iface: any,
  name: string
): CustomError | undefined {
  const ethers = require('ethers');

  const customErrorEntry = Object.entries(iface.errors).find(
    ([, fragment]: any) => fragment.name === name
  );

  if (customErrorEntry === undefined) {
    return undefined;
  }

  const [customErrorSignature] = customErrorEntry;
  const customErrorId = ethers.utils.id(customErrorSignature).slice(0, 10);

  return {
    id: customErrorId,
    name,
    signature: customErrorSignature,
  };
}

function findCustomErrorById(iface: any, id: string): CustomError | undefined {
  const ethers = require('ethers');

  const customErrorEntry: any = Object.entries(iface.errors).find(
    ([signature]: any) => ethers.utils.id(signature).slice(0, 10) === id
  );

  if (customErrorEntry === undefined) {
    return undefined;
  }

  return {
    id,
    name: customErrorEntry[1].name,
    signature: customErrorEntry[0],
  };
}

export function supportReverted(Assertion: Chai.AssertionStatic) {
  Assertion.addProperty('reverted', function (this: any) {
    // capture negated flag before async code executes; see buildAssert's jsdoc
    const negated = this.__flags.negate;

    const subject: unknown = this._obj;

    // Check if the received value can be linked to a transaction, and then
    // get the receipt of that transaction and check its status.
    //
    // If the value doesn't correspond to a transaction, then the `reverted`
    // assertion is false.
    const onSuccess = async (value: unknown) => {
      const assert = buildAssert(negated, onSuccess);

      if (isTransactionResponse(value) || typeof value === 'string') {
        const hash = typeof value === 'string' ? value : value.hash;

        if (!isValidTransactionHash(hash)) {
          throw new TypeError(
            `Expected a valid transaction hash, but got '${hash}'`
          );
        }

        const receipt = await getTransactionReceipt(hash);

        assert(
          receipt.status === 0,
          'Expected transaction to be reverted',
          'Expected transaction NOT to be reverted'
        );
      } else if (isTransactionReceipt(value)) {
        const receipt = value;

        assert(
          receipt.status === 0,
          'Expected transaction to be reverted',
          'Expected transaction NOT to be reverted'
        );
      } else {
        // If the subject of the assertion is not connected to a transaction
        // (hash, receipt, etc.), then the assertion fails.
        // Since we use `false` here, this means that `.not.to.be.reverted`
        // assertions will pass instead of always throwing a validation error.
        // This allows users to do things like:
        //   `expect(c.callStatic.f()).to.not.be.reverted`
        assert(false, 'Expected transaction to be reverted');
      }
    };

    const onError = (error: any) => {
      const assert = buildAssert(negated, onError);
      const returnData = getReturnDataFromError(error);
      const decodedReturnData = decodeReturnData(returnData);

      if (
        decodedReturnData.kind === 'Empty' ||
        decodedReturnData.kind === 'Custom'
      ) {
        // in the negated case, if we can't decode the reason, we just indicate
        // that the transaction didn't revert
        assert(true, undefined, `Expected transaction NOT to be reverted`);
      } else if (decodedReturnData.kind === 'Error') {
        assert(
          true,
          undefined,
          `Expected transaction NOT to be reverted, but it reverted with reason '${decodedReturnData.reason}'`
        );
      } else if (decodedReturnData.kind === 'Panic') {
        assert(
          true,
          undefined,
          `Expected transaction NOT to be reverted, but it reverted with panic code ${decodedReturnData.code.toHexString()} (${
            decodedReturnData.description
          })`
        );
      } else {
        const _exhaustiveCheck: never = decodedReturnData;
      }
    };

    // we use `Promise.resolve(subject)` so we can process both values and
    // promises of values in the same way
    const derivedPromise = Promise.resolve(subject).then(onSuccess, onError);

    this.then = derivedPromise.then.bind(derivedPromise);
    this.catch = derivedPromise.catch.bind(derivedPromise);

    return this;
  });
}

async function getTransactionReceipt(hash: string) {
  const hre = await import('hardhat');

  return hre.ethers.provider.getTransactionReceipt(hash);
}

function isTransactionResponse(x: unknown): x is {hash: string} {
  if (typeof x === 'object' && x !== null) {
    return 'hash' in x;
  }

  return false;
}

function isTransactionReceipt(x: unknown): x is {status: number} {
  if (typeof x === 'object' && x !== null && 'status' in x) {
    const status = (x as any).status;

    // this means we only support ethers's receipts for now; adding support for
    // raw receipts, where the status is an hexadecimal string, should be easy
    // and we can do it if there's demand for that
    return typeof status === 'number';
  }

  return false;
}

function isValidTransactionHash(x: string): boolean {
  return /0x[0-9a-fA-F]{64}/.test(x);
}
