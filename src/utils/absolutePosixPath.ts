import path from 'path'

export const getAbsolutePOSIXPath = (value: string) => {

    // Get absolute path
    const absolutePath = path.resolve(value)

    // Return path with POSIX separators
    return absolutePath.split(path.sep).join(path.posix.sep)
}
