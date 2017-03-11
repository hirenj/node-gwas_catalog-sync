'use strict';

const fs = require('fs');
const csv = require('csv-parse');
const GeneFilter = require('./genefilter').GeneFilter;
const GeneMapping = require('./genefilter').GeneMapping;

const stringify = require('csv-stringify');


let gene_translation = new Promise((resolve,reject) => {
  let csv_parser = csv({columns: true, delimiter: '\t'});
  let mappings = fs.createReadStream('gene2ensembl');
  let mapper = new GeneMapping();
  let out_stream = mappings.pipe(csv_parser).pipe(mapper);
  mapper.on('finish', () => {
    resolve(mapper.data);
  });
  mapper.on('error', reject);
});

gene_translation.then( mappings => {
  let positions_stream = fs.createReadStream('gene_positions.tsv').pipe(csv({columns:true,delimiter:"\t"}));
  return new GeneFilter(positions_stream,mappings);
}).then( filter => {
  let catalog_stream = fs.createReadStream('sorted_gwas.tsv');
  return catalog_stream.pipe(csv({columns: true, delimiter: '\t', relax: true})).pipe(filter);
}).then( output => {
  // output.on('data', dat => { if (dat.INTERGENIC == '1') { console.log(dat); }});
  output.pipe(stringify({ header: true, delimiter: '\t' })).pipe(process.stdout);
}).catch( err => console.log(err));