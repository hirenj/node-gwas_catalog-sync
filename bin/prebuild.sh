#!/bin/bash

workdir=${1:-/work}
outdir=${2:-/dist}

ensembl_version=$(curl -Sss 'https://rest.ensembl.org/info/data?' -H 'Content-type:text/xml' | grep 'releases' | sed -e 's/.*<releases>//' -e 's/<.*//')
ncbi_mapping_ensembl=$(curl -Sss 'ftp://ftp.ncbi.nih.gov/gene/DATA/README_ensembl' | grep 9606 | cut -f4)
gwas_catalog_version=$( curl -Sss -I 'https://www.ebi.ac.uk/gwas/api/search/downloads/alternative' | grep Content-Disposition | sed -e 's/.*gwas_catalog_//' -e 's/.tsv//' | tr -d '\r')
gwas_catalog_ensembl=$( curl -Sss -I 'https://www.ebi.ac.uk/gwas/api/search/downloads/alternative' | grep Content-Disposition | sed -e 's/.*gwas_catalog_//' -e 's/.tsv//' | awk -F'_' '{ print $2 }' | tr -d 'e')
[[ "$ncbi_mapping_ensembl" -le "$ensembl_version" ]] && echo "NCBI mapping Ensembl version is less than or equal to the Ensembl version"
[[ "$gwas_catalog_ensembl" -eq "$ncbi_mapping_ensembl" ]] && echo "Matching Ensembl versions at GWAS catalog and NCBI"
echo "$ncbi_mapping_ensembl" > ensembl_version.txt

