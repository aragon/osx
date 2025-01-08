import {uploadToPinata} from '@aragon/osx-commons-sdk';


async function uploadToIPFS(): Promise<string> {
  // todo load the correct metadata 
  const metadataCIDPath = await uploadToPinata(
    JSON.stringify('good', null, 2),
    'management-dao-metadata'
  );

  return metadataCIDPath;
}

(async () => {
  console.log(await uploadToIPFS());
})();