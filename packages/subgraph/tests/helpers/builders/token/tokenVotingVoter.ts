import {Address, BigInt} from '@graphprotocol/graph-ts';
import {assert} from 'matchstick-as';
import {TokenVotingVoter} from '../../../../generated/schema';
import {ADDRESS_ONE, CONTRACT_ADDRESS, ZERO} from '../../../constants';

export class TokenVotingVoterBuild extends TokenVotingVoter {
  constructor() {
    super(ADDRESS_ONE);
  }

  withDefault() {
    this.address = ADDRESS_ONE;
    this.plugin = CONTRACT_ADDRESS;
    this.lastUpdated = BigInt.fromString(ZERO);
  }

  buildOrUpdate() {
    this.save();
  }

  assertEntity(): void {
    let entity = TokenVotingVoter.load(this.id);
    if (!entity) throw new Error(`Entity not found for id: ${this.id}`);

    let entries = entity.entries;
    for (let i = 0; i < entries.length; i++) {
      let key = entries[i].key;
      let value = this.get(key)?.toString();

      if (!value) {
        throw new Error(`value is null for key: ${key}`);
      }

      assert.fieldEquals('TokenVotingVoter', this.id, key, value);
    }
  }
}
