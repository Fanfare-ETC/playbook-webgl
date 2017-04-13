'use strict';
const path = require('path');

module.exports = function (env) {
  return {
    entry: {
      prediction: './prediction.js',
      collection: './collection.js'
    },
    output: {
      filename: '[name]/[name].js',
      path: path.join(__dirname, 'public')
    },
    module: {
      rules: [{
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['env']
          }
        }
      }]
    },
    devtool: env.production ? 'cheap-module-source-map' : 'eval',
    devServer: {
      contentBase: path.join(__dirname, 'public'),
      port: 9050
    }
  };
};
