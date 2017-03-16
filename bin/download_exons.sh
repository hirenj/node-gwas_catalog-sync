#!/bin/bash

target_version=$1

echo "Getting exon data for Ensembl release $1"

(
 ensembl_release=$target_version
 echo -e "chromosome\tstart\tend\tgeneid"
 curl "http://ftp.ensembl.org/pub/release-${ensembl_release}/gtf/homo_sapiens/Homo_sapiens.GRCh38.${ensembl_release}.chr.gtf.gz" \
 	| gunzip \
 	| awk -F$'\t' '$3 == "gene" && $9 ~ /protein_coding/ {  split($9,a,"\""); print $1 FS $4 FS $5 FS a[2] }'\
 	| sort -n -k 1
 ) > gene_positions.tsv