# Whiteboard image sync

How a picture pasted on the host's whiteboard reaches everyone else. Written
alongside the implementation on `feat/whiteboard-image-sync`, 2026-08-20.

The elements half of the broadcast — strokes, shapes, text, and the geometry of
an image — is unchanged and is documented in `lib/whiteboard/protocol.ts`. This
note is only about the bytes.

---

## The gap

An image on an Excalidraw board is two things:

| | Where it lives | Size |
| --- | --- | --- |
| The element | the scene array, as `{ type: "image", fileId, x, y, width, height, … }` | a few hundred bytes |
| The bytes | a separate map, `files`, keyed by that `fileId` | 200 KB – 2 MB |

Only the first was ever broadcast. Excalidraw hands both to `onChange`, whose
real signature is `(elements, appState, files)` — and `handleChange` in
`SessionWhiteboard.tsx` was typed `(elements: readonly unknown[])`. The third
argument was never received, so the map never entered the pipeline: not the
deltas, not the snapshot, not the viewer's `updateScene`. `addFiles`, the
imperative API that would have injected them, was not called anywhere in the
codebase.

**What the guest saw.** Confirmed by reading Excalidraw's renderer
(`dist/dev/chunk-4FTI6OG3.js`, `drawElementOnCanvas`, `case "image"`), not by
inference: with no entry in the image cache it calls `drawImagePlaceholder`,
which fills the element's rectangle with `#E7E7E7` and centres a grey picture
glyph. Because the element's `status` is the host's `"saved"`, it uses
`IMAGE_PLACEHOLDER_IMG` and not the error variant — so it is the *pending*
placeholder. The guest saw a picture that looked like it was still loading, and
it stayed that way for the rest of the session.

---

## The transport, and why

Two candidates were considered in full before any code was written.

**Chosen: LiveKit byte streams.** `streamBytes` on the sending side,
`registerByteStreamHandler` on the receiving side — the binary sibling of the
`sendText` the late-join snapshot already uses. It chunks at 15 000 bytes and
reassembles on the far side.

**Rejected: upload to UploadThing and broadcast a URL.** It reads cheaper than
it is. `BinaryFileData.dataURL` is required, so the guest cannot hold a URL — it
would have to fetch and re-encode. It puts a public, uncontrolled URL on content
from what may be a private paid session. It converts an operation with zero
marginal cost into a metered one, on a product that just built a usage counter
because metered costs matter here. And it needs an ownership record and a
deletion job that do not exist: `onUploadComplete` writes nothing to the
database and there is no `UTApi`/`deleteFiles` call anywhere in the repo, so
every whiteboard image would accumulate for ever with no record of which session
it belonged to.

The numbers behind the choice:

| Image | As a base64 dataURL | Byte-stream chunks (15 000 B) | Reliable packets (11 000 B) |
| ---: | ---: | ---: | ---: |
| 200 KB | 267 KB | 19 | 25 |
| 500 KB | 667 KB | 46 | 63 |
| 1 MB | 1.3 MB | 94 | 128 |
| 2 MB | 2.7 MB | 187 | 255 |

The right-hand column is why the bytes do not ride the delta path: 63 separate
reliable packets, plus a sequencing and reassembly protocol the delta format
deliberately does not have. The middle column is one call.

Bandwidth cost is effectively nil: a 1 MB image beside a 40-minute call at
~1.5 Mbps (≈450 MB) is 0.2 % of the session.

**The dataURL travels verbatim.** The host sends exactly what Excalidraw gave
it; the guest hands exactly that to `addFiles`. No decode, no re-encode, no
canvas — nothing in this path can silently degrade a picture. `fileId` and
`mimeType` ride as stream attributes rather than inside the payload, so the
receiver knows what it is holding before it has finished reading it.

---

## The two cases

**A guest already in the room.** The host pastes; `onChange` fires with the new
`files` map; `publishFiles` diffs it against what has already been sent and
opens a broadcast byte stream for each new file. The guest's handler reassembles
and calls `addFiles`.

The diff is by id alone, with no version — unlike an element, which needs one. An
Excalidraw file id is derived from the file's contents and the entry is
immutable, so a file that has been sent can never need sending again under the
same id.

The element and the file are independent messages and **are not ordered**. If
the element lands first, the placeholder shows for a few hundred milliseconds
and then fills. If the file lands first, `addFiles` for an element that does not
exist yet is harmless. Whichever arrives second completes the picture.

**A guest arriving later.** The snapshot answering `whiteboard_request` is
unchanged: it is still `{ elements }` over `sendText`. The files are **not**
folded into it — that would turn a payload of a few kilobytes into one of several
megabytes, and the joiner would stare at nothing until all of it had arrived.
Instead the host sends the snapshot and then immediately opens one byte stream
per file the scene references, addressed to that joiner alone. The board appears
at once and the pictures fill in behind it, which is the same behaviour everyone
already in the room saw.

---

## Convergence

This is the part that makes the feature reliable rather than usually-fine.

A lost stroke repairs itself: the host re-diffs its entire scene every 250 ms, so
the next change re-sends it. **A lost file does not.** It is sent once, on the
tick it was pasted, and never again — so one dropped stream would leave a grey
placeholder on that viewer's board for the rest of the session, with nothing in
the system able to notice.

So the viewer notices. On every scene or file change, and on its own five-second
clock, it compares the file ids the scene references against the ones it holds
and asks the host for the difference (`whiteboard_file_request`). The host
answers by streaming those files to that identity alone — never a broadcast,
because everyone else already has them.

Two bounds keep the asking honest:

- **No duplicate requests.** A file asked for less than `FILE_REQUEST_RETRY_MS`
  ago is still arriving; asking again would have the host stream the same
  megabyte twice.
- **A cap of `FILE_REQUEST_MAX_ATTEMPTS`.** The host may have closed the board,
  left the room, or genuinely no longer hold that file. A viewer that asks for
  ever is a viewer generating traffic nobody will answer.

An attempt is recorded only once the request is actually on the wire, so a
publish refused because the transport was not ready is retried rather than
counted.

---

## What this does not do

- **No persistence.** Nothing is stored anywhere, so there is nothing to clean
  up and no orphan to chase. A guest who reloads gets the board back through the
  late-join path, like everyone else.
- **No size warning.** Excalidraw caps a pasted file itself, so the worst case is
  bounded, and its own pending placeholder already tells the viewer an image is
  on its way. A second indicator of our own would be duplicating a message the
  canvas is already showing — which is also why this change ships with no new
  user-facing strings.
- **No image editing, compression or thumbnailing.** Deliberate: the moment this
  path touches the pixels, it owns their quality.
