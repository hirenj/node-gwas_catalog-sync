#!/bin/bash

workdir=${1:-/work}
outdir=${2:-/dist}

# The old version cross-checks (NCBI's README_ensembl 4th column, and a release number parsed out
# of the GWAS catalog download's Content-Disposition header) no longer work: README_ensembl now
# reports a date instead of a release number, and the GWAS catalog's alternative-downloads API has
# been retired in favour of a static FTP mirror with no per-file release number. Both checks were
# advisory only (they never gated the build), so we fall back to simply using the live current
# Ensembl release for the GTF download - NCBI's gene2ensembl mapping and the GWAS catalog's gene
# ids are both continuously updated against current Ensembl ids, so there's no cross-release skew
# to protect against here.
ensembl_version=$(curl -Sss 'https://rest.ensembl.org/info/data?' -H 'Content-type:application/json' | jq -r '.releases[0]')
echo "$ensembl_version" > ensembl_version.txt

