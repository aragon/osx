import {ethers} from 'ethers';

async function uploadToIPFS(): Promise<string> {
  let uploadToPinata: any;
  let MANAGEMENT_DAO_METADATA;

  let errorMsg: string = '';
  let metadataCIDPath: string = '0x';
  try {
    // try importing from @aragon/osx-commons-sdk
    const sdk = await import('@aragon/osx-commons-sdk');
    uploadToPinata = (sdk as any).uploadToPinata;

    if (typeof uploadToPinata !== 'function') {
      throw new Error(
        'Failed to import uploadToPinata from @aragon/osx-commons-sdk'
      );
    }

    // try getting the metadata from the file
    MANAGEMENT_DAO_METADATA = require('../deploy/management-dao-metadata.json');

    // try uploading to pinata
    metadataCIDPath = await uploadToPinata(
      JSON.stringify(MANAGEMENT_DAO_METADATA, null, 2),
      'management-dao-metadata'
    );

    metadataCIDPath = ethers.utils.hexlify(
      ethers.utils.toUtf8Bytes(metadataCIDPath)
    );
  } catch (error) {
    errorMsg = (error as Error).message;
  }

  const encode = ethers.utils.defaultAbiCoder.encode(
    ['string', 'bytes'],
    [errorMsg, metadataCIDPath]
  );

  return encode;
}

(async () => {
  console.log(await uploadToIPFS());
})();
