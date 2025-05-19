import './style.css'
import './package-card.ts'
import {fetchNpmPackageFiles, fetchPackageMetadata} from "./pacman.ts"

// Use the blue registry (default) and display package info
const blueMetadata = await fetchPackageMetadata('@ingka/skapa-webc-element')
console.log('Blue registry metadata:', blueMetadata)

// Create and append a package card
document.body.innerHTML = `
  <package-card
    name="@ingka/skapa-webc-element"
    version="${blueMetadata['dist-tags']?.latest || '0.0.0'}"
    description="INGKA Web Component Element"
    author="INGKA"
    readme="# @ingka/skapa-webc-element

A powerful web component library for building modern user interfaces.

## Installation

\`\`\`bash
npm install @ingka/skapa-webc-element
\`\`\`

## Usage

Import and use the components in your application:

\`\`\`javascript
import '@ingka/skapa-webc-element'
\`\`\`"
  ></package-card>
`;

// Fetch files using the new default registry
console.log(await fetchNpmPackageFiles('@ingka/skapa-webc-element@0.1.0'));