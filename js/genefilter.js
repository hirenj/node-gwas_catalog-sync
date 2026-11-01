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

// prev_gene/first_gene are only valid neighbours of obj when they're on the same chromosome -
// at a chromosome boundary (or before the first/after the last gene on a chromosome) the nearest
// gene found by the merge-join can be tens of millions of bases away on a different chromosome,
// producing a nonsensical (and sometimes deeply negative) distance. Treat "no gene on this side,
// on this chromosome" as "no neighbour" rather than fabricating a cross-chromosome distance.
//
// Separately, a same-chromosome neighbour can still overlap obj (nested or overlapping gene
// annotations), making the raw subtraction negative even though the chromosome is right - that's
// not a "gene is far away in the wrong place" bug, just "the SNP is within this gene's span", so
// clamp to 0 rather than publish a negative distance.
function setNeighbourFields(obj,prevGene,firstGene) {
  if (prevGene && prevGene.chromosome === obj.chr) {
    obj.UPSTREAM_PROTEIN_ENCODING_GENE_ID = prevGene.geneid;
    obj.UPSTREAM_PROTEIN_ENCODING_GENE_DISTANCE = Math.max(0, obj.CHR_POS - prevGene.end);
  }
  if (firstGene && firstGene.chromosome === obj.chr) {
    obj.DOWNSTREAM_PROTEIN_ENCODING_GENE_ID = firstGene.geneid;
    obj.DOWNSTREAM_PROTEIN_ENCODING_GENE_DISTANCE = Math.max(0, firstGene.start - obj.CHR_POS);
  }
}

GeneFilter.prototype._transform = function (obj,enc,cb) {
  obj.CHR_POS = parseInt(obj.CHR_POS);
  obj.SNP_GENE_IDS = obj.SNP_GENE_IDS.split(/[ ,]+/).map( gene => this.mappings[gene] ).filter( x => x).join(',');
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
        setNeighbourFields(obj,this.prev_gene,this.first_gene);
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
    setNeighbourFields(obj,this.prev_gene,this.first_gene);
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
