// Supported registry URLs
const REGISTRY_URLS = {
  npm: 'https://registry.npmjs.org',
  blue: 'http://npm.m2.blue.cdtapps.com'
} as const;

export type RegistryType = keyof typeof REGISTRY_URLS;

interface PackageOptions {
  registry?: RegistryType;
}

// Default registry
let currentRegistry: RegistryType = 'blue';

// Function to set the current registry
export function setNpmRegistry(registry: RegistryType): void {
  currentRegistry = registry;
}

// Get the current registry URL
function getRegistryUrl(): string {
  return REGISTRY_URLS[currentRegistry];
}

export interface PackageMetadata {
  'dist-tags': {
    latest: string;
  };
  versions: {
    [version: string]: {
      name?: string;
      version?: string;
      description?: string;
      readme?: string;
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

type ParsedNpmPackageString = {
  scope?: string;
  name: string;
  version?: string;
};

function parsePackageString(packageString: string): ParsedNpmPackageString {
  // Regex breakdown:
  // ^(@[^/]+\/)?   => optional scope (e.g. @scope/)
  // ([^@]+)        => package name (until @ or end)
  // (@(.+))?$      => optional version (after @)
  const match = packageString.match(/^(@[^/]+\/)?([^@]+)(@(.+))?$/);

  if (!match) {
    throw new Error('Invalid npm package string');
  }

  const scope = match[1]?.slice(0, -1); // Remove trailing slash
  const name = match[2];
  const version = match[4] || 'latest'; // Default to 'latest' if no version is specified

  return {
    ...(scope && { scope }),
    name,
    version
  };
}

export async function fetchPackageMetadata(packageName: string, options: PackageOptions = {}): Promise<PackageMetadata> {
  // Remove any trailing @ that might have been accidentally added
  const cleanPackageName = packageName.endsWith('@') ? packageName.slice(0, -1) : packageName;
  const registryUrl = options.registry ? REGISTRY_URLS[options.registry] : getRegistryUrl();
  
  // Ensure the package name is properly encoded for URLs
  const encodedPackageName = cleanPackageName.startsWith('@') 
    ? `@${encodeURIComponent(cleanPackageName.slice(1))}` 
    : encodeURIComponent(cleanPackageName);
  
  // Ensure clean URL construction
  const url = new URL(encodedPackageName, registryUrl + '/');
  
  const metadataRes = await fetch(url.toString());
  
  if (!metadataRes.ok) {
    throw new Error(
      `Failed to fetch metadata for ${cleanPackageName} (Status: ${metadataRes.status})\n` +
      `URL: ${url.toString()}`
    );
  }

  return await metadataRes.json();
}

async function getTarballUrl(metadata: PackageMetadata, packageName: string, version: string | undefined): Promise<string> {
  const resolvedVersion = !version || version === 'latest' ? metadata['dist-tags'].latest : version;
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
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  for await (const chunk of stream) {
    chunks.push(chunk);
    totalLength += chunk.length;
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

export async function fetchNpmPackageFiles(packageSpecifier: string, options: PackageOptions = {}): Promise<PackageFile[]> {
  const { name, version, scope } = parsePackageString(packageSpecifier);
  const metadata = await fetchPackageMetadata(`${scope ? `${scope}/` : ''}${name}`, options);
  const tarballUrl = await getTarballUrl(metadata, name, version);
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
