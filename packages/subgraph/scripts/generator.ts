// generate-classes.ts
import {CodeBlockWriter, Project} from 'ts-morph';

function main() {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath('./generated/schema.ts');
  const outputFile = project.createSourceFile(
    './generated/builders/schemaBuilders.ts',
    '',
    {
      overwrite: true
    }
  );

  const sourceClasses = sourceFile.getClasses();

  // import assert into generated file
  outputFile.addImportDeclaration({
    namedImports: ['assert'],
    moduleSpecifier: `matchstick-as`
  });
  // Add import statements for the original classes
  const sourceFileNameWithoutExtension = sourceFile.getBaseNameWithoutExtension();
  outputFile.addImportDeclaration({
    namedImports: sourceClasses.map(
      classDeclaration => classDeclaration.getName() as string
    ),
    moduleSpecifier: `../${sourceFileNameWithoutExtension}`
  });

  // Iterate through the classes in the source file
  sourceClasses.forEach(classDeclaration => {
    // Create a new class based on the original one
    const originalClassName = classDeclaration.getName() as string;
    const newClassName = `${originalClassName}Builder`;
    const newClass = outputFile.addClass({
      name: newClassName,
      isExported: true,
      extends: originalClassName
    });

    // Create a new constructor that calls super() with the appropriate arguments
    newClass.addConstructor({
      parameters: [],
      statements: (writer: CodeBlockWriter) => {
        const defaultEntityId = '123';
        writer.writeLine(`super('${defaultEntityId}');`);
        classDeclaration.getSetAccessors().forEach(accessor => {
          // Extract the property name from the accessor name
          const propertyName = accessor.getName();

          if (propertyName !== 'id') {
            writer.writeLine(`this.${propertyName} = '${propertyName}';`);
          }
        });
      }
    });

    // Iterate through the accessors of the original class
    // classDeclaration.getSetAccessors().forEach(accessor => {
    //   // Extract the property name from the accessor name
    //   const propertyName = accessor.getName();

    //   // Add a new property to the generated class
    //   newClass.addProperty({
    //     name: propertyName,
    //     type: 'string',
    //     isReadonly: false,
    //     isStatic: false,
    //     isAbstract: false
    //   });
    // });

    // Add a new method to the generated class
    // newClass.addMethod({
    //   name: 'newMethod',
    //   returnType: 'void',
    //   statements: (writer: CodeBlockWriter) => {
    //     const methodString = newMethod.toString();
    //     const methodBodyBeginIndex = methodString.indexOf('{');
    //     const methodBody = methodString.substring(
    //       methodBodyBeginIndex + 1,
    //       methodString.length - 1
    //     );

    //     // Use the method body string as the statements for the new class method
    //     writer.write(methodBody);
    //   }
    // });

    newClass.addMethod({
      name: 'buildOrUpdate',
      returnType: 'void',
      statements: (writer: CodeBlockWriter) => {
        writer.writeLine('this.save();');
      }
    });

    newClass.addMethod({
      name: 'assertEntity',
      returnType: 'void',
      statements: (writer: CodeBlockWriter) => {
        writer.writeLine(`let entity = ${originalClassName}.load(this.id);`);
        writer.writeLine(`if (!entity) throw new Error("Entity not found");`);
        writer.writeLine(`let entries = entity.entries;`);
        writer.writeLine(`for (let i = 0; i < entries.length; i++) {`);
        writer.writeLine(`  let key = entries[i].key;`);
        writer.writeLine(`  let value = this.get(key)?.toString();`);
        writer.writeLine(`  if (!value) {`);
        writer.writeLine(`    throw new Error("value is null");`);
        writer.writeLine(`  }`);
        writer.writeLine(
          `   assert.fieldEquals("${originalClassName}", this.id, key, value);`
        );
        writer.writeLine(`}`);
      }
    });
  });

  // Save the changes
  outputFile.saveSync();
}

main();
