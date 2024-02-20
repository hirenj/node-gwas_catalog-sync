#!/bin/bash

workdir=${1:-/work}
outdir=${2:-/dist}

ensembl_version=$(<ensembl_version.txt)
ensembl_workdir="$workdir/ensembl_$ensembl_version/"
mkdir -p "$ensembl_workdir"
if [ ! -e "$ensembl_workdir/gene2ensembl" ]; then curl --output "$ensembl_workdir/gene2ensembl.gz" 'ftp://ftp.ncbi.nih.gov/gene/DATA/gene2ensembl.gz'; fi
if [ ! -e "$ensembl_workdir/gene2ensembl" ]; then gunzip "$ensembl_workdir/gene2ensembl.gz"; fi
if [ ! -e "$ensembl_workdir/associations.tsv" ]; then ./bin/download_exons.sh "$ensembl_version" "$ensembl_workdir"; fi
if [ ! -e "$ensembl_workdir/associations.tsv" ]; then curl 'https://www.ebi.ac.uk/gwas/api/search/downloads/alternative' > "$ensembl_workdir/associations.tsv"; fi
if [ ! -e "$ensembl_workdir/sorted_gwas.tsv" ]; then ./bin/make_sorted_associations.sh "$ensembl_workdir"; fi
node js/index.js --version="ensembl_${ensembl_version}" --workdir="$ensembl_workdir" --git="$(git describe --abbrev=0 --tags)" --timestamp="$(date -u +%FT%TZ)"
mkdir -p "$outdir"
mv mapped.json "$outdir/gwas_associations.json"