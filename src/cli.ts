#!/usr/bin/env node

import { Command } from 'commander';
import { TOOL_DESCRIPTION, VERSION } from './constants';
import {
  generateCommand,
  exportFirestoreCommand,
  compileCommand
} from './commands';


const main = async () => {
  const program = new Command();

  program.version(VERSION)
  program.description(TOOL_DESCRIPTION)

  program
  .addCommand(generateCommand)
  .addCommand(exportFirestoreCommand)
  .addCommand(compileCommand)
  

  program.parse()
}

main()
