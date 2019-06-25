'use strict';

const gulp = require('gulp');
const path = require('path');
const through2 = require('through2');
const webpack = require('webpack');
const rimraf = require('rimraf');
const babel = require('gulp-babel');
const fs = require('fs-extra');
const argv = require('minimist')(process.argv.slice(2));
const postcss = require('gulp-postcss');
const gulpLess = require('gulp-less');
const chalk = require('chalk');
// const ts = require('gulp-typescript');
const merge2 = require('merge2');
// const glob = require('glob');
// const watch = require('gulp-watch');
const assign = require('object-assign');
// const targz = require('tar.gz');
// const request = require('request');
const minify = require('gulp-babel-minify');
// const prettier = require('gulp-prettier');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
// const stripCode = require('gulp-strip-code');

const resolveCwd = require('./resolveCwd');
const getWebpackConfig = require('./getWebpackConfig');
const { runCmd, getNpmArgs } = require('./util');
const getBabelCommonConfig = require('./getBabelCommonConfig');
// const getNpm = require('./getNpm');
// const tsConfig = require('./getTSCommonConfig')();
// const { tsCompiledDir } = require('./constants');
const { measureFileSizesBeforeBuild, printFileSizesAfterBuild } = require('./FileSizeReporter');
const replaceLib = require('./replaceLib');
const { printResult } = require('./gulpTasks/util');
// const genStorybook = require('./genStorybook');
// const selfPackage = require('../package.json');

const pkg = require(resolveCwd('package.json'));
const cwd = process.cwd();
const lessPath = new RegExp(`(["']${pkg.name})/assets/([^.'"]+).less`, 'g');
// const tsDefaultReport = ts.reporter.defaultReporter();
const src = argv.src || 'src';

// const libDir = 'lib';
// const esDir = 'es';
const libDir = path.join(cwd, 'lib');
const esDir = path.join(cwd, 'es');

const cleanTasks = require('./gulpTasks/cleanTasks');

// const { cleanCompile } = cleanTasks;

cleanTasks(gulp);

// const tsFiles = [
//     `${src}/**/*.@(png|svg|less)`,
//     `${src}/**/*.tsx`,
//     'examples/**/*.tsx',
//     'tests/**/*.tsx',
//     'typings/**/*.d.ts',
// ];

function dist(done) {
    process.env.RUN_ENV = 'PRODUCTION';
    const entry = pkg.config && pkg.config.entry;
    if (!entry) {
        done();
        console.error('no entry in package');
        return;
    }
    let webpackConfig;
    const buildFolder = path.join(cwd, 'dist/');
    if (fs.existsSync(path.join(cwd, 'webpack.config.js'))) {
        webpackConfig = require(path.join(cwd, 'webpack.config.js'))(
            getWebpackConfig({
                common: false,
                inlineSourceMap: false
            }),
            { phase: 'dist' }
        );
    } else {
        const output = pkg.config && pkg.config.output;
        if (output && output.library === null) {
            output.library = undefined;
        }
        webpackConfig = assign(
            getWebpackConfig({
                common: false,
                inlineSourceMap: false,
            }),
            {
                output: Object.assign({
                    path: buildFolder,
                    filename: '[name].js',
                    library: pkg.name,
                    libraryTarget: 'umd',
                    libraryExport: 'default'
                },
                output),
                externals: {
                    vue: {
                        root: 'Vue',
                        commonjs2: 'vue',
                        commonjs: 'vue',
                        amd: 'vue'
                    }
                }
            }
        );
        const compressedWebpackConfig = Object.assign({}, webpackConfig);
        compressedWebpackConfig.entry = {};
        Object.keys(entry).forEach(e => {
            compressedWebpackConfig.entry[`${e}.min`] = entry[e];
        });
        compressedWebpackConfig.plugins = compressedWebpackConfig.plugins.concat([
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
            })
        ]);
        compressedWebpackConfig.optimization = {
            minimizer: [
                new UglifyJsPlugin({
                    cache: true,
                    parallel: true,
                    sourceMap: true,
                    uglifyOptions: {
                        warnings: false,
                    }
                })
            ]
        };
        webpackConfig.entry = entry;
        webpackConfig = [webpackConfig, compressedWebpackConfig];
    }

    measureFileSizesBeforeBuild(buildFolder).then(previousFileSizes => {
        rimraf.sync(buildFolder);
        webpack(webpackConfig, (err, stats) => {
            if (err) {
                console.error('error', err);
            }
            stats.toJson().children.forEach(printResult);
            printFileSizesAfterBuild(stats, previousFileSizes, buildFolder);
            done(err);
        });
    });
    // webpack(webpackConfig, (err, stats) => {
    //     if (err) {
    //         console.log(err.stack || err);
    //         if (err.details) {
    //             console.log(err.details);
    //         }
    //         return;
    //     }

    //     const info = stats.toJson();

    //     if (stats.hasErrors()) {
    //         console.error(info.errors);
    //     }

    //     if (stats.hasWarnings()) {
    //         console.warn(info.warnings);
    //     }

    //     const buildInfo = stats.toString({
    //         colors: true,
    //         children: true,
    //         chunks: false,
    //         modules: false,
    //         chunkModules: false,
    //         hash: false,
    //         version: false,
    //     });
    //     console.log(buildInfo);
    //     done(0);
    // });
}

function babelifyInternal(js, modules) {
    function replacer(match, m1, m2) {
        return `${m1}/assets/${m2}.css`;
    }
    const babelConfig = getBabelCommonConfig(modules);
    babelConfig.babelrc = false;
    delete babelConfig.cacheDirectory;
    if (modules === false) {
        babelConfig.plugins.push(replaceLib);
    }
    // else {
    //     babelConfig.plugins.push(require.resolve('babel-plugin-add-module-exports'));
    // }
    let stream = js.pipe(babel(babelConfig));
    if (argv.compress) {
        stream = stream.pipe(minify());
    }
    return stream
        .pipe(through2.obj(function (file, encoding, next) {
            try {
                const contents = file.contents.toString(encoding).replace(lessPath, replacer);
                file.contents = Buffer.from(contents);
                this.push(file);
                next();
            } catch(err) {
                console.log(err);
            }
        }))
        .pipe(gulp.dest(modules === false ? esDir : libDir));
    // let stream = js.pipe(babel(babelConfig)).pipe(
    //     through2.obj(function(file, encoding, next) {
    //         this.push(file.close());
    //         if (file.path.match(/\/style\/index\.(js|jsx)$/)) {
    //             const content = file.contents.toString(encoding);
    //             file.content = Buffer.from(
    //                 content.replace(/\/style\/?'/g, "/style/css'").replace(/\.less/g, '.css'),
    //             );
    //             file.path = file.path.replace(/index\.(js|jsx)$/, 'css.js');
    //             this.push(file);
    //             next();
    //         } else {
    //             next();
    //         }
    //     }),
    // );

    // if (modules === false) {
    //     stream = stream.pipe(
    //         stripCode({
    //             start_comment: '@remove-on-es-build-begin',
    //             end_comment: '@remove-on-es-build-end',
    //         }),
    //     );
    // }
    // return stream.pipe(gulp.dest(modules === false ? esDir : libDir));
}

function babelify(modules) {
    const streams = [];
    const assets = gulp
          .src([`${src}/**/*.@(png|svg|less|d.ts)`])
          .pipe(gulp.dest(modules === false ? esDir : libDir));
    streams.push(babelifyInternal(gulp.src([`${src}/**/*.js`, `${src}/**/*.jsx`]), modules));
    return merge2(streams.concat([assets]));
}

// gulp.task('css', () => {
//     const less = require('gulp-less');
//     return gulp
//         .src('assets/*.less')
//         .pipe(less())
//         .pipe(postcss([require('./getAutoprefixer')()]))
//         .pipe(gulp.dest('assets'));
// });

function compile(modules) {
    // rimraf.sync(modules !== false ? libDir : esDir);
    const less = gulp
        .src(`${src}/**/*.less`)
        .pipe(gulpLess())
        .pipe(postcss([require('./getAutoprefixer')()]))
        .pipe(gulp.dest(modules === false ? esDir : libDir))
  // const less = gulp
  //   .src(['components/**/*.less'])
  //   .pipe(
  //     through2.obj(function(file, encoding, next) {
  //       this.push(file.clone());
  //       if (
  //         file.path.match(/\/style\/index\.less$/) ||
  //         file.path.match(/\/style\/v2-compatible-reset\.less$/)
  //       ) {
  //         transformLess(file.path)
  //           .then(css => {
  //             file.contents = Buffer.from(css);
  //             file.path = file.path.replace(/\.less$/, '.css');
  //             this.push(file);
  //             next();
  //           })
  //           .catch(e => {
  //             console.error(e);
  //           });
  //       } else {
  //         next();
  //       }
  //     }),
  //   )
  //   .pipe(gulp.dest(modules === false ? esDir : libDir));
  const assets = gulp
    .src([`${src}/**/*.@(png|svg)`])
    .pipe(gulp.dest(modules === false ? esDir : libDir));

  const source = [`${src}/**/*.js`, `${src}/**/*.jsx`, `!${src}/*/__tests__/*`];
  const jsFilesStream = babelifyInternal(gulp.src(source), modules);
    console.log('here');
  return merge2([less, jsFilesStream, assets]);
}

function tag() {
  console.log('tagging');
  const { version } = packageJson;
  execSync(`git config --global user.email ${process.env.GITHUB_USER_EMAIL}`);
  execSync(`git config --global user.name ${process.env.GITHUB_USER_NAME}`);
  execSync(`git tag ${version}`);
  execSync(
    `git push https://${
      process.env.GITHUB_TOKEN
    }@github.com/vueComponent/ant-design-vue.git ${version}:${version}`,
  );
  execSync(
    `git push https://${
      process.env.GITHUB_TOKEN
    }@github.com/vueComponent/ant-design-vue.git master:master`,
  );
  console.log('tagged');
}

function githubRelease(done) {
  const changlogFiles = [
    path.join(cwd, 'CHANGELOG.en-US.md'),
    path.join(cwd, 'CHANGELOG.zh-CN.md'),
  ];
  console.log('creating release on GitHub');
  if (!process.env.GITHUB_TOKEN) {
    console.log('no GitHub token found, skip');
    return;
  }
  if (!changlogFiles.every(file => fs.existsSync(file))) {
    console.log('no changelog found, skip');
    return;
  }
  const github = new GitHub();
  github.authenticate({
    type: 'oauth',
    token: process.env.GITHUB_TOKEN,
  });
  const date = new Date();
  const { version } = packageJson;
  const enChangelog = getChangelog(changlogFiles[0], version);
  const cnChangelog = getChangelog(changlogFiles[1], version);
  const changelog = [
    `\`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}\``,
    enChangelog,
    '\n',
    '---',
    '\n',
    cnChangelog,
  ].join('\n');
  const [_, owner, repo] = execSync('git remote get-url origin') // eslint-disable-line
    .toString()
    .match(/github.com[:/](.+)\/(.+)\.git/);
  github.repos
    .createRelease({
      owner,
      repo,
      tag_name: version,
      name: version,
      body: changelog,
    })
    .then(() => {
      done();
    });
}

gulp.task('tag', done => {
  tag();
  githubRelease(done);
});

gulp.task('check-git', done => {
  runCmd('git', ['status', '--porcelain'], (code, result) => {
    if (/^\?\?/m.test(result)) {
      return done(`There are untracked files in the working tree.\n${result}
      `);
    }
    if (/^([ADRM]| [ADRM])/m.test(result)) {
      return done(`There are uncommitted changes in the working tree.\n${result}
      `);
    }
    return done();
  });
});

function publish(tagString, done) {
  let args = ['publish', '--with-antd-tools'];
  if (tagString) {
    args = args.concat(['--tag', tagString]);
  }
  const publishNpm = process.env.PUBLISH_NPM_CLI || 'npm';
  runCmd(publishNpm, args, code => {
    tag();
    githubRelease(() => {
      done(code);
    });
  });
}

function pub(done) {
  dist(code => {
    if (code) {
      done(code);
      return;
    }
    const notOk = !packageJson.version.match(/^\d+\.\d+\.\d+$/);
    let tagString;
    if (argv['npm-tag']) {
      tagString = argv['npm-tag'];
    }
    if (!tagString && notOk) {
      tagString = 'next';
    }
    if (packageJson.scripts['pre-publish']) {
      runCmd('npm', ['run', 'pre-publish'], code2 => {
        if (code2) {
          done(code2);
          return;
        }
        publish(tagString, done);
      });
    } else {
      publish(tagString, done);
    }
  });
}


gulp.task('dist', done => {
    console.log('dist');
    dist(done);
});

gulp.task('js', () => {
    console.log('[Parallel] compile js...');
    return babelify();
});

gulp.task('es', () => {
    console.log('[Parallel] compile es...');
    return babelify(false);
});

gulp.task('compile', ['cleanCompile', 'js', 'es']);
// gulp.task('compile', gulp.series('cleanCompile', gulp.parallel('js', 'es')));
// gulp.task('compile', ['compile-with-es'], done => {
//     console.log('compile');
//   compile().on('finish', function() {
//       console.log('finish');
//     done();
//   });
// });
gulp.task('compile-with-es', done => {
    try {
        console.log('compile-with-es');
        compile(false).on('finish', function() {
            done();
        });
    } catch(err) {
        console.log(err);
    }
});

gulp.task('pub', ['check-git', 'compile'], done => {
  if (!process.env.GITHUB_TOKEN) {
    console.log('no GitHub token found, skip');
  } else {
    pub(done);
  }
});

gulp.task('pub-with-ci', done => {
  if (!process.env.NPM_TOKEN) {
    console.log('no NPM token found, skip');
  } else {
    const github = new GitHub();
    github.authenticate({
      type: 'oauth',
      token: process.env.GITHUB_TOKEN,
    });
    const [_, owner, repo] = execSync('git remote get-url origin') // eslint-disable-line
      .toString()
      .match(/github.com[:/](.+)\/(.+)\.git/);
    const getLatestRelease = github.repos.getLatestRelease({
      owner,
      repo,
    });
    const getCommits = github.repos.getCommits({
      owner,
      repo,
      per_page: 1,
    });
    Promise.all([getLatestRelease, getCommits]).then(([latestRelease, commits]) => {
      const preVersion = latestRelease.data.tag_name;
      const { version } = packageJson;
      const [_, newVersion] = commits.data[0].commit.message.trim().match(/bump (.+)/) || []; // eslint-disable-line
      if (
        compareVersions(version, preVersion) === 1 &&
        newVersion &&
        newVersion.trim() === version
      ) {
        gulp.run('pub', err => {
          err && console.log('err', err);
          done();
        });
      } else {
        console.log('donot need publish' + version);
      }
    });
  }
});

function reportError() {
  console.log(chalk.bgRed('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'));
  console.log(chalk.bgRed('!! `npm publish` is forbidden for this package. !!'));
  console.log(chalk.bgRed('!! Use `npm run pub` instead.        !!'));
  console.log(chalk.bgRed('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'));
}

gulp.task('guard', done => {
  const npmArgs = getNpmArgs();
  if (npmArgs) {
    for (let arg = npmArgs.shift(); arg; arg = npmArgs.shift()) {
      if (/^pu(b(l(i(sh?)?)?)?)?$/.test(arg) && npmArgs.indexOf('--with-antd-tools') < 0) {
        reportError();
        done(1);
        return;
      }
    }
  }
  done();
});
