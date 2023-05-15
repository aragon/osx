export function getMetadataTypes(inputs: any): string[] {
  const types: string[] = [];

  for (const input of inputs) {
    if (input.type === 'tuple') {
      let tupleResult = getMetadataTypes(input.components).join(', ');
      types.push(`tuple(${tupleResult})`);
    } else if (input.type.endsWith('[]')) {
      const baseType = input.type.slice(0, -2);
      types.push(`${baseType}[] ${input.name}`);
    } else {
      types.push(`${input.type} ${input.name}`);
    }
  }

  return types;
}
