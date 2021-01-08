var path = require("path")
module.exports = {
    mode: "production",
    entry: "./src/index.ts",
    target: "node",
    output: {
        libraryTarget: "commonjs",
        path: path.join(__dirname, "dist"),
        filename: "index.js",
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
        alias: {
            "@effect-ts/core": ["@effect-ts/core/_traced"],
            "@effect-ts/node": ["@effect-ts/node/_traced"],
            "@effect-ts/system": ["@effect-ts/system/_traced"],
        }
    },
    module: {
        rules: [
            {
                test: /\.m?js/,
                resolve: {
                    fullySpecified: false
                }
            },
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
                options: {
                    compiler: "ttypescript"
                }
            }
        ],
    }
}