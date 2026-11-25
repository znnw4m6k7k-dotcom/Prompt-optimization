#!/usr/bin/env node
import { exitCodeFor, reportCliError, runCli } from '../src/cli.js';

runCli(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    reportCliError(error, process.argv.includes('--json'));
    process.exitCode = exitCodeFor(error);
  });
