# 0014. Images upload straight to Cloudinary with a server signature

**Status:** accepted

## Context

Image files are large and untrusted; serverless functions have body-size and time limits.

## Alternatives considered

- Upload through our own API.
- Store files in the database.

## Decision

The server signs `folder`, `allowed_formats` and `timestamp` (the secret never leaves it); the browser posts the file to Cloudinary and keeps only the URL. Limits (5 images, 2 MB, JPG, PNG, WebP) are checked in the browser and fixed in the signature. Without keys the form takes URLs.

## Consequences

No file ever passes through our server and the format and folder cannot be changed by the client.
