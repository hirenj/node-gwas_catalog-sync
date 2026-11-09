#!/bin/bash
# pipefail: without it, this whole pipeline's exit status is just `sort`'s - a 404 (returns a small
# HTML page, not gzip) or any other upstream failure went undetected, and the script "succeeded" in
# writing a near-empty gene_positions.tsv that then looked like a valid, permanently-cached result
# to build.sh's `[ ! -e ... ]` check.
set -euo pipefail

target_version="$1"
outdir="$2"

echo "Getting exon data for Ensembl release $1"

(
 ensembl_release=$target_version
 echo -e "chromosome\tstart\tend\tgeneid"
 curl --fail "http://ftp.ensembl.org/pub/release-${ensembl_release}/gtf/homo_sapiens/Homo_sapiens.GRCh38.${ensembl_release}.chr.gtf.gz" \
 	| gunzip \
 	| awk -F$'\t' '$3 == "gene" && $9 ~ /protein_coding/ {  split($9,a,"\""); print $1 FS $4 FS $5 FS a[2] }'\
	| sort -n -k 1 -k 2
 ) > "$outdir/gene_positions.tsv.part"
mv "$outdir/gene_positions.tsv.part" "$outdir/gene_positions.tsv"