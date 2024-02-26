/// AssemblyScript types to remove false errors from the compiler
interface ethereum {
  event: import('@graphprotocol/graph-ts/chain/ethereum').ethereum.Event;
  value: import('@graphprotocol/graph-ts/chain/ethereum').ethereum.Value;
}

// type casting through generics is a bit tricky so just add overloads here as you need them
declare function changetype<T>(input: ethereum['event']): T & ethereum['event'];
declare function changetype<T>(
  input: ethereum['value'][]
): T & ethereum['value'];

declare type i32 = number;
