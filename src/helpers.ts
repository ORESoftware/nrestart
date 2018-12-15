'use strict';

import * as cp from 'child_process';
import * as procs from './procs';
import {ChildProcess} from 'child_process';
import * as async from 'async';
import chalk from 'chalk';
import log from './logger';

export type EVCb<T> = (err: any, val?: T) => void;

export const killProcess = (proc: ChildProcess, cb: EVCb<any>) => {
  
  if (procs.deadProcs.has(proc)) {
    return process.nextTick(cb);
  }
  
  if (procs.toBeKilled.has(proc)) {
    return process.nextTick(cb);
  }
  
  procs.toBeKilled.add(proc);
  
  const kill = () => {
    
    proc.kill('SIGINT');
    
    setTimeout(() => {
      
      if (procs.deadProcs.has(proc)) {
        return cb(null, null);
      }
      
      setTimeout(() => {
        if (!procs.deadProcs.has(proc)) {
          proc.kill('SIGKILL');
        }
        cb(null, null);
      }, 800);
      
    }, 500);
    
  };
  
  async.series([
    cb => {
      
      getChildPids(proc.pid, (err, results) => {
        
        if (err) {
          return cb(err, null);
        }
        
        if (results.length < 1) {
          return process.nextTick(cb);
        }
        
        const killer = cp.spawn('bash');
        const cmd = `
        
        list=( ${results.join(' ')} );
        
        for v in "\${list[@]}"; do echo "$v"; done | xargs kill -INT;
        
        sleep 0.5;
        
        `;
        
        log.info('Running command:', chalk.blueBright(cmd));
        killer.stdin.end(cmd);
        killer.stderr.pipe(process.stderr);
        killer.once('exit', code => {
          if (code > 0) {
            log.warn('Exit code of the following command was non-zero:', cmd);
          }
          cb(null);
        });
        
      });
    },
    cb => {
      
      getChildPids(proc.pid, (err, results) => {
        
        if (err) {
          return cb(err, null);
        }
        
        if (results.length < 1) {
          return process.nextTick(cb);
        }
        
        const killer = cp.spawn('bash');
        // const cmd = `pgrep -P ${proc.pid} | xargs kill -INT; sleep 0.6; pgrep -P ${proc.pid} | xargs kill -9; sleep 0.1;`;
        const cmd = `
        
        list=( ${results.join(' ')} );
        for v in "\${list[@]}"; do echo "$v"; done | xargs kill -9;
        
        `;
        
        log.info('Running command:', chalk.blueBright(cmd));
        killer.stdin.end(cmd);
        killer.stderr.pipe(process.stderr);
        
        killer.once('exit', code => {
          if (code > 0) {
            log.warn('Exit code of the following command was non-zero:', cmd);
          }
          cb(null);
        });
        
      });
    }
  
  ], err => {
    
    if (err) {
      return cb(err, null);
    }
    
    kill();
    
  });
  
  // if (serviceInfo && serviceInfo.pids.length > 0) {
  //   log.warn(chalk.magenta('Going to kill these pids:'), chalk.magenta.bold(util.inspect(serviceInfo.pids)));
  //   const killer = cp.spawn('bash');
  //   killer.stdin.end(`kill -INT ${serviceInfo.pids.join(' ')}`);
  //   killer.stderr.pipe(process.stderr);
  //   killer.once('exit', kill);
  //   return;
  // }
  //
  // log.warn(chalk.red('No child pids to kill.'));
  // process.nextTick(kill);
  
};

export const getChildPids = (pid: number, cb: EVCb<Array<string>>) => {
  
  const pidList: Array<string> = [];
  
  const getMoreData = (pid: string, cb: EVCb<null>) => {
    
    const k = cp.spawn('bash');
    const cmd = `pgrep -P ${pid}`;
    k.stderr.pipe(process.stderr);
    k.stdin.end(cmd);
    let stdout = '';
    k.stdout.on('data', d => {
      stdout += String(d || '').trim();
    });
    
    k.once('exit', code => {
      
      if (code > 0) {
        log.debug('The following command exited with non-zero code:', code, cmd);
      }
      
      const list = String(stdout).split(/\s+/).map(v => String(v || '').trim()).filter(Boolean);
      
      if(code > 0 && list.length > 0){
        log.warning('The following command exited with non-zero code:', code, cmd);
      }
      
      if (list.length < 1) {
        return cb(null);
      }
      
      for (let v of list) {
        pidList.push(v);
      }
      
      async.eachLimit(list, 3, getMoreData, cb);
      
    });
  };
  
  getMoreData(String(pid), err => {
    cb(err, pidList);
  });
  
};
