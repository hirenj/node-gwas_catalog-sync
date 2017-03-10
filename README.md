# Get Ensembl IDS

Convert list of entrez gene ids / HGNC to ensembl gene

ftp://ftp.ncbi.nih.gov/gene/DATA/gene2ensembl.gz

Get the current release of Ensembl that we have the mapping for

ftp://ftp.ncbi.nih.gov/gene/DATA/README_ensembl

Download GTF and extract out the Gene start end end positions ($3 == 'gene' => $1 (chr) FS $4 (start) FS $5 (end) FS $9 (gene_id\s"(.*)") )

http://ftp.ensembl.org/pub/release-${ensembl_release}/gtf/homo_sapiens/Homo_sapiens.GRCh38.${ensembl_release}.chr.gtf.gz

Grab

https://www.ebi.ac.uk/gwas/api/search/downloads/alternative - extract out filename from headers (includes ensembl release number)

filter rows based upon the entrez gene  id start and end positions within 100,000 base window. Sort by chromosome and position.
Stream through list, accepting entries where there is no other gene closer than the target gene - read from stream of genes with start
and end. Keep track of the last gene seen, and move to first gene after SNP position.