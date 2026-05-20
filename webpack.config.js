const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  target: 'node',
  mode: 'none',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/ReflectHelper.class', to: 'ReflectHelper.class' },
        { from: 'dist/webview/index.js', to: 'webview/index.js' },
        { from: 'dist/webview/style.css', to: 'webview/style.css' },
        { from: 'dist/webview/index.html', to: 'webview/index.html' }
      ]
    })
  ],
  devtool: 'nosources-source-map'
};
