import {
  Address,
  Bytes,
  ethereum,
  crypto,
  ByteArray,
} from '@graphprotocol/graph-ts';

export const PERMISSION_OPERATIONS = new Map<number, string>()
  .set(0, 'Grant')
  .set(1, 'Revoke')
  .set(2, 'GrantWithCondition');

export function getPluginInstallationId(
  dao: string,
  plugin: string
): Bytes | null {
  let installationIdTupleArray = new ethereum.Tuple();
  installationIdTupleArray.push(
    ethereum.Value.fromAddress(Address.fromString(dao))
  );
  installationIdTupleArray.push(
    ethereum.Value.fromAddress(Address.fromString(plugin))
  );

  let installationIdTuple = installationIdTupleArray as ethereum.Tuple;
  let installationIdTupleEncoded = ethereum.encode(
    ethereum.Value.fromTuple(installationIdTuple)
  );

  if (installationIdTupleEncoded) {
    return Bytes.fromHexString(
      crypto
        .keccak256(
          ByteArray.fromHexString(installationIdTupleEncoded.toHexString())
        )
        .toHexString()
    );
  }
  return null;
}

export function getPluginVersionId(
  pluginRepo: string,
  release: i32,
  build: i32
): string {
  return pluginRepo
    .concat('_')
    .concat(release.toString())
    .concat('_')
    .concat(build.toString());
}
