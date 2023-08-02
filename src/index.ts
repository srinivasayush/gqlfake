#!/usr/bin/env node

import { Command } from 'commander';
import { generateCommand } from './commands/generate';


const main = async () => {
  const program = new Command();

  program.addCommand(generateCommand)

  program.parse()
}

main()
