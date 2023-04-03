export type AragonPluginRepos = {
  'address-list-voting': string;
  'token-voting': string;
  // prettier-ignore
  'admin': string;
  // prettier-ignore
  'multisig': string;
  [index: string]: string;
};

export type AragonVerifyEntry = {
  address: string;
  args?: any[];
};

export enum Operation {
  Grant,
  Revoke,
  GrantWithCondition,
}
