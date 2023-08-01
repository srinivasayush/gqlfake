import chalk from 'chalk'

const integerValidator = (flagName: string, value: any) => {
    const parsedIntValue = parseInt(value)

    if(isNaN(parsedIntValue)) {
        console.error(chalk.red(`${flagName} "${value}" is not an integer`));
        process.exit(1)
    }

    return parsedIntValue
}

export { integerValidator }
