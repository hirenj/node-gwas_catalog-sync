'use strict';

// Brings gwas_associations.json up to the msdata association 1.0 format (see
// /workspaces/published-sitedata/data_schema/glycodomain-association-changes.md's "Association
// 1.0" section): p-value -> mlog10p, snp gets an "rs" prefix (or is omitted when empty), geneid
// becomes an array of integers, trait is trimmed, trait_uri becomes an array (or is omitted when
// empty). Entries with neither a trait nor a trait_uri can't be identified at all, so they're
// dropped rather than published with no meaning.
const ASSOCIATION_VERSION = '1.0';

function toMlog10p(raw) {
    // "aEb" -> -log10(a * 10^b) = -b - log10(a). A handful of GWAS catalog rows carry a positive
    // exponent (e.g. "3E10") where a probability > 1 is impossible - almost certainly a missing
    // minus sign on the exponent, so correct the sign rather than publish an invalid negative
    // mlog10p.
    let [mantissa, exponent] = raw.toUpperCase().split('E');
    let value = -Number(exponent) - Math.log10(Number(mantissa));
    if (value < 0) {
        value = Number(exponent) - Math.log10(Number(mantissa));
    }
    return Math.round(value * 1000) / 1000;
}

function normalizeEntry(entry) {
    entry.mlog10p = toMlog10p(entry['p-value']);
    delete entry['p-value'];

    if (entry.snp) {
        entry.snp = 'rs' + entry.snp;
    } else {
        delete entry.snp;
    }

    // geneid can repeat when several overlapping Ensembl transcripts map to the same Entrez gene.
    entry.geneid = [...new Set(entry.geneid.split(',').map(Number))];

    entry.trait = entry.trait.trim();

    if (entry.trait_uri) {
        entry.trait_uri = entry.trait_uri.split(', ');
    } else {
        delete entry.trait_uri;
    }

    return entry;
}

function normalize(doc) {
    if (!doc || !doc.metadata || doc.metadata.mimetype !== 'application/json+association') {
        return doc;
    }
    doc.metadata['association-version'] = ASSOCIATION_VERSION;
    (doc.metadata.software || []).forEach((entry) => {
        entry.version = String(entry.version);
    });

    Object.keys(doc.data || {}).forEach((geneid) => {
        doc.data[geneid] = doc.data[geneid]
            .filter((entry) => (entry.trait.trim() || entry.trait_uri) && entry['p-value'])
            .map(normalizeEntry);
        if (doc.data[geneid].length === 0) {
            delete doc.data[geneid];
        }
    });

    return doc;
}

module.exports = { normalize };
