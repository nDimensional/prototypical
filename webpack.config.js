const path = require("path")
const webpack = require("webpack")

module.exports = {
	entry: {
		bundle: path.resolve(__dirname, "src", "index.jsx"),
	},
	output: {
		path: path.resolve(__dirname, "build"),
		filename: "[name].js",
	},
	module: {
		loaders: [
			{
				test: /\.jsx?$/,
				include: /prototypical\/src/,
				exclude: /(node_modules)/,
				loader: "babel-loader",
				query: {
					presets: ["es2015", "react", "stage-2"],
				},
			},
		],
	},
	node: {
		fs: "empty",
	},
	devtool: "eval-source-map",
	plugins: [
		new webpack.IgnorePlugin(/SpecHelper/),
		new webpack.IgnorePlugin(/.*\.md/),
	],
}
