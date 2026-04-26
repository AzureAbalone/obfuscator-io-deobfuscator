#!/usr/bin/env node
import { parse } from '@babel/parser';
import { program } from 'commander';
import fs from 'fs';
import { Deobfuscator } from './deobfuscator/deobfuscator';
import { Config, defaultConfig, TransformationKey } from './deobfuscator/transformations/config';

const pkg = require('../package.json');

const ALL_FEATURE_KEYS: TransformationKey[] = [
    'expressionSimplification',
    'propertySimplification',
    'objectSimplification',
    'proxyFunctionInlining',
    'stringRevealing',
    'antiTamperRemoval',
    'deadBranchRemoval',
    'controlFlowRecovery',
];

const PHASE1_ENABLED = new Set<TransformationKey>([
    'expressionSimplification',
    'propertySimplification',
    'objectSimplification',
    'proxyFunctionInlining',
    'stringRevealing',
    'antiTamperRemoval',
    'deadBranchRemoval',
]);

const PHASE2_ENABLED = new Set<TransformationKey>([
    'expressionSimplification',
    'propertySimplification',
    'objectSimplification',
    'stringRevealing',
    'controlFlowRecovery',
    'antiTamperRemoval',
    'deadBranchRemoval',
]);

program
    .name(pkg.name)
    .description(pkg.description)
    .version(pkg.version)
    .usage('<input_path> -o [output_path]')
    .argument('<input_path>', 'file to deobfuscate')
    .option('-o, --output [output_path]', 'output file path', 'deobfuscated.js')
    .option('-s, --silent', 'emit nothing to stdout')
    .option('--phase1, --p1', 'Phase 1: enable safe transformations (expressions, properties, objects, proxy functions, strings, anti-tamper, dead code). Disables controlFlowRecovery.')
    .option('--phase2, --p2', 'Phase 2: enable all transformations including controlFlowRecovery. Disables proxyFunctionInlining.')
    .option('--no-expression-simplification', 'disable expression simplification')
    .option('--no-property-simplification', 'disable property simplification')
    .option('--no-object-simplification', 'disable object simplification')
    .option('--no-proxy-function', 'disable proxy function inlining')
    .option('--no-string-reveal', 'disable string revealing')
    .option('--no-anti-tamper', 'disable anti-tamper removal')
    .option('--no-dead-code', 'disable dead branch removal')
    .option('--no-control-flow', 'disable control flow recovery')
    .action((input, options) => {
        const phase1 = !!options.phase1;
        const phase2 = !!options.phase2;

        const configOverwrite: Partial<Config> = {};

        for (const key of ALL_FEATURE_KEYS) {
            configOverwrite[key] = { isEnabled: false };
        }

        const enabledSet = phase2 ? PHASE2_ENABLED : phase1 ? PHASE1_ENABLED : new Set<TransformationKey>();
        for (const key of enabledSet) {
            configOverwrite[key] = { isEnabled: true };
        }

        if (options.expressionSimplification === false) configOverwrite['expressionSimplification'] = { isEnabled: false };
        if (options.propertySimplification === false) configOverwrite['propertySimplification'] = { isEnabled: false };
        if (options.objectSimplification === false) configOverwrite['objectSimplification'] = { isEnabled: false };
        if (options.proxyFunction === false) configOverwrite['proxyFunctionInlining'] = { isEnabled: false };
        if (options.stringReveal === false) configOverwrite['stringRevealing'] = { isEnabled: false };
        if (options.antiTamper === false) configOverwrite['antiTamperRemoval'] = { isEnabled: false };
        if (options.deadCode === false) configOverwrite['deadBranchRemoval'] = { isEnabled: false };
        if (options.controlFlow === false) configOverwrite['controlFlowRecovery'] = { isEnabled: false };

        const config: Config = {
            ...defaultConfig,
            ...configOverwrite,
            silent: !!options.silent,
        };

        const source = fs.readFileSync(input).toString();
        const ast = parse(source, { sourceType: 'unambiguous' });

        const deobfuscator = new Deobfuscator(ast, config);
        const output = deobfuscator.execute();

        fs.writeFileSync(options.output, output);
        if (!options.silent) {
            console.log(`Wrote deobfuscated file to ${options.output}`);
        }
    });

program.parse();
