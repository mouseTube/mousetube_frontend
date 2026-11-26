// A link to a whole Zenodo record (`.../files-archive`) is no longer given to programs, and it is the
// zip of every file of the record (the tables of the detection tools too): the row of a file
// downloads its own file. The DOI is the one of the whole record, and stays as it is.
export function downloadLink(file: { name?: string | null; link?: string | null }): string {
  const link = file.link || '';
  const archive = link.match(
    /^(https?:\/\/(?:sandbox\.)?zenodo\.org)\/api\/records\/(\d+)\/files-archive/
  );
  return archive && file.name
    ? `${archive[1]}/records/${archive[2]}/files/${encodeURIComponent(file.name)}?download=1`
    : link;
}
