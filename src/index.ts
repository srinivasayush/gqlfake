#!/usr/bin/env node

import { Command } from 'commander';
import { generateCommand } from './commands/generate';
import { exportFirestoreCommand } from './commands/exportFirestore';


const main = async () => {
  const program = new Command();

  program
  .addCommand(generateCommand)
  .addCommand(exportFirestoreCommand)
  

  program.parse()
}

main()
