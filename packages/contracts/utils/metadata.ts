export function getNamedTypesFromMetadata(inputs: any): string[] {
  const types: string[] = [];

  for (const input of inputs) {
    if (input.type.startsWith('tuple')) {
      const tupleResult = getNamedTypesFromMetadata(input.components).join(
        ', '
      );

      let tupleString = `tuple(${tupleResult})`;

      if (input.type.endsWith('[]')) {
        tupleString = tupleString.concat('[]');
      }

      types.push(tupleString);
    } else if (input.type.endsWith('[]')) {
      const baseType = input.type.slice(0, -2);
      types.push(`${baseType}[] ${input.name}`);
    } else {
      types.push(`${input.type} ${input.name}`);
    }
  }

  return types;
}
