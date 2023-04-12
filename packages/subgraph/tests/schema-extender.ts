import {CodeBlockWriter, Project} from 'ts-morph';

function main() {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath('./generated/schema.ts');
  const sourceMethodFile = project.addSourceFileAtPath(
    './tests/helpers/method-classes.ts'
  );

  const outputFile = project.createSourceFile(
    './tests/helpers/extended-schema.ts',
    '',
    {
      overwrite: true
    }
  );

  // Get original Entity classes
  const sourceClasses = sourceFile.getClasses();

  // Get additional method classes
  const sourceMethodClasses = sourceMethodFile.getClasses();

  // Add all imports from sourcemethod-classes
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
    namedImports: ['assert', 'log'],
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
    const newClassName = `Extended${originalClassName}`;
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
      }
    });

    // add methods to generated classes
    sourceMethodClasses.forEach(classDeclaration => {
      if (classDeclaration.getName() === `${originalClassName}Methods`) {
        const methods = classDeclaration.getMethods();

        methods.forEach(method => {
          let returnType = method.getReturnTypeNode()?.getText() || '';
          if (returnType === `${originalClassName}Methods`) {
            returnType = `Extended${originalClassName}`;
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
      parameters: [
        {
          name: 'debug',
          type: 'boolean',
          initializer: 'false'
        }
      ],
      statements: (writer: CodeBlockWriter) => {
        writer.writeLine(`let entity = ${originalClassName}.load(this.id);`);
        writer.writeLine(`if (!entity) throw new Error("Entity not found");`);
        writer.writeLine(`let entries = entity.entries;`);
        writer.write('for (let i = 0; i < entries.length; i++)').block(() => {
          writer.writeLine(`let key = entries[i].key;`);

          writer.write('if (debug)').block(() => {
            writer.writeLine(`log.debug('asserting for key: {}', [key]);`);
          });

          writer.writeLine(`let value = this.get(key);`);

          writer
            .write('if (!value)')
            .block(() => {
              writer.write('if (debug)').block(() => {
                writer.writeLine(
                  `log.debug('value is null for key: {}', [key]);`
                );
              });
            })
            .write('else')
            .block(() => {
              writer.write('if (debug)').block(() => {
                writer.writeLine(
                  `log.debug('asserting with value: {}', [value.displayData()]);`
                );
              });

              writer.writeLine(
                `assert.fieldEquals("${originalClassName}", this.id, key, value.displayData());`
              );
            });
        });
      }
    });
  });

  // Save the changes
  outputFile.saveSync();
}

main();
