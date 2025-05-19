# 🎖️ Airoforce: An NPM Package Explorer

A modern web application for exploring and dynamically loading NPM packages. Built with TypeScript and Web Components, this project allows you to browse package information from multiple registries and dynamically import packages directly in the browser.

## Features

### Package Card Component (`<package-card>`)
- 📦 Display package information in a sleek, collapsible card interface
- 🔄 Switch between different package versions
- 📖 View package README content with markdown rendering
- ⚡ Dynamically import and load packages directly in the browser
- 🔀 Support for multiple NPM registries (npm, blue)

### Example Usage

```html
<!-- Basic usage with default registry (blue) -->
<package-card package="@ingka/skapa-webc-element"></package-card>

<!-- Using npm registry -->
<package-card package="react" registry="npm"></package-card>
```

### Component Attributes

| Attribute | Description                          | Values              |
|-----------|--------------------------------------|---------------------|
| package   | The name of the npm package          | any valid package  |
| registry  | The registry to fetch packages from  | "npm" or "blue"    |

## Architecture

### Core Components

1. **PackageCard** (`src/package-card.ts`)
   - Web Component for displaying package information
   - Handles version selection and package loading
   - Built-in markdown rendering for README files
   - Collapsible UI with persistent header

2. **Package Manager** (`src/pacman.ts`)
   - Handles package metadata fetching
   - Supports multiple registries
   - Manages package file extraction
   - Handles tarball decompression

### Key Features

#### Dynamic Package Loading
The package card component can dynamically load packages by:
1. Fetching package metadata
2. Extracting the package entry point
3. Creating a data URL from the source
4. Dynamically importing the module
5. Making it available via `window._packagename`

#### Registry Support
- Support for multiple NPM registries
- Default registry configuration
- Easy switching between registries per component

#### Version Management
- Display all available versions
- Dynamic version switching
- Automatic readme updates per version

## Development

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Building
```bash
# Build for production
npm run build
```

### Project Structure
```
src/
  ├── package-card.ts    # Main web component
  ├── pacman.ts         # Package management utilities
  ├── main.ts           # Application entry point
  └── style.css         # Global styles
```

## Technical Implementation Details

### Tarball Structure and Processing

## Block Structure Overview

Each file in the archive is represented by:
- A 512-byte header block (contains metadata)
- Zero or more 512-byte data blocks (file content, padded to 512 bytes)
- The archive ends with two consecutive 512-byte blocks filled with zeros.

## Header Block Layout (First 512 bytes per file)

| Field     | Offset | Size (bytes) | Description                                    |
|-----------|--------|--------------|------------------------------------------------|
| name      | 0      | 100         | File name (null-terminated)                    |
| mode      | 100    | 8           | File permissions (octal ASCII)                 |
| uid       | 108    | 8           | User ID (octal ASCII)                         |
| gid       | 116    | 8           | Group ID (octal ASCII)                        |
| size      | 124    | 12          | File size in bytes (octal ASCII)              |
| mtime     | 136    | 12          | Modification time (octal ASCII)               |
| chksum    | 148    | 8           | Header checksum (octal ASCII)                 |
| typeflag  | 156    | 1           | File type ('0' = file, '5' = directory, etc.) |
| linkname  | 157    | 100         | Target name for links                         |
| magic     | 257    | 6           | Format identifier (e.g., "ustar\0")          |
| version   | 263    | 2           | Format version (e.g., "00")                   |
| uname     | 265    | 32          | User name                                     |
| gname     | 297    | 32          | Group name                                    |
| devmajor  | 329    | 8           | Major device number (for special files)       |
| devminor  | 337    | 8           | Minor device number (for special files)       |
| prefix    | 345    | 155         | Prefix for long file names                    |
| padding   | 500    | 12          | Padding to make header 512 bytes              |

All fields are contiguous, with numeric fields as ASCII octal numbers, and strings are null-terminated.

## File Data Blocks

Immediately after the header, the file data is stored in 512-byte blocks.

If the file is not a multiple of 512 bytes, the last block is padded with zeros.

For example, a 1000-byte file will use two full blocks (1024 bytes), with the last 24 bytes as padding.

## End of Archive

The archive ends with at least two 512-byte blocks filled with zeros to signal the end.