// A link to a whole Zenodo record (`.../files-archive`) is no longer given to programs, and it is the
// zip of every file of the record (the tables of the detection tools too): the row of a file
// downloads its own file. The DOI is the one of the whole record, and stays as it is.
// The link of a DOI. A DOI of Zenodo goes to its record, on the Zenodo it comes from: the DOIs of
// the sandbox (preproduction) start with the test prefix 10.5072, which doi.org does not resolve.
export function doiLink(doi: string): string {
  if (!doi.includes('zenodo.')) return `https://doi.org/${doi}`;
  const host = doi.startsWith('10.5072/') ? 'sandbox.zenodo.org' : 'zenodo.org';
  return `https://${host}/doi/${doi}`;
}

export function downloadLink(file: { name?: string | null; link?: string | null }): string {
  const link = file.link || '';
  const archive = link.match(
    /^(https?:\/\/(?:sandbox\.)?zenodo\.org)\/api\/records\/(\d+)\/files-archive/
  );
  return archive && file.name
    ? `${archive[1]}/records/${archive[2]}/files/${encodeURIComponent(file.name)}?download=1`
    : link;
}
