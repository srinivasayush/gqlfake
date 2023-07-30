import { parse, ObjectTypeDefinitionNode, FieldDefinitionNode } from 'graphql/language'
import * as fs from 'fs'
import * as fsPromises from 'fs/promises'
import { faker } from '@faker-js/faker';
import ScopedEval from 'scoped-eval';

const main = async () => {
  const fileContents = await fsPromises.readFile('./schema.graphql')

  const document = parse(fileContents.toString())

  // Get all types defined in schema
  const definitions = document.definitions.filter(definition => definition.kind === 'ObjectTypeDefinition') as ObjectTypeDefinitionNode[]

  definitions.forEach(async definition => {

    // Placeholder constants
    const NUM_DOCUMENTS = 5
    const EXPORT_TO_JSON = true

    // documentsForType is initialized with NUM_DOCUMENTS empty objects
    const documentsForType: any[] = [...Array(NUM_DOCUMENTS).keys()].map(i => {
      let emptyObj = {}
      return emptyObj
    })

    // Only process the type definitions that have fieldss
    if(definition.fields === undefined || definition.fields === null || definition.fields.length === 0) {
      return;
    }

    // Loop through all fields (properties) of a type (definition)
    for (let i = 0; i < definition.fields.length; i++) {

      let field: FieldDefinitionNode = definition.fields[i]
      
      // Get all @generate directives next to a field
      const generateDirectives = (field.directives!.filter(directive => directive.name.value === 'generate'))

      if (generateDirectives.length === 0) {
        // No @generate directives attached to field
        continue; // Move to next field
      }

      if (generateDirectives.length > 1) {
        console.error('CANNOT')
        process.exit(1)
      }

      // Get first (and only) @generate directive
      const generateDirective = generateDirectives[0]
      

      if (generateDirective.arguments === undefined || generateDirective.arguments.length === 0) {
        console.error('Cannot have 0 arguments in an @generate directive.')
        process.exit(1)
      }

      if (generateDirective.arguments.length > 1) {
        console.error('The @generate directive ');
        process.exit(1)
      }

      const fieldName = field.name.value

      // Get data type passed into @generate's faker parameter
      const dataType = (generateDirective.arguments[0].value as any).value as string

      const evaluator = new ScopedEval();

      // Generate fake data and put it into documentsForType
      for (let i = 0; i < NUM_DOCUMENTS; i++) {
        const fakeData = evaluator.eval(`faker.${dataType}()`, { faker: faker })
        documentsForType[i][fieldName] = fakeData
      }
    }

    const typeName = definition.name.value

    if(EXPORT_TO_JSON) {
      // Export documentsForType to JSON

      if (!fs.existsSync(`./datagen/`)) {
        await fsPromises.mkdir(`./datagen/`, { recursive: true })
      }

      await fsPromises.writeFile(
        `./datagen/${typeName}.json`, 
        JSON.stringify(documentsForType, null, 2)
      )
    }
  })

}

main()
