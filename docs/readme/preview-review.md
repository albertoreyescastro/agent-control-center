# Product preview publication review

The gallery contains three owner-supplied screenshots of the public simulated demo: hero / scenario lab, orchestration graph and conceptual publication boundary. The inspector capture is excluded.

## Processing

- Original captures: 944 × 2048 px. iOS status bar, browser controls, address overlays and scrollbars are excluded.
- Pixel crops: hero (32, 375)–(912, 1835); graph (34, 340)–(910, 1690); boundary (34, 550)–(910, 1768).
- Crops are resampled to 600 px width with Lanczos, then laid out without distorting their aspect ratios. Desktop uses three cards; narrow screens use two cards above a boundary card and concise disclosure.
- JPEG quality 94, full chroma, optimized encoding. No EXIF, comments, account metadata or original image files are shipped.
- Desktop composite: 1440 × 860 px, 231,037 bytes. Narrow composite: 800 × 1190 px, 194,989 bytes. Combined payload: 426,026 bytes.

## Privacy review

All three crops and both final composites were inspected visually. Local Tesseract OCR of both final composites was reviewed and checked against the public scanner's credential, address, private identifier and path patterns. OCR is supplementary: small diagram text can be missed, so the original crops were also inspected at full size.

Visible text is limited to the existing public product copy, the owner's already-public name, generic role aliases, conceptual architecture and simulated state. No provider credentials, accounts, prompts, responses, task payloads, private identifiers, internal endpoints or phone/browser chrome are present. The boundary retains its explicit no-live-connection disclosure. Newly added captions likewise identify simulated activity.

The validator's finite screenshot manifest fixes each exact reviewed byte stream using SHA-256 and size. New names, modified pixels, appended data and added metadata fail closed. Replacing a digest requires a renewed visual / OCR privacy review. Hashes establish reviewed-byte identity; they are not a general image secrecy detector.

## GitHub rendering

The README uses ordinary linked images and a GitHub-supported `picture` / media source pair, without scripts, styles or third-party image hosting. Every gallery tile shares the same enclosing Live Demo link; native caption links give each view an accessible text equivalent. At narrow widths the composition switches instead of creating an overflowing three-column HTML table. Static SVG diagrams and their text explanations are preserved.
