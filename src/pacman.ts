const REGISTRY_HOSTNAME = 'http://npm.m2.blue.cdtapps.com';
// const REGISTRY_HOSTNAME = 'https://registry.npmjs.org';

interface PackageMetadata {
  'dist-tags': {
    latest: string;
  };
  versions: {
    [version: string]: {
      dist?: {
        tarball?: string;
      };
    };
  };
}

interface PackageFile {
  path: string;
  content: string;
}

interface TarHeader {
  fileName: string;
  fileSize: number;
}

export async function fetchPackageMetadata(packageName: string): Promise<PackageMetadata> {
  const metadataRes = await fetch(`${REGISTRY_HOSTNAME}/${packageName}`);
  
  if (!metadataRes.ok) {
    throw new Error(`Failed to fetch metadata for ${packageName} (Status: ${metadataRes.status})`);
  }

  return await metadataRes.json();
}

async function getTarballUrl(metadata: PackageMetadata, packageName: string, version: string): Promise<string> {
  const resolvedVersion = version === 'latest' ? metadata['dist-tags'].latest : version;
  const tarballUrl = metadata.versions[resolvedVersion]?.dist?.tarball;
  
  if (!tarballUrl) {
    throw new Error(`Version ${resolvedVersion} not found for package ${packageName}`);
  }

  return tarballUrl;
}

async function fetchAndDecompressTarball(tarballUrl: string): Promise<Uint8Array> {
  const tarballRes = await fetch(tarballUrl);
  if (!tarballRes.ok) {
    throw new Error(`Failed to fetch tarball from ${tarballUrl} (Status: ${tarballRes.status})`);
  }

  if (typeof DecompressionStream === 'undefined') {
    throw new Error('DecompressionStream API is not supported in this environment.');
  }

  if (!tarballRes.body) {
    throw new Error('Tarball response body is null.');
  }

  const decompressedStream = tarballRes.body.pipeThrough(new DecompressionStream('gzip'));
  return await readStreamToUint8Array(decompressedStream);
}

async function readStreamToUint8Array(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
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

function readTarHeader(data: Uint8Array, offset: number): TarHeader | null {
  const header = data.subarray(offset, offset + 512);
  
  // Check for end-of-archive block (all zeros)
  if (header.every(b => b === 0)) return null;

  const fileName = readString(header, 0, 100);
  if (!fileName) return null;

  const sizeOctal = readString(header, 124, 12).trim();
  const fileSize = parseInt(sizeOctal, 8);

  return { fileName, fileSize };
}

function readString(buf: Uint8Array, start: number, length: number): string {
  const bytes = buf.subarray(start, start + length);
  const nullIndex = bytes.indexOf(0);
  return new TextDecoder().decode(bytes.subarray(0, nullIndex === -1 ? length : nullIndex));
}

function extractFileContent(data: Uint8Array, offset: number, size: number): string {
  const fileContent = data.subarray(offset, offset + size);
  try {
    return new TextDecoder('utf-8').decode(fileContent);
  } catch {
    return ''; // fallback empty string if decode fails
  }
}

export async function fetchNpmPackageFiles(packageName: string, version = 'latest'): Promise<PackageFile[]> {
  const metadata = await fetchPackageMetadata(packageName);
  const tarballUrl = await getTarballUrl(metadata, packageName, version);
  const tarData = await fetchAndDecompressTarball(tarballUrl);

  const files: PackageFile[] = [];
  let offset = 0;

  while (offset < tarData.length) {
    const header = readTarHeader(tarData, offset);
    if (!header) break;
    
    offset += 512; // Move past header

    const content = extractFileContent(tarData, offset, header.fileSize);
    offset += Math.ceil(header.fileSize / 512) * 512; // Move to next header, accounting for padding

    // Strip "package/" prefix from npm package files
    const relativePath = header.fileName.startsWith('package/') 
      ? header.fileName.slice(8) 
      : header.fileName;

    files.push({ path: relativePath, content });
  }

  return files;
}
