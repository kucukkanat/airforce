# Visual Byte-by-Byte Structure of a Tarball

A tarball (.tar file) is a simple, linear sequence of 512-byte blocks, each representing either a file header, file data, or padding. Here's a breakdown of how the structure looks byte by byte:

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