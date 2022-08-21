const { shareAll, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack');
const addonConfig = require('../addon.config.json');
const filename = `file_${addonConfig.AddonUUID}`;
const blockName = 'chart';
const blockNameBenchmark = 'benchmark_chart';
const blockNameScorecars = 'scorecards';
const blockNameTable = 'table';

const webpackConfig = withModuleFederationPlugin({
    name: blockName,
    filename: `${blockName}.js`,
    exposes: {
        // './ChartModule': './src/app/chart/index',
        // './ChartEditorModule': './src/app/chart-editor/index'
        './WebComponents': './src/bootstrap.ts',
    },
    shared: {
        ...shareAll({ strictVersion: true, requiredVersion: 'auto' }),
    }
});

const webpackConfigBenchmark = withModuleFederationPlugin({
    name: blockNameBenchmark,
    filename: `${blockNameBenchmark}.js`,
    exposes: {
        // './BenchmarkChartModule': './src/app/benchmark-chart/index',
        // './BenchmarkChartEditorModule': './src/app/benchmark-chart-editor/index'
        './WebComponents': './src/bootstrap.ts',
    },
    shared: {
        ...shareAll({ strictVersion: true, requiredVersion: 'auto' }),
    }
});

const webpackConfigScorecars = withModuleFederationPlugin({
    name: blockNameScorecars,
    filename: `${blockNameScorecars}.js`,
    exposes: {
        // './ScorecardsModule': './src/app/scorecards/index',
        // './ScorecardsEditorModule': './src/app/scorecards-editor/index'
        './WebComponents': './src/bootstrap.ts',
    },
    shared: {
        ...shareAll({ strictVersion: true, requiredVersion: 'auto' }),
    }
});

const webpackConfigTable = withModuleFederationPlugin({
    name: blockNameTable,
    filename: `${blockNameTable}.js`,
    exposes: {
        // './TableModule': './src/app/table/index',
        // './TableEditorModule': './src/app/table-editor/index'
        './WebComponents': './src/bootstrap.ts',
    },
    shared: {
        ...shareAll({ strictVersion: true, requiredVersion: 'auto' }),
    }
});

module.exports = {
    ...webpackConfig,
    output: {
        ...webpackConfig.output,
        uniqueName: filename,
    },
    plugins: [
        ...webpackConfig.plugins,
        ...webpackConfigBenchmark.plugins,
        ...webpackConfigScorecars.plugins,
        ...webpackConfigTable.plugins,
    ]
};