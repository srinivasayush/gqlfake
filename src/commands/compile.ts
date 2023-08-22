import * as fsPromises from 'fs/promises'
import { Command } from 'commander';
import * as path from 'path'
import { errorStyle, infoStyle } from '../textStyles';
import { TOOL_NAME } from '../constants';
import pluralize from 'pluralize';
import { getAbsolutePOSIXPath } from '../utils/absolutePosixPath';

interface CompileOptions {
    outputPath: string
}

const compileAction = async (options: CompileOptions) => {
    const fileExtension = path.extname(options.outputPath)
    const relativeOutputPath = path.relative('./', options.outputPath) // For output purposes

    if (fileExtension !== '.json') {
        console.error(
            errorStyle(`Cannot write to ${options.outputPath} because it is not a JSON file!`)
        );
        
        process.exit(1)
    }

    // Get the names of all files in the datagen directory
    let filenames: string[] = [];
    try {
        const absoluteDataDirectoryPath = getAbsolutePOSIXPath('./datagen');
        filenames = await fsPromises.readdir(absoluteDataDirectoryPath);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.error(
                errorStyle(
                    `Couldn't find a datagen directory. Use the \`${TOOL_NAME} generate\` command to create one. Run \`${TOOL_NAME} generate --help\` to learn more about the generate command.`
                )
            );
        }

        process.exit(1);
    }

    // Object containing all the compiled data
    // Each key will contain the data from each generated file
    const compiledData: { [key: string]: object[] } = {}

    filenames.forEach((filename) => {
        const filenameWithoutExtension = path.parse(filename).name;
        const keyName = pluralize(filenameWithoutExtension).toLowerCase();

        // Absolute and relative file paths to the file to be read from
        const absoluteFilePath = getAbsolutePOSIXPath(`./datagen/${filename}`);
        const relativeFilePath = path.relative('./', absoluteFilePath)

        // This check is necessary because the output file could be in the datagen
        // directory as well
        if (absoluteFilePath === options.outputPath) {
            // Don't process the output file itself - we don't need to read data from it
            return; 
        }

        console.log(infoStyle(`Adding documents from ${relativeFilePath} to key "${keyName}" in ${relativeOutputPath}"`));

        const data: object[] = require(absoluteFilePath);
        compiledData[keyName] = data;
    });

    await fsPromises.writeFile(
        options.outputPath,
        JSON.stringify(compiledData, null, 2)
    )

    console.log(infoStyle(`Compiled data has been written to ${options.outputPath}`));
}


// Create the compile command
const compileCommand = new Command()
                    .name('compile')
                    .description('Compiles all generated data into one file')
                    .option(
                        '-o, --output-path <path>',
                        'The path to the JSON file that you want to compile all the data to',
                        (value: any) => getAbsolutePOSIXPath(value), // transform input parameter
                        getAbsolutePOSIXPath('./datagen/db.json') // default value
                    )
                    .action(compileAction)


export { compileCommand, compileAction, CompileOptions }
