import {ZK_SYNC_NETWORKS} from '../../utils/zksync';
import hre from 'hardhat';

// ANSI escape codes for colored terminal output
const YELLOW = '\x1b[33m'; // Yellow color for SKIPPED
const BLUE = '\x1b[34m'; // Blue color for message
const RESET = '\x1b[0m'; // Reset to default terminal color

const logSkipped = (testName: string, reason?: string) =>
  console.log(
    `${YELLOW}SKIPPING TEST ${
      reason ? '(' + reason + ')' : ''
    }${RESET}: ${BLUE}${testName}${RESET}`
  );

const logSkippedSuite = (testName: string, reason?: string) =>
  console.log(
    `${YELLOW}SKIPPING TEST SUITE ${
      reason ? '(' + reason + ')' : ''
    }${RESET}: ${BLUE}${testName}${RESET}`
  );

/**
 * Creates a conditional test function that skips based on the provided condition.
 * @param condition - The condition upon which to skip the test.
 * @returns A function to define a test, which will skip based on the condition.
 */
export function skipTestIf(condition: boolean, reason?: string) {
  return (
    testName: string,
    testFunc: ((args: any) => void) | ((args: any) => Promise<void>)
  ) => {
    if (condition) {
      logSkipped(testName, reason);
      return it.skip(testName, testFunc);
    } else {
      return it(testName, testFunc);
    }
  };
}

/**
 * Creates a conditional test suite that skips based on the provided condition.
 * @param condition - The condition upon which to skip the test.
 * @returns A function to define a test, which will skip based on the condition.
 */
export function skipDescribeIf(condition: boolean, reason?: string) {
  return (testName: string, testFunc: (() => void) | (() => Promise<void>)) => {
    if (condition) {
      logSkippedSuite(testName, reason);
      return describe.skip(testName, testFunc);
    } else {
      return describe(testName, testFunc);
    }
  };
}

export function skipTestIfNetworks(networksToSkip: string[], reason?: string) {
  return skipTestIf(networksToSkip.includes(hre.network.name), reason);
}

export function skipDescribeIfNetworks(
  networksToSkip: string[],
  reason?: string
) {
  return skipDescribeIf(networksToSkip.includes(hre.network.name), reason);
}

export const skipTestSuiteIfNetworkIsZkSync = skipDescribeIfNetworks(
  ZK_SYNC_NETWORKS,
  'ZkSync network'
);
export const skipTestIfNetworkIsZkSync = skipTestIfNetworks(
  ZK_SYNC_NETWORKS,
  'ZkSync network'
);
