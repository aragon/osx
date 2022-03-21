import {Bytes, ipfs} from '@graphprotocol/graph-ts';

export function handleMetadata(metadata: string): string {
  // check if metadata is ipfs
  let data = ipfs.cat(metadata);
  if (data) {
    // set the entire content as string
    return data.toString();
  }

  // return data as it is
  return metadata;
}
