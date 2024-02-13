/**
 * Enable additional matchers for chai and smock
 * import this file in place of chai, i.e:
 * import {expect} from './chai-setup';
 **/
import {smock} from '@defi-wonderland/smock';
import chai from 'chai';

chai.use(smock.matchers);
export = chai;
