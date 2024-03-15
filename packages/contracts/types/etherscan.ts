import {Deployment} from 'hardhat-deploy/types';

export type AllDeployments = {[name: string]: Deployment};

export type NameAndAddress = {name: string; address: string};

export type CollectedProxyWithImplementation = {
  name: string;
  proxy: NameAndAddress;
  implementation: NameAndAddress | undefined;
};
