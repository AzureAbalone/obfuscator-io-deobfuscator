#!/usr/bin/env node
import { parse } from '@babel/parser';
import { program } from 'commander';
import fs from 'fs';
import { Deobfuscator } from './deobfuscator/deobfuscator';
import { Config, defaultConfig } from './deobfuscator/transformations/config';

const pkg = require('../package.json');

program
    .name(pkg.name)
    .description(pkg.description)
    .version(pkg.version)
    .usage('<input_path> -o [output_path]')
    .argument('<input_path>', 'file to deobfuscate')
    .option('-o, --output [output_path]', 'output file path', 'deobfuscated.js')
    .option('-s, --silent', 'emit nothing to stdout')
    .option('--no-expression-simplification', 'disable expression simplification')
    .option('--no-property-simplification', 'disable property simplification')
    .option('--no-object-simplification', 'disable object simplification')
    .option('--no-proxy-function', 'disable proxy function inlining')
    .option('--no-string-reveal', 'disable string revealing')
    .option('--no-anti-tamper', 'disable anti-tamper removal')
    .option('--no-dead-code', 'disable dead branch removal')
    .option('--no-control-flow', 'disable control flow recovery')
    .action((input, options) => {
        const configOverwrite: Partial<Config> = {};

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
