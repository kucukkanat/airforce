import './style.css'
import {fetchNpmPackageFiles, fetchPackageMetadata} from "./pacman.ts"

const metadata = await fetchPackageMetadata('@ingka/skapa-webc-element')
console.log(metadata)
console.log(await fetchNpmPackageFiles('@ingka/skapa-webc-element'))