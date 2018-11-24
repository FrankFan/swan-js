/**
 * @file webpack prod config for swan
 * @author xuechao(xuechao02@baidu.com)
 */
const merge = require('webpack-merge');
const baseWebpackConfig = require('./webpack.base.conf.js');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = merge(
    baseWebpackConfig,
    {
        module: {
            loaders: [{
                    test: /\.js$/,
                        exclude: /node_modules/,
                        loader: 'babel-loader',
                        query: {
                            presets: ['env'],
                            plugins: [
                                'transform-class-properties', ['transform-object-rest-spread', {'useBuiltIns': true}],
                                'transform-decorators-legacy',
                                'transform-object-assign'
                            ]
                        }
                },
                {
                    test: /\.css$/,
                    loader: ExtractTextPlugin.extract({
                        fallback: 'style-loader',
                        use: 'css-loader?modules&localIdentName=[local]'
                    })
                },
                {
                    test: /\.(png|jpg|ttf|woff|eot|svg)$/,
                    loader: 'url-loader'
                }
            ]
        }
    }
);