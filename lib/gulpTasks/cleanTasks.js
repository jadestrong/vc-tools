const fs = require('fs');
// const shelljs = require('shelljs');
const rimraf = require('rimraf');
const resolveCwd = require('../resolveCwd');

function cleanCompile() {
  try {
    if (fs.existsSync(resolveCwd('lib'))) {
      // shelljs.rm('-rf', resolveCwd('lib'));
        rimraf.sync(resolveCwd('lib'));
    }
    if (fs.existsSync(resolveCwd('es'))) {
      // shelljs.rm('-rf', resolveCwd('es'));
        rimraf.sync(resolveCwd('es'));
    }
    if (fs.existsSync(resolveCwd('assets'))) {
      // shelljs.rm('-rf', resolveCwd('assets/*.css'));
        rimraf.sync(resolveCwd('assets/*.css'));
    }
  } catch (err) {
    console.log('Clean up failed:', err);
    throw err;
  }
}

function cleanBuild() {
  if (fs.existsSync(resolveCwd('build'))) {
    // shelljs.rm('-rf', resolveCwd('build'));
        rimraf.sync(resolveCwd('build'));
  }
}

function clean() {
  cleanCompile();
  cleanBuild();
}

function registerTasks(gulp) {
  gulp.task(
    'clean',
    done => {
      clean();
      done();
    }
  );

  gulp.task(
    'cleanCompile',
    done => {
      cleanCompile();
      done();
    }
  );

  gulp.task(
    'cleanBuild',
    done => {
      cleanBuild();
      done();
    }
  );
}

registerTasks.cleanCompile = cleanCompile;
registerTasks.cleanBuild = cleanBuild;
registerTasks.clean = clean;

module.exports = registerTasks;
