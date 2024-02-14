import {
  daoDomainEnv,
  ethKeyEnv,
  managementDaoMultisigApproversEnv,
  managementDaoMultisigListedOnlyEnv,
  managementDaoMultisigMinApprovalsEnv,
  managementDaoSubdomainEnv,
  pluginDomainEnv,
} from '../../utils/environment';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

/**
 * Pre-deployment check for required environment variables
 * Although fetching these variables throws during execution, it's nicer
 * to fail early and provide a more descriptive error message and avoid submitting
 * redundant transactions.
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nChecking Required Env Vars');

  const {network} = hre;

  // fetch env values: in localhost or hardhat network, these have defaults
  const daoDomain = daoDomainEnv(network);
  const pluginDomain = pluginDomainEnv(network);
  const managementDaoSubdomain = managementDaoSubdomainEnv(network);
  const managementDaoMultisigApprovers =
    managementDaoMultisigApproversEnv(network);
  const managementDaoMultisigMinApprovals =
    managementDaoMultisigMinApprovalsEnv(network);
  const managementDaoMultisigListedOnly =
    managementDaoMultisigListedOnlyEnv(network);
  const ethKey = ethKeyEnv(network);

  // technically redundant as the above functions throw if the env var is missing
  if (
    !daoDomain ||
    !pluginDomain ||
    !managementDaoSubdomain ||
    !managementDaoMultisigApprovers ||
    !managementDaoMultisigMinApprovals ||
    !managementDaoMultisigListedOnly ||
    !ethKey
  ) {
    throw new Error('Missing required env vars');
  }

  console.log('✅ All required env vars are set');
};
export default func;
// set the dependencies of other functions to `Env` to ensure this check runs first
func.tags = ['Env'];
