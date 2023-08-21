import { FieldDefinitionNode, ObjectTypeDefinitionNode } from 'graphql/language';
import { errorStyle } from '../textStyles';

export interface FindDirectiveArgumentsOptions {
  definition: ObjectTypeDefinitionNode | FieldDefinitionNode
  directiveName: string
  directiveIsRequired: boolean
  directiveArguments: { name: string, required: boolean }[]
}


// Returns a mapping of the name of a directive argument to its value for a specified directive
export const findDirectiveArguments = (
  options: FindDirectiveArgumentsOptions
): Record<string, string | null> | null => {

  const { definition, directiveName, directiveIsRequired, directiveArguments } = options

  // 1. Find the directive called directiveName attached to the TypeDefinitionNode.
  const directives = definition.directives?.filter((dir) => dir.name.value === directiveName);

  if (directives === undefined || directives.length === 0) {
    if (directiveIsRequired) {
      // If not found, exit the process with error code 1.
      console.error(
        errorStyle(`Directive '${directiveName}' not found on type ${definition.name.value}.`)
      );
      process.exit(1);
    }

    else {
      return null;
    }
  }

  // 2. If there is more than one directive with directiveName, exit the process with error code 1.
  if (directives.length > 1) {
    console.error(
      errorStyle(`You cannot have more than 1 @${directiveName} directive next to one type. The erroneous field is "${definition.name.value}"`)
    );
    process.exit(1);
  }

  const directiveArgs: Record<string, string | null> = {};

  const directive = directives[0] // The actual directive to process

  // 3. Loop through the arguments of the directive.
  for (const arg of directive.arguments || []) {
    const argName = arg.name.value;

    // Names of the directive arguments to search for and get the values of
    const directiveArgumentNames = directiveArguments.map(arg => arg.name)

    // Check if the directiveArguments parameter contains the name of the argument currently being processed
    if (directiveArgumentNames.includes(argName)) {
      // 5. If any one of the arguments in directiveArguments is found more than once, print which one and exit the process with error code 1.
      if (directiveArgs[argName] !== undefined) {
        console.error(`Duplicate argument '${argName}' found in directive '${directiveName}'.`);
        process.exit(1);
      }

      // 4. Only return the mapping for the arguments specified by directiveArguments.
      directiveArgs[argName] = (arg.value as any).value;
    } else {
      // Print that the program doesn't accept that directive, and print that the program only accepts directives specified by directiveArguments.
      console.error(
        errorStyle(`Directive argument '${argName}' is not accepted. Only arguments [${directiveArgumentNames.join(', ')}] are accepted.`)
      );
      process.exit(1);
    }
  }

  // 6. If any one of the arguments specified directiveArguments is missing in the actual directive, put null in the mapping for that argument name.
  for (const argumentData of directiveArguments) {
    const argName = argumentData.name
    if (directiveArgs[argName] === undefined) {
      if (argumentData.required) {

        // TODO: Change error message based on definition.kind
        console.error(
          errorStyle(
            `Missing \`${argName}\` argument in the @${directiveName} directive next to "${definition.name.value}"`
          )
        )

        process.exit(1)
      } else {
        directiveArgs[argName] = null;
      }
    }
  }

  return directiveArgs;
}
