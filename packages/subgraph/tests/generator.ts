import {ClassDeclaration, CodeBlockWriter, Project} from 'ts-morph';

function main() {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath('./generated/schema.ts');
  const sourceMethodFile = project.addSourceFileAtPath(
    './tests/helpers/methodClasses.ts'
  );

  const outputFile = project.createSourceFile(
    './tests/helpers/schemaBuilders.ts',
    '',
    {
      overwrite: true
    }
  );

  // Get original Entity classes
  const sourceClasses = sourceFile.getClasses();

  // Get additional method classes
  const sourceMethodClasses = sourceMethodFile.getClasses();

  // Add all imports from sourceMethodClasses
  const methodsImportDeclarations = sourceMethodFile.getImportDeclarations();
  methodsImportDeclarations.forEach(importDeclaration => {
    if (
      importDeclaration.getModuleSpecifierValue() !== '../../generated/schema'
    ) {
      outputFile.addImportDeclaration(importDeclaration.getStructure());
    }
  });

  // Import assert into generated file
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
    moduleSpecifier: `../../generated/${sourceFileNameWithoutExtension}`
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

    // Create a new constructor that calls super() with a default id.
    newClass.addConstructor({
      parameters: [],
      statements: (writer: CodeBlockWriter) => {
        const defaultEntityId = '0x1';
        writer.writeLine(`super('${defaultEntityId}');`);

        // classDeclaration.getSetAccessors().forEach(accessor => {
        //   // Extract the property name from the accessor name
        //   const propertyName = accessor.getName();

        //   if (propertyName !== 'id') {
        //     const value = DEFAULTS_VALUES[originalClassName][propertyName];

        //     writer.writeLine(`this.${propertyName} = ${value};`);
        //   }
        // });
      }
    });

    // add methods to generated classes
    sourceMethodClasses.forEach(classDeclaration => {
      if (classDeclaration.getName() === `${originalClassName}Methods`) {
        const methods = classDeclaration.getMethods();

        methods.forEach(method => {
          let returnType = method.getReturnTypeNode()?.getText() || '';
          if (returnType === `${originalClassName}Methods`) {
            returnType = `${originalClassName}Builder`;
          }

          const newMethod = newClass.addMethod({
            name: method.getName(),
            returnType: returnType
          });

          const parameters = method.getParameters().map(parameter => {
            return {
              name: parameter.getName(),
              type: parameter.getTypeNode()?.getText() || '',
              hasQuestionToken: parameter.hasQuestionToken(),
              initializer: parameter.getInitializer()?.getText(),
              decorators: parameter
                .getDecorators()
                .map(decorator => decorator.getStructure())
            };
          });

          newMethod.addParameters(parameters);

          const statements = method
            .getStatements()
            .map(statement => statement.getText());
          newMethod.addStatements(statements);
        });
      }
    });

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
        // writer.writeLine('  log.debug("key = {}",[key]);');
        writer.writeLine(`  let value = this.get(key);`);
        writer.writeLine(`  if (!value) {`);
        writer.writeLine(`    throw new Error("value is null");`);
        writer.writeLine(`  }`);
        writer.writeLine(
          `   assert.fieldEquals("${originalClassName}", this.id, key, value.displayData());`
        );
        writer.writeLine(`}`);
      }
    });
  });

  // Save the changes
  outputFile.saveSync();
}

main();
