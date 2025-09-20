const webpack = require('webpack');
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const crypto = require('crypto');
const fs = require('fs');

module.exports = {
  entry: {
    'assets/engine.js': [
      './src/js/main.js'
    ],
  },
  output: {
    filename: '[name]',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  devtool: false,
  plugins: [
    new CopyPlugin([
      { from: './src/assets', to: 'assets' },
      { from: './src/css', to: 'assets' },
      { from: './src/js/server.js', to: 'assets' },
      { from: './src/js/proximity_chat.js', to: 'assets' },
      { from: './src/robots.txt', to: 'robots.txt' },
      { from: './src/html/privacy.html', to: 'privacy.html' },
      { from: './src/html/contact.html', to: 'contact.html' },
    ]),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './src/html/index.html',
      minify: {
        collapseWhitespace: false,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true
      },
      hash: true,
      inject: 'head',
      scriptLoading: 'blocking',
    }),
    
    // add assets tags to index.html
    new class {
      apply(compiler) {
        compiler.hooks.afterEmit.tap('AfterEmitPlugin', (compilation) => {
          let indexHtml = fs.readFileSync('dist/index.html', 'utf8'), hash;
          // style.css
          hash = crypto.createHash('md5').update(fs.readFileSync('dist/assets/style.css', 'utf8')).digest('hex');
          indexHtml = indexHtml.replace('</head>', `<link rel="stylesheet" href="assets/style.css?${hash}"></head>`);
          // proximity_chat.js
          hash = crypto.createHash('md5').update(fs.readFileSync('dist/assets/proximity_chat.js', 'utf8')).digest('hex');
          indexHtml = indexHtml.replace('</head>', `<script src="assets/proximity_chat.js?${hash}" defer></script></head>`);
          fs.writeFileSync('dist/index.html', indexHtml);
        });
      }
    }
  ],
}
