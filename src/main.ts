import './style.css'
import {fetchNpmPackageFiles, fetchPackageMetadata, setNpmRegistry} from "./pacman.ts"

// Use the blue registry (default)
const blueMetadata = await fetchPackageMetadata('@ingka/skapa-webc-element')
console.log('Blue registry metadata:', blueMetadata)

// Fetch files using the new default registry
console.log(await fetchNpmPackageFiles('@ingka/skapa-webc-element@0.1.0'))