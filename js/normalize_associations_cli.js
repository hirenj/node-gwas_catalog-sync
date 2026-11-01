#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { normalize } = require('./normalize_associations');

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
    console.error('usage: normalize_associations_cli.js <input.json> <output.json>');
    process.exit(2);
}

const doc = normalize(JSON.parse(fs.readFileSync(inputPath, 'utf8')));
fs.writeFileSync(outputPath, JSON.stringify(doc));
