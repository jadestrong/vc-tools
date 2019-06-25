#!/usr/bin/env node

'use strict';

require('colorful').colorful();

const program = require('commander');
const packageInfo = require('../../package.json');

program
    .version(packageInfo.version)
    .command('run [name]', 'run specified task')
    .parse(process.argv);

// https://github.com/tj/commander.js/pull/260
const proc = program.runningCommand;
if (proc) {
    // 监听指定的信号，如C-c等退出信号，则退出该线程
    proc.on('close', process.exit.bind(process));
    proc.on('error', () => {
        process.exit(1);
    });
}

process.on('SIGINT', () => {
    if (proc) {
        proc.kill('SIGKILL');
    }
    process.exit(0);
});

// 当执行命令时未输入子命令时，打印帮助信息
const subCmd = program.args[0];
if (!subCmd || subCmd !== 'run') {
    program.help();
}
