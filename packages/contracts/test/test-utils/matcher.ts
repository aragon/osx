import {AssertionError} from 'chai';
import {buildAssert} from '@nomicfoundation/hardhat-chai-matchers/utils.js';
import {decodeReturnData} from '@nomicfoundation/hardhat-chai-matchers/internal/reverted/utils.js';
import chai from 'chai';

/// The below code overwrites the behaviour of the `revertedWith` matcher to support how zkSync and ethers-v5
/// encode and handle errors. The functions below are lifted from the `hardhat-chai-matchers` package and modified
/// to check for deeper nesting of error.data in the error object.
/// Unfortunately, the `hardhat-chai-matchers` package does not have a way to super the `revertedWith` matcher, so
/// we have to copy the code here and modify i,t.
/// We also directly import the javascript files from the `hardhat-chai-matchers` package to avoid issues with import paths.
/// See https://github.com/ethers-io/ethers.js/discussions/4715 for full details.

chai.use(({Assertion}) => supportRevertedWith(Assertion));

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
