#!/bin/bash
# set -euo pipefail, plus every download below going to a .part path and only `mv`-ed into its
# real cache filename on success: without this, a failed/malformed download (e.g. curl silently
# saving a 404 HTML error page, or unzip failing on a bad zip) could still leave a file sitting at
# the final cache path - which the `[ ! -e ... ]` checks below treat as "already have it", so a
# transient failure would otherwise poison the cache permanently instead of retrying next run.
set -euo pipefail

workdir=${1:-/work}
outdir=${2:-/dist}

ensembl_version=$(<ensembl_version.txt)
ensembl_workdir="$workdir/ensembl_$ensembl_version/"
mkdir -p "$ensembl_workdir"
if [ ! -e "$ensembl_workdir/gene2ensembl" ]; then
	curl --fail --output "$ensembl_workdir/gene2ensembl.gz.part" 'ftp://ftp.ncbi.nih.gov/gene/DATA/gene2ensembl.gz'
	mv "$ensembl_workdir/gene2ensembl.gz.part" "$ensembl_workdir/gene2ensembl.gz"
	gunzip "$ensembl_workdir/gene2ensembl.gz"
fi
# Was (wrongly) gated on associations.tsv's existence, not gene_positions.tsv (download_exons.sh's
# actual output) - harmless so far only because both files happen to land in the same run together
# in practice, but a real latent bug if that ever stops being true.
if [ ! -e "$ensembl_workdir/gene_positions.tsv" ]; then ./bin/download_exons.sh "$ensembl_version" "$ensembl_workdir"; fi
# EBI retired the old search-api "alternative downloads" endpoint - the ontology-annotated full
# associations file (the one with MAPPED_TRAIT/MAPPED_TRAIT_URI columns) now lives as a static zip
# on the GWAS catalog's FTP mirror.
if [ ! -e "$ensembl_workdir/associations.tsv" ]; then
	curl --fail -Sss 'https://ftp.ebi.ac.uk/pub/databases/gwas/releases/latest/gwas-catalog-associations_ontology-annotated-full.zip' > "$ensembl_workdir/associations.zip.part"
	mv "$ensembl_workdir/associations.zip.part" "$ensembl_workdir/associations.zip"
	unzip -p "$ensembl_workdir/associations.zip" > "$ensembl_workdir/associations.tsv.part"
	mv "$ensembl_workdir/associations.tsv.part" "$ensembl_workdir/associations.tsv"
fi
if [ ! -e "$ensembl_workdir/sorted_gwas.tsv" ]; then ./bin/make_sorted_associations.sh "$ensembl_workdir"; fi
node js/index.js --version="ensembl_${ensembl_version}" --workdir="$ensembl_workdir" --git="$(git describe --abbrev=0 --tags)" --timestamp="$(date -u +%FT%TZ)"
mkdir -p "$outdir"
node js/normalize_associations_cli.js mapped.json "$outdir/gwas_associations.json"
rm mapped.json
