const path = require('path');

module.exports = {
    entry: {
        bundle: path.resolve(__dirname, 'src', 'main.jsx')
    },
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: '[name].js'
    },
    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                include: /src/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                query: {
                    presets: ['es2015', 'react', 'stage-2']
                }
            },
        ]
    },
    node: {
        fs: "empty",
    },
    devtool: "eval-source-map"
};