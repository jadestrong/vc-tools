'use strict';

const argv = require('minimist')(process.argv.slice(2));
// eslint-disable-next-line
module.exports = function(modules) {
  const plugins = [
    require.resolve('@babel/plugin-syntax-jsx'),
    require.resolve('@vue/babel-plugin-transform-vue-jsx'),
    require.resolve('babel-plugin-inline-import-data-uri'), // import logo from './logo.svg';
    require.resolve('@babel/plugin-transform-object-assign'), // Object.assign(a, b);
    // require.resolve('@babel/plugin-transform-spread'), // var a = ['a', 'b']; var b = [...a, 'c']; var c = foo(...a);
    require.resolve('@babel/plugin-transform-member-expression-literals'), // obj.const = 'isKeywordA' => obj['const'] = 'isKeyword';
    require.resolve('@babel/plugin-transform-template-literals'), // `name ${name}`
    // require.resolve('@babel/plugin-proposal-class-properties'), // class Book { name = 'book'; static age = 23; } => Object.defineProperty()形式的定义
    // require.resolve('@babel/plugin-proposal-object-rest-spread'), // let { x, y, ...z } = {x: 1, y: 2, a: 3, b: 4}
    require.resolve('@babel/plugin-proposal-export-default-from'), // export A from 'mod'; => export { default as A } from 'mod';
    require.resolve('@babel/plugin-proposal-export-namespace-from'), // export * as ns from 'mod';
  ];
  // 对于Object.assign这种功能函数，转译之后的helper函数为_extends，每个用到的地方都会生成一份，这样打包的时候会出现很多冗余代码，所以,
  // @babel/plugin-transform-runtime的作用，就是将所有这些工具函数都索引到一个位置，也就是和该插件一起使用的 @babel/runtime 插件，
  // @babel/plugin-transform-runtime插件只会用在开发环境，而@babel/runtime则会打包到发布代码中.
  if (argv['babel-runtime']) {
        plugins.push([
            require.resolve('@babel/plugin-transform-runtime'),
            {
                helper: false,
            },
        ]);
    }
  return {
    presets: [
      [
        require.resolve('@babel/preset-env'),
        {
          modules,
          exclude: ['transform-typeof-symbol']
        },
      ],
      require.resolve('@vue/babel-preset-jsx')
        // require.resolve(`@vue/babel-preset-app`)
    ],
    plugins,
    env: {
      test: {
        plugins: [require.resolve('babel-plugin-istanbul')],
      },
    },
  };
};
