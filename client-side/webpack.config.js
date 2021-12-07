const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");

// TODO: Change block name (if it more then one word put '_' between).
const blockName = 'chart';
const blockNameScorecars = 'scorecards';

module.exports = {
    output: {
        uniqueName: blockName,
        publicPath: "auto"
    },
    optimization: {
        // Only needed to bypass a temporary bug
        runtimeChunk: false
    },
    plugins: [
        new ModuleFederationPlugin({
            name: blockName,
            filename: `${blockName}.js`,
            exposes: {
                './ChartModule': './src/app/chart/index',
                './ChartEditorModule': './src/app/chart-editor/index'
            },
            shared: {
                "@angular/core": { eager: true, singleton: true, strictVersion: false },
                "@angular/common": { eager: true, singleton: true, strictVersion: false },
                "@angular/common/http": { eager: true, singleton: true, strictVersion: false },
                "rxjs": { eager: true, singleton: true, strictVersion: false },
                "@ngx-translate/core": { eager: true, singleton: true, strictVersion: false },
                "@angular/router": { eager: true, singleton: true,  strictVersion: false }
            }
        }),
        new ModuleFederationPlugin({
            name: blockNameScorecars,
            filename: `${blockNameScorecars}.js`,
            exposes: {
                './ScorecardsModule': './src/app/scorecards/index',
                './ScorecardsEditorModule': './src/app/scorecards-editor/index'
            },
            shared: {
                "@angular/core": { eager: true, singleton: true, strictVersion: false },
                "@angular/common": { eager: true, singleton: true, strictVersion: false },
                "@angular/common/http": { eager: true, singleton: true, strictVersion: false },
                "rxjs": { eager: true, singleton: true, strictVersion: false },
                "@ngx-translate/core": { eager: true, singleton: true, strictVersion: false },
                "@angular/router": { eager: true, singleton: true,  strictVersion: false }
            }
        })
    ]
};