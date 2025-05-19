// import { TarReader, TarWriter } from '@gera2ld/tarjs';

const tarball = await fetch('http://npm.m2.blue.cdtapps.com/@ingka/skapa-webc-element/-/skapa-webc-element-0.4.3.tgz')
const array_buffer = await tarball.arrayBuffer()

// const tr = new TarReader(ab);
// console.log('tarball', tr);

import untar from "js-untar";
import pako from "pako";

const i = await pako.deflate(array_buffer);
const untarred = await untar(i.buffer);
console.log('untarred', untarred);