#!/bin/bash
# set -euo pipefail: without it, a failed/malformed response here (curl error, or a non-JSON body
# jq can't parse) left `ensembl_version` empty but didn't stop the script - build.sh then carried
# on with an empty version number baked into download URLs, turning one clear failure here into a
# confusing cascade of downstream errors (a 404 HTML page downloaded in place of a .gtf.gz, then
# "gzip: stdin: not in gzip format" trying to unpack it).
set -euo pipefail

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
ensembl_version=$(curl --fail -Sss 'https://rest.ensembl.org/info/data?' -H 'Content-type:application/json' | jq -r '.releases[0]')
echo "$ensembl_version" > ensembl_version.txt

