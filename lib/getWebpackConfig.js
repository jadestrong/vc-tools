'use strict';

// const path = require('path');
// const fs = require('fs-extra');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const getWebpackCommonConfig = require('./getWebpackCommonConfig');

function getEntry() {

}

const resolveCwd = require('./resolveCwd');

module.exports = ({ common, inlineSourceMap, prod }) => {
    const plugins = [new ProgressBarPlugin()];
    plugins.push(new MiniCssExtractPlugin());

    const config = {
        mode: prod ? 'production' : 'development',
        devtool: inlineSourceMap ? '#inline-source-map' : '#source-map',
        resolveLoader: getWebpackCommonConfig.getResolveLoader(), // TODO 自动添加loader后缀
        entry: getEntry(), // TODO 这个在gulpfile.js里面进行了复写，这里只是设置为examples,先不写了，具体再看
        output: {
            path: resolveCwd('dist'), // TODO check
            filename: '[name].js'
        },
        module: {
            noParse: [/moment.js/],
            rules: getWebpackCommonConfig.getLoaders().concat(getWebpackCommonConfig.getCssLoaders(true)),
        },
        resolve: getWebpackCommonConfig.getResolve(),
        plugins,
    };

    if (common) {
        config.optimization = {
            splitChunks: {
                cacheGroups: {
                    commons: {
                        name: 'common',
                        chunks: 'initial',
                        minChunks: 2
                    }
                }
            },
        };
    }

    return config;
}
