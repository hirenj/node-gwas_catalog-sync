#!/bin/bash

workdir="$1"

(head -1 "$workdir/associations.tsv";
tail -n+2 "$workdir/associations.tsv" | \
awk -F$'\t' '{ sub(/[^0-9MXYT]+.*/,"",$12); print $0 }' |\
awk -F$'\t' '{ OFS = FS } $12 !~ /^$/ { print }' |\
sort -t $'\t' -n -k 12 -k 13;) > "$workdir/sorted_gwas.tsv"
