'use strict';

const stream = require('stream');
const util = require('util');
const Transform = stream.Transform;

function GeneFilter(gene_stream,mappings) {
  if (!(this instanceof GeneFilter)) {
    return new GeneFilter(gene_stream);
  }

  Transform.call(this, {objectMode: true});
  this.stream = gene_stream;
  this.mappings = mappings;
  this.stream.on('end', () => delete this.stream );
}

util.inherits(GeneFilter, Transform);

GeneFilter.prototype._transform = function (obj,enc,cb) {
  obj.CHR_POS = parseInt(obj.CHR_POS);
  obj.SNP_GENE_IDS = obj.SNP_GENE_IDS.split(/[ ,]+/).map( gene => this.mappings[gene] || '' ).join(',');
  obj.chr = (obj.CHR_ID.match(/\d+/) || [obj.CHR_ID])[0];
  if (['MT','X','Y'].indexOf(obj.chr) < 0) {
    obj.chr = parseInt(obj.chr);
  } else {
    obj.chr = [-3,-2,-1][  ['MT','X','Y'].indexOf(obj.chr) ];
  }
  if ( ! obj.CHR_POS || ! obj.chr || obj.INTERGENIC !== '1') {
    obj.UPSTREAM_PROTEIN_ENCODING_GENE_ID = 'NA';
    obj.DOWNSTREAM_PROTEIN_ENCODING_GENE_ID = 'NA';
    obj.UPSTREAM_PROTEIN_ENCODING_GENE_DISTANCE = 'NA';
    obj.DOWNSTREAM_PROTEIN_ENCODING_GENE_DISTANCE = 'NA';
    delete obj.chr;
    this.push(obj);
    cb();
    return;
  }
  if ( this.stream && ( ! this.first_gene || 
                        this.first_gene.chromosome < obj.chr ||
                        ( this.first_gene.chromosome == obj.chr && this.first_gene.start < obj.CHR_POS)
                      ) ) {
    if (this.first_gene) {
      this.prev_gene = this.first_gene;
      this.first_gene = null;
    }
    this.stream.on('data',(gene) => {
      if (['MT','X','Y'].indexOf(gene.chromosome) >= 0) {
        gene.chromosome = [-3,-2,-1][  ['MT','X','Y'].indexOf(gene.chromosome) ];
      } else {
        gene.chromosome = parseInt(gene.chromosome);
      }
      gene.start = parseInt(gene.start);
      gene.end = parseInt(gene.end);
      gene.geneid = this.mappings[gene.geneid];

      this.stream.pause();
      if (gene.chromosome < obj.chr ||
          (gene.chromosome == obj.chr && gene.start < obj.CHR_POS ) ) {
        this.prev_gene = gene;
        this.stream.resume();
      } else {
        this.first_gene = gene;
        obj.UPSTREAM_PROTEIN_ENCODING_GENE_ID = this.prev_gene.geneid;
        obj.DOWNSTREAM_PROTEIN_ENCODING_GENE_ID = this.first_gene.geneid;
        obj.UPSTREAM_PROTEIN_ENCODING_GENE_DISTANCE = obj.CHR_POS - this.prev_gene.end;
        obj.DOWNSTREAM_PROTEIN_ENCODING_GENE_DISTANCE = this.first_gene.start - obj.CHR_POS;
        this.stream.removeAllListeners('data');
        this.stream.removeListener('end',this.stream.end_cb);
        delete obj.chr;
        this.push(obj);
        cb();
      }
    });
    this.stream.end_cb = cb;
    this.stream.on('end',this.stream.end_cb);
    this.stream.resume();
  } else {
    // The first gene is after this gene.
    obj.UPSTREAM_PROTEIN_ENCODING_GENE_ID = this.prev_gene.geneid;
    obj.DOWNSTREAM_PROTEIN_ENCODING_GENE_ID = this.first_gene.geneid;
    obj.UPSTREAM_PROTEIN_ENCODING_GENE_DISTANCE = obj.CHR_POS - this.prev_gene.end;
    obj.DOWNSTREAM_PROTEIN_ENCODING_GENE_DISTANCE = this.first_gene.start - obj.CHR_POS;
    delete obj.chr;
    this.push(obj);
    cb();
  }
};

GeneFilter.prototype._flush = function(cb) {
  console.log("Completed GeneFilter");
  cb();
};

function GeneMapping() {
  if (!(this instanceof GeneMapping)) {
    return new GeneMapping(gene_stream);
  }

  Transform.call(this, {objectMode: true});
  this.data = {};
  this.counter = 0;
}

util.inherits(GeneMapping, Transform);

GeneMapping.prototype._transform = function (obj,enc,cb) {
  this.counter++;
  if (obj['#tax_id'] == '9606' && obj['Ensembl_protein_identifier'] !== '-') {
    this.data[obj.Ensembl_gene_identifier] = obj.GeneID;
  }
  cb();
};

exports.GeneFilter = GeneFilter;
exports.GeneMapping = GeneMapping;
