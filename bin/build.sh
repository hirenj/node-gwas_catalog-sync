#!/bin/bash

workdir=${1:-/work}
outdir=${2:-/dist}

ensembl_version=$(<ensembl_version.txt)
ensembl_workdir="$workdir/ensembl_$ensembl_version/"
mkdir -p "$ensembl_workdir"
if [ ! -e "$ensembl_workdir/gene2ensembl" ]; then curl --output "$ensembl_workdir/gene2ensembl.gz" 'ftp://ftp.ncbi.nih.gov/gene/DATA/gene2ensembl.gz'; fi
if [ ! -e "$ensembl_workdir/gene2ensembl" ]; then gunzip "$ensembl_workdir/gene2ensembl.gz"; fi
if [ ! -e "$ensembl_workdir/associations.tsv" ]; then ./bin/download_exons.sh "$ensembl_version" "$ensembl_workdir"; fi
# EBI retired the old search-api "alternative downloads" endpoint - the ontology-annotated full
# associations file (the one with MAPPED_TRAIT/MAPPED_TRAIT_URI columns) now lives as a static zip
# on the GWAS catalog's FTP mirror.
if [ ! -e "$ensembl_workdir/associations.tsv" ]; then
	curl -Sss 'https://ftp.ebi.ac.uk/pub/databases/gwas/releases/latest/gwas-catalog-associations_ontology-annotated-full.zip' > "$ensembl_workdir/associations.zip"
	unzip -p "$ensembl_workdir/associations.zip" > "$ensembl_workdir/associations.tsv"
fi
if [ ! -e "$ensembl_workdir/sorted_gwas.tsv" ]; then ./bin/make_sorted_associations.sh "$ensembl_workdir"; fi
node js/index.js --version="ensembl_${ensembl_version}" --workdir="$ensembl_workdir" --git="$(git describe --abbrev=0 --tags)" --timestamp="$(date -u +%FT%TZ)"
mkdir -p "$outdir"
node js/normalize_associations_cli.js mapped.json "$outdir/gwas_associations.json"
rm mapped.json
