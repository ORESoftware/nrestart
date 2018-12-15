#!/usr/bin/env node
'use strict';

import * as cp from 'child_process';
import * as procs from './procs';
import {killProcess} from './helpers';
import log from './logger';

// log.error(process.argv);

const crosstermIndex = process.env.crossterm_index;
const crosstermJSON = crosstermIndex ? process.env['crossterm_val_' + crosstermIndex] : '[]';

// log.error(process.env.crossterm_index);
// log.error({crosstermJSON});

const index = process.argv.indexOf('--');

if (index < 2) {
  throw 'Cannot find index of -- argument.';
}

const args = process.argv.slice(index + 1);

const additionalArgs = (function(): Array<any>{
    try{
      return JSON.parse(crosstermJSON);
    }
    catch(err){
      log.error(err);
      return [];
    }
})();

const startProcess = () => {
  
  const k = cp.spawn('bash', [], {
    env: Object.assign({}, process.env, {
      FORCE_COLOR: 1
    }),
    stdio: ['pipe', 1, 2]
  });
  
  k.once('exit', code => {
    procs.deadProcs.add(k);
  });
  
  // k.stdout.pipe(process.stdout);
  // k.stderr.pipe(process.stderr);
  
  k.stdin.end(args.join(' ') + ' ' + additionalArgs.join(' '));
  
  return k;
};

const container = {
  k: startProcess()
};

process.stdin.resume().on('data', d => {
  
  const cmd = String(d).trim().toLowerCase();
  
  if (cmd === 'exit1') {
    
    killProcess(container.k, (err, val) => {
      console.log('previous command exitted.');
    });
  }
  
  if (cmd === 'exit') {
    
    killProcess(container.k, (err, val) => {
      err && log.warn(err.message | err);
      console.log('Child process killed, now exiting.');
      process.exit(0);
    });
  }
  
  if (cmd === 'rs') {
    
    killProcess(container.k, (err, val) => {
      err && log.warn(err.message | err);
      container.k = startProcess();
    });
    
  }
  
});
