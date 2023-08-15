#!/usr/bin/env node

import { Command } from 'commander';
import { generateCommand } from './commands/generate';
import { exportFirestoreCommand } from './commands/exportFirestore';
import { TOOL_DESCRIPTION, VERSION } from './constants';


const main = async () => {
  const program = new Command();

  program.version(VERSION)
  program.description(TOOL_DESCRIPTION)

  program
  .addCommand(generateCommand)
  .addCommand(exportFirestoreCommand)
  

  program.parse()
}

main()
