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
  obj.CHR_ID = parseInt(obj.CHR_ID);
  obj.CHR_POS = parseInt(obj.CHR_POS);
  if ( ! obj.CHR_POS || ! obj.CHR_ID ) {
    // FIXME We need to sort out CHR x positions and sorting..
    cb();
    return;
  }
  if (obj.INTERGENIC !== '1') {
    obj.UPSTREAM_PROTEIN_ENCODING_GENE_ID = null;
    obj.DOWNSTREAM_PROTEIN_ENCODING_GENE_ID = null;
    obj.UPSTREAM_PROTEIN_ENCODING_GENE_DISTANCE = null;
    obj.DOWNSTREAM_PROTEIN_ENCODING_GENE_DISTANCE = null;
    this.push(obj);
    cb();
    return;
  }

  if ( this.stream && ( ! this.first_gene || 
                        this.first_gene.chromosome < obj.CHR_ID || 
                        ( this.first_gene.chromosome == obj.CHR_ID && this.first_gene.start < obj.CHR_POS)
                      ) ) {
    if (this.first_gene) {
      this.first_gene = null;
    }
    this.stream.on('data',(gene) => {
      gene.chromosome = parseInt(gene.chromosome);
      gene.start = parseInt(gene.start);
      gene.geneid = this.mappings[gene.geneid];

      this.stream.pause();
      if (gene.chromosome < obj.CHR_ID ||
          (gene.chromosome == obj.CHR_ID && gene.start < obj.CHR_POS ) ) {
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
