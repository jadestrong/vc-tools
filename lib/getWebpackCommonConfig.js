'use strict';

const path = require('path');
const fs = require('fs')
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const resolveCwd = require('./resolveCwd');
const postcssConfig = require('./postcssConfig');
const getBabelCommonConfig = require('./getBabelCommonConfig');
// const replaceLib = require('./replaceLib');

const pkg = require(resolveCwd('package.json'));
const cwd = process.cwd();

const svgRegex = /\.svg(\?v=\d+\.\d+\.\d+)?$/;
const svgOptions = {
  limit: 10000,
  minetype: 'image/svg+xml',
};

const imageOptions = {
  limit: 10000,
};

function getResolve() {
    const alias = {};
    const resolve = {
        modules: [cwd, 'node_modules'],
        extensions: ['.js', '.jsx', '.vue', '.md', '.json'],
        alias
    };
    const { name } = pkg;

    // https://github.com/react-component/react-component.github.io/issues/13
    // just for compatibility， we hope to delete /index.js. just use /src/index.js as all entry
    let pkgSrcMain = resolveCwd('index.js');
    if (!fs.existsSync(pkgSrcMain)) {
        pkgSrcMain = resolveCwd('src/index.js');
        if (!fs.existsSync(pkgSrcMain)) {
            console.error('Get webpack.resolve.alias error: no /index.js or /src/index.js exist !!');
        }
    }

    // resolve import { foo } from 'rc-component'
    // to 'rc-component/index.js' or 'rc-component/src/index.js'
    alias[`${name}$`] = pkgSrcMain;
    alias[name] = cwd;

    return resolve;
}

const postcssLoader = {
    loader: 'postcss',
    options: {...postcssConfig}
};

module.exports = {
    getResolve,
    getResolveLoader() {
        // 自动处理loader的加载的，比如自动添加后缀
        return {
            modules: [
                path.resolve(__dirname, '../node_modules'),
                //npm3 flat module
                path.resolve(__dirname, '../../')
            ],
            moduleExtensions: ['-loader'],
        };
    },
    getLoaders(c) {
        const commonjs = c || false;
        const babelConfig = getBabelCommonConfig(commonjs);
        // TODO 这里应该不需要babel-plugin-import库
        // TODO replaceLib是babel的api，用于拦截import以及export，然后添加我们自身的判断逻辑(类似axios的intercept)
        // if (commonjs === false) {
        //     babelConfig.plugins.push(replaceLib);
        // }

        return [
            {
                test: /\.vue$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'vue',
                        options: {
                            loaders: {
                                js: [{
                                    loader: 'babel',
                                    options: {
                                        presets: ['env'],
                                        plugins: ['transform-vue-jsx', 'transform-object-rest-spread'],
                                    },
                                }]
                            }
                        }
                    }
                ]
            },
            {
                test: /\.(js|jsx)$/,
                loader: 'babel',
                exclude: /node_modules/,
                options: babelConfig
            },
            // Images
            {
                test: svgRegex,
                loader: 'url',
                options: svgOptions,
            },
            {
                test: /\.(png|jpg|jpeg|gif)(\?v=\d+\.\d+\.\d+)?$/i,
                loader: 'url',
                options: imageOptions,
            },
            // Needed for the css-loader when [bootstrap-webpack](https://github.com/bline/bootstrap-webpack)
            // loads bootstrap's css.
            {
                test: /\.woff2?(\?v=\d+\.\d+\.\d+)?$/,
                loader: 'url',
                options: {
                    limit: 10000,
                    minetype: 'application/font-woff',
                },
            },
            {
                test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
                loader: 'url',
                options: {
                    limit: 10000,
                    minetype: 'application/octet-stream',
                },
            },
            {
                test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
                loader: 'file',
            },
        ]
    },
    getCssLoaders(extractCss) {
        let cssLoader = [
            {
                loader: 'css',
                options: {
                    sourceMap: true,
                }
            },
            postcssLoader,
        ];
        let lessLoader = cssLoader.concat([
            {
                loader: 'less',
                options: {
                    sourceMap: true
                },
            },
        ]);

        if (extractCss) {
            cssLoader = [MiniCssExtractPlugin.loader].concat(cssLoader);
            lessLoader = [MiniCssExtractPlugin.loader].concat(lessLoader);
        } else {
            const styleLoader = {
                loader: 'style'
            };
            cssLoader.unshift(styleLoader);
            lessLoader.unshift(styleLoader);
        }

        return [
            {
                test: /\.css$/,
                use: cssLoader
            },
            {
                test: /\.less$/,
                use: lessLoader
            }
        ];
    }
};
