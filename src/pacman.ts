const REGISTRY_HOSTNAME = 'http://npm.m2.blue.cdtapps.com';
// const REGISTRY_HOSTNAME = 'https://registry.npmjs.org';
export async function fetchNpmPackageFiles(packageName, version = 'latest') {
  // Fetch package metadata to get the tarball URL
  const metadataRes = await fetch(`${REGISTRY_HOSTNAME}/${packageName}`);
  
  if (!metadataRes.ok) throw new Error(`Failed to fetch metadata for ${packageName}`);

  const metadata = await metadataRes.json();
  
  const resolvedVersion = version === 'latest' ? metadata['dist-tags'].latest : version;
  const tarballUrl = metadata.versions[resolvedVersion]?.dist?.tarball;
  if (!tarballUrl) throw new Error(`Version ${resolvedVersion} not found for package ${packageName}`);

  // Fetch the tarball as a stream
  const tarballRes = await fetch(tarballUrl);
  if (!tarballRes.ok) throw new Error(`Failed to fetch tarball from ${tarballUrl}`);

  // Decompress gzip stream (using CompressionStream API)
  if (typeof DecompressionStream === 'undefined') {
    console.warn('DecompressionStream API is not supported in this browser. Package extraction may not work.');
  }
  if (!tarballRes.body) {
    throw new Error('Tarball response body is null.');
  }
  const decompressedStream = tarballRes.body.pipeThrough(new DecompressionStream('gzip'));

  // Read decompressed tar stream into Uint8Array chunks
  const reader = decompressedStream.getReader();
  
  interface ReadResult {
    done: boolean;
    value?: Uint8Array;
  }

  async function readAll(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    let totalLength = 0;
    while (true) {
      const { done, value }: ReadResult = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        totalLength += value.length;
      }
    }
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  const tarData = await readAll(reader);

  // Parse tar archive (ustar format)
  // Tar format: 512-byte headers + file data (padded to 512 bytes)
  const files = [];
  let offset = 0;

  function readString(buf, start, length) {
    const bytes = buf.subarray(start, start + length);
    const nullIndex = bytes.indexOf(0);
    return new TextDecoder().decode(bytes.subarray(0, nullIndex === -1 ? length : nullIndex));
  }

  while (offset < tarData.length) {
    // Read header block (512 bytes)
    const header = tarData.subarray(offset, offset + 512);
    offset += 512;

    // Check if this is the end-of-archive block (all zeros)
    if (header.every(b => b === 0)) break;

    const fileName = readString(header, 0, 100);
    if (!fileName) break;

    // File size is stored as octal string at offset 124, length 12
    const sizeOctal = readString(header, 124, 12).trim();
    const fileSize = parseInt(sizeOctal, 8);

    // Read file content (padded to 512-byte blocks)
    const fileContent = tarData.subarray(offset, offset + fileSize);
    offset += Math.ceil(fileSize / 512) * 512;

    // Decode file content as UTF-8 string (assuming text files)
    // For binary files, you may want to store Uint8Array instead
    let content;
    try {
      content = new TextDecoder('utf-8').decode(fileContent);
    } catch {
      content = ''; // fallback empty string if decode fails
    }

    // The npm package tarball contains files under "package/" prefix, strip it
    const relativePath = fileName.startsWith('package/') ? fileName.slice(8) : fileName;

    files.push({ path: relativePath, content });
  }

  return files;
}
