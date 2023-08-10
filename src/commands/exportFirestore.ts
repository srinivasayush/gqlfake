import * as fsPromises from 'fs/promises'
import { Command } from 'commander';
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import pluralize from 'pluralize'
import * as path from 'path'

// Options for the export-firestore command
interface ExportFirestoreOptions {
    keypath: string    
}

const exportFirestoreAction = async (options: ExportFirestoreOptions) => {
    let serviceAccount = {}

    const absoluteKeyPath = path.resolve(options.keypath)

    try {
        serviceAccount = require(absoluteKeyPath)
    } catch (error: any) {
        if (error.code === 'MODULE_NOT_FOUND') {
            console.error(`The serviceAccountKey was not found at ${options.keypath}`);   
        }
        process.exit(1)
    }

    initializeApp({
        credential: cert(serviceAccount)
    })

    const db = getFirestore()

    let filenames: string[] = []
    try {
        const absoluteDataDirectoryPath = path.resolve('./datagen')
        filenames = await fsPromises.readdir(absoluteDataDirectoryPath, {
            recursive: false
        })
    } catch (error: any) {
        if(error.code === 'ENOENT') {
            console.error(
                `Couldn't find a datagen directory. Use the gqlfake generate command to create one. Run \`gqlfake generate --help\` to learn more about the generate command.`
            )
        }
        
        process.exit(1)
    }

    filenames.forEach(filename => {

        const filenameWithoutExtension = path.parse(filename).name
        const collectionName = pluralize(filenameWithoutExtension).toLowerCase()

        console.log(`Adding documents from ./datagen/${filename} to collection "${collectionName}"`);
        

        const absoluteFilePath = path.resolve(`./datagen/${filename}`)
        const data: object[] = require(absoluteFilePath)

        data.forEach(async obj => {
            await db.collection(collectionName).add(obj)
        })
    })
}


// Create the generate command
const exportFirestoreCommand = new Command()
                    .name('export-firestore')
                    .requiredOption(
                        '-k, --keypath <path>',
                        '',
                        (value: any) => path.resolve(value)
                    )
                    .action(exportFirestoreAction)


export { exportFirestoreCommand }
