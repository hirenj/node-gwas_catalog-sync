'use strict';

const fs = require('fs');
const csv = require('csv-parse');
const GeneFilter = require('./genefilter').GeneFilter;
const GeneMapping = require('./genefilter').GeneMapping;
const nconf = require('nconf');

const StreamTransform = require('jsonpath-object-transform').Stream;

const stringify = require('csv-stringify');

nconf.argv();

const template = {
  'data' : {
    "$[?(@.CHR_ID && @.INTERGENIC !== '1')].geneid" : {
      "chr" : "$.CHR_ID",
      "pos" : "$.CHR_POS",
      "p-value" : "$['P-VALUE']",
      "snp" : "$.SNP_ID_CURRENT",
      "trait" : "$.MAPPED_TRAIT",
      "trait_uri" : "$.MAPPED_TRAIT_URI",
      "geneid" : "$.SNP_GENE_IDS"
    },
    "$[?(@.CHR_ID && @.INTERGENIC === '1')].geneid" : {
      "chr" : "$.CHR_ID",
      "pos" : "$.CHR_POS",
      "p-value" : "$['P-VALUE']",
      "snp" : "$.SNP_ID_CURRENT",
      "trait_uri" : "$.MAPPED_TRAIT_URI",
      "intergenic" : true,
      "snp_position" : "downstream",
      "geneid" : "$.UPSTREAM_PROTEIN_ENCODING_GENE_ID",
      "distance" : "$.UPSTREAM_PROTEIN_ENCODING_GENE_DISTANCE"
    },
    "$[?(@.CHR_ID && @.INTERGENIC === '1' && true == true)].geneid" : {
      "chr" : "$.CHR_ID",
      "pos" : "$.CHR_POS",
      "p-value" : "$['P-VALUE']",
      "snp" : "$.SNP_ID_CURRENT",
      "trait_uri" : "$.MAPPED_TRAIT_URI",
      "intergenic" : true,
      "snp_position" : "upstream",
      "geneid" : "$.DOWNSTREAM_PROTEIN_ENCODING_GENE_ID",
      "distance" : "$.DOWNSTREAM_PROTEIN_ENCODING_GENE_DISTANCE"
    }
  },
  "metadata" : {
    "mimetype" : "application/json+association",
    "data-version" : "$.(version)",
    "title" : "EBI GWAS catalog",
    "software" : {"ARRAY": "true", "0" : { "name" : "hirenj/node-gwas_catalog-sync", "version" : "$.(git)" , "run-date" : "$.(timestamp)" }},
    "sample": {
      "species" : 9606
    }
  }
};

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
  output.pipe(StreamTransform(template, 'data',{ version: nconf.get('version'), timestamp: nconf.get('timestamp'), git: nconf.get('git') })).pipe(fs.createWriteStream('mapped.json'));
  output.pipe(stringify({ header: true, delimiter: '\t' })).pipe(fs.createWriteStream('remapped.tsv'));
}).catch( err => console.log(err));