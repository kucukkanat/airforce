import './style.css'
import {fetchNpmPackageFiles} from "./pacman.ts"

console.log(await fetchNpmPackageFiles('@ingka/skapa-webc-element'))