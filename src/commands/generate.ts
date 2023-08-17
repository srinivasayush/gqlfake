import { parse, ObjectTypeDefinitionNode, FieldDefinitionNode, DocumentNode } from 'graphql/language'
import * as fs from 'fs'
import * as fsPromises from 'fs/promises'
import { faker } from '@faker-js/faker';
import { Command } from 'commander';
import { integerValidator } from '../utils'
import { GENERATE_DIRECTIVE_DATA_ARGUMENT_NAME, GENERATE_DIRECTIVE_NAME } from '../constants';
import { errorStyle } from '../textStyles';
import { GraphQLError } from 'graphql';
import path from 'path'
import * as vm from 'node:vm'

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
    
  
    // Get all types defined in schema
    const definitions = graphQLDocument.definitions.filter(definition => definition.kind === 'ObjectTypeDefinition') as ObjectTypeDefinitionNode[]
  

    // Define a context for all scripts to run
    const scriptContext = vm.createContext({
      faker: faker,
      console: console,
    })

    for(let definition of definitions) {
      const typeName = definition.name.value
  
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
          
          // Get all @generate directives next to a field
          const generateDirectives = (field.directives!.filter(directive => directive.name.value === GENERATE_DIRECTIVE_NAME))
    
          if (generateDirectives.length === 0) {
            // No @generate directives attached to field
            continue; // Move to next field
          }
    
          if (generateDirectives.length > 1) {
            console.error(
              errorStyle(
                `You cannot have more than 1 @${GENERATE_DIRECTIVE_NAME} directive next to one field. The erroneous field is "${fieldName}" under type "${typeName}"`
              )
            )
            process.exit(1)
          }
    
          // Get first (and only) @generate directive
          const generateDirective = generateDirectives[0]
          
    
          if (generateDirective.arguments === undefined || generateDirective.arguments.length === 0) {
            
            console.error(
              errorStyle(
                `Missing \`${GENERATE_DIRECTIVE_DATA_ARGUMENT_NAME}\` argument in the @${GENERATE_DIRECTIVE_NAME} directive next to field "${fieldName}" under type "${typeName}"`
              )
            )
            process.exit(1)
          }
  
  
          if (generateDirective.arguments.length > 1) {
            console.error(
              errorStyle(
                `You have passed too many arguments into the @${GENERATE_DIRECTIVE_NAME} directive next to "${fieldName}" under type "${typeName}". Only one is allowed.`
              )
            )
            process.exit(1)
          }
  
  
          // Check that the generate directive has been passed an argument with the correct name
          const nameOfArgumentPassedIn = generateDirective.arguments[0].name.value
          if (nameOfArgumentPassedIn != GENERATE_DIRECTIVE_DATA_ARGUMENT_NAME) {
            console.error(
              errorStyle(
                `The @${GENERATE_DIRECTIVE_NAME} directive only accepts one argument called "${GENERATE_DIRECTIVE_DATA_ARGUMENT_NAME}". You passed in an argument called "${nameOfArgumentPassedIn}". The erroneous field is "${fieldName}" under type "${typeName}"`
              )
            )
            process.exit(1)
          }
          
          // Get script passed into @generate's data parameter
          const dataScript = (generateDirective.arguments[0].value as any).value as string


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
