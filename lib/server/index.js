'use strict';

const serve = require('koa-static');
const path = require('path');
const webpackMiddleware = require('koa-webpack-dev-middleware');
const Koa = require('koa');
const serveIndex = require('koa-serve-index');
const koaBody = require('koa-body');
const Router = require('koa-router');
const webpack = require('webpack');
const chalk = require('chalk');
const fs = require('fs');
const logger = require('koa-logger');
const getWebpackConfig = require('../getWebpackConfig');
