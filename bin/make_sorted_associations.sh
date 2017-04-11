#!/bin/bash

(head -1 associations.tsv;
tail -n+2 associations.tsv | \
awk -F$'\t' '{ sub(/[^0-9MXYT]+.*/,"",$12); print $0 }' |\
awk -F$'\t' '{ OFS = FS } $12 !~ /^$/ { print }' |\
sort -t $'\t' -n -k 12 -k 13;) > sorted_gwas.tsv
