import activeContracts from '../../../active_contracts.json';
import addresslistVotingMetadata from '../../contracts/src/plugins/governance/majority-voting/addresslist/build-metadata.json';
import tokenVotingMetadata from '../../contracts/src/plugins/governance/majority-voting/token/build-metadata.json';
import multisigMetadata from '../../contracts/src/plugins/governance/multisig/build-metadata.json';
import adminMetadata from '../../contracts/src/plugins/governance/admin/build-metadata.json';

export * from '../types/';
export const activeContractsList = activeContracts;
export const addresslistVotingBuildMetadata = addresslistVotingMetadata;
export const tokenVotingBuildMetadata = tokenVotingMetadata;
export const multisigBuildMetadata = multisigMetadata;
export const adminBuildMetadata = adminMetadata;
