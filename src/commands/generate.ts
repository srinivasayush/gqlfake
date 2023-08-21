import { parse, ObjectTypeDefinitionNode, FieldDefinitionNode, DocumentNode } from 'graphql/language'
import * as fs from 'fs'
import * as fsPromises from 'fs/promises'
import { faker } from '@faker-js/faker';
import { Command } from 'commander';
import { integerValidator } from '../utils'
import { GENERATE_DIRECTIVE_DATA_ARGUMENT_NAME, GENERATE_DIRECTIVE_NAME, INIT_DIRECTIVE_CODE_ARGUMENT_NAME, INIT_DIRECTIVE_NAME } from '../constants';
import { errorStyle } from '../textStyles';
import { GraphQLError } from 'graphql';
import path from 'path'
import * as vm from 'node:vm'
import { findDirectiveArguments } from '../utils/directives';

// Options for the generate command
interface GenerateOptions {
    schemaPath: string
    numDocuments: number
}

const generateAction = async (options: GenerateOptions) => {

    // Check that the schema file exists
    if (!fs.existsSync(options.schemaPath)) {
        console.error(errorStyle(`File ${options.schemaPath} not found!`));
        process.exit(1)
    }
    
    // Read and parse schema
    const schemaContentBuffer = await fsPromises.readFile(options.schemaPath)

    let graphQLDocument: DocumentNode | undefined = undefined;

    try {
      graphQLDocument = parse(schemaContentBuffer.toString())
    } catch (error) {

      if(error instanceof GraphQLError) {
        console.error(errorStyle('There was an error parsing your GraphQL schema'));
        
        console.error(errorStyle(`${error.name}: ${error.message}`));

        // Log each location where the error is present
        if(error.locations !== undefined) {
          for(let location of error.locations) {
            console.error(errorStyle(`- Location: Line ${location.line}, Column: ${location.column}. ${options.schemaPath}:${location.line}:${location.column}`));
          }
        }
      }
      else {
        console.error(`Error parsing ${options.schemaPath}`);
      }

      process.exit(1)
    }


    // Define a context for all scripts to run
    const scriptContext = vm.createContext({
      faker: faker,
      console: console
    })


    // Get all types defined in schema
    const definitions = graphQLDocument.definitions.filter(definition => definition.kind === 'ObjectTypeDefinition') as ObjectTypeDefinitionNode[]

    for(let definition of definitions) {

      const typeName = definition.name.value  
      
      const initDirectiveArguments = findDirectiveArguments({
        definition: definition,
        directiveName: INIT_DIRECTIVE_NAME,
        directiveIsRequired: false,
        directiveArguments: [
          { name: INIT_DIRECTIVE_CODE_ARGUMENT_NAME, required: true }
        ]
      })

      if (initDirectiveArguments !== null) {
        const initScript = initDirectiveArguments[INIT_DIRECTIVE_CODE_ARGUMENT_NAME]!

        const asyncWrapperFunction = 
        `
        (async () => {
          ${initScript}
        })()
        `

        await vm.runInContext(asyncWrapperFunction, scriptContext)
      }


      // documentsForType is initialized with options.numDocuments empty objects
      const documentsForType: any[] = [...Array(options.numDocuments).keys()].map(i => {
        let emptyObj = {}
        return emptyObj
      })
  
      // Only process the type definitions that have fieldss
      if(definition.fields === undefined || definition.fields === null || definition.fields.length === 0) {
        return;
      }

      for(let index = 0; index < options.numDocuments; index++) {

        let field: FieldDefinitionNode
        for (field of definition.fields) {
          const fieldName = field.name.value
          
          const generateDirectiveArguments = findDirectiveArguments({
            definition: field,
            directiveName: GENERATE_DIRECTIVE_NAME,
            directiveIsRequired: false,
            directiveArguments: [
              { name: GENERATE_DIRECTIVE_DATA_ARGUMENT_NAME, required: true }
            ]
          })

          if (generateDirectiveArguments === null) {
            // Move to next field
            continue;
          }
          
          const dataScript = generateDirectiveArguments[GENERATE_DIRECTIVE_DATA_ARGUMENT_NAME]!

          const asyncWrapperFunction = 
          `
          (async () => {
            ${dataScript}
          })()
          `

          const populatedData = await vm.runInContext(asyncWrapperFunction, scriptContext)
          documentsForType[index][fieldName] = populatedData
        } // fields loop

      } // numDocuments loop
  

      // Export documentsForType to JSON
      if (!fs.existsSync(`./datagen/`)) {
        await fsPromises.mkdir(`./datagen/`, { recursive: true })
      }
      

      await fsPromises.writeFile(
        `./datagen/${typeName}.json`, 
        JSON.stringify(documentsForType, null, 2)
      )
    } // definitions loop
}


// Create the generate command
const generateCommand = new Command()
                    .name('generate')
                    .description('Generates fake data using your GraphQL schema')
                    .requiredOption(
                      '-s, --schema-path <path>', 
                      'The path to your GraphQL schema file',
                      (value: any) => path.resolve(value)
                    )
                    .option<number>('-n, --num-documents <integer>',
                                    'The number of JSON objects to be generated for each type defined in your GraphQL schema',
                                    (value, _) => integerValidator('--num-documents', value),
                                    1 // default value for --num-documents
                    )
                    .action(generateAction)


export { generateCommand, generateAction, GenerateOptions }
