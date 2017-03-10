# Get Ensembl IDS

Convert list of entrez gene ids / HGNC to ensembl gene

ftp://ftp.ncbi.nih.gov/gene/DATA/gene2ensembl.gz

Get the current release of Ensembl that we have the mapping for

ftp://ftp.ncbi.nih.gov/gene/DATA/README_ensembl

http://ftp.ensembl.org/pub/release-${ensembl_release}/gtf/homo_sapiens/Homo_sapiens.GRCh38.${ensembl_release}.chr.gtf.gz

gunzip < hg38.gtf.gz | awk -F$'\t' '$3 == "gene" && $9 ~ /protein_coding/ {  split($9,a,"\""); print $1 FS $4 FS $5 FS a[2] }' > gene_positions

Grab

https://www.ebi.ac.uk/gwas/api/search/downloads/alternative - extract out filename from headers (includes ensembl release number)

filter rows based upon the entrez gene  id start and end positions within 10,000 base window. Sort by chromosome and position.
Stream through list, accepting entries where there is no other gene closer than the target gene - read from stream of genes with start
and end. Keep track of the last gene seen, and move to first gene after SNP position.