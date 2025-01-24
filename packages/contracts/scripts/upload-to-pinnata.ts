import MANAGEMENT_DAO_METADATA from '../deploy/management-dao-metadata.json';
import {uploadToPinata} from '@aragon/osx-commons-sdk';
import {ethers} from 'ethers';

async function uploadToIPFS(): Promise<string> {
  const metadataCIDPath = await uploadToPinata(
    JSON.stringify(MANAGEMENT_DAO_METADATA, null, 2),
    'management-dao-metadata'
  );

  return ethers.utils.hexlify(ethers.utils.toUtf8Bytes(metadataCIDPath));
}

(async () => {
  console.log(await uploadToIPFS());
})();
