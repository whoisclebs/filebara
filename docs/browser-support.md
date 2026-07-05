# Browser Support & Known Limitations

## Supported Browsers

Filebara is a client-side Web application that relies on:

- **WebRTC** (via PeerJS) for peer-to-peer data channels
- **Web Crypto API** (`SubtleCrypto`) for AES-256-GCM encryption and SHA-256 hashing
- **Web Workers** for off-main-thread Argon2id key derivation
- **Clipboard API** for one-click link copying (with `document.execCommand` fallback)

The following browser families are supported for the MVP:

| Browser           | Minimum Version | WebRTC | Web Crypto | Workers | Notes                                                        |
| ----------------- | --------------- | ------ | ---------- | ------- | ------------------------------------------------------------ |
| Chrome / Chromium | 80+             | ✅     | ✅         | ✅      | Primary development target                                   |
| Edge (Chromium)   | 80+             | ✅     | ✅         | ✅      | Shares Chromium engine                                       |
| Firefox           | 90+             | ✅     | ✅         | ✅      | Tested less frequently; PeerJS compatibility confirmed       |
| Safari            | 15+             | ✅     | ✅         | ✅      | WebRTC data channels supported; may have stricter ICE timing |

**Not supported:**

- Internet Explorer 11 — no WebRTC, no Web Crypto API.
- Safari < 15 — incomplete WebRTC data channel support.
- Non-Chromium Edge (< 79) — deprecated platform.

## PeerJS Signaling Dependency

Filebara uses PeerJS for WebRTC connection establishment. PeerJS requires a
signaling server to exchange session descriptions and ICE candidates between
peers before a direct data channel can be established.

### Default configuration

The current MVP uses the PeerJS Cloud signaling server (`0.peerjs.com`)
provided by the PeerJS project. This means:

- **A connection to `0.peerjs.com` is required** for transfer setup. The
  signaling connection is established when `PeerTransport.start()` is called
  (on both sender and receiver).
- **No file data passes through the signaling server.** Signaling messages are
  small (~1–2 KB) JSON strings containing SDP offers/answers and ICE candidates.
  All encrypted file chunks travel over the direct or relayed WebRTC data
  channel.
- **The signaling server knows the `file_id`** (used as the PeerJS peer ID)
  and can observe that a transfer session exists, but cannot read file
  contents or the password-derived auth key.
- **A custom PeerJS signaling server can be self-hosted** for production use
  or air-gapped environments. See the PeerJS server documentation at
  https://github.com/peers/peerjs-server.

### Signaling availability

If `0.peerjs.com` is unreachable (network proxy, firewall, DNS blocking),
Filebara cannot establish any peer connection. The error surfaces as a
connection failure:

> "A direct browser-to-browser connection could not be established.
> This can happen on certain networks or VPNs."

## WebRTC Limitations

### NAT traversal

WebRTC uses ICE (Interactive Connectivity Establishment) to find the best path
between peers. This works well on most networks but has known limitations:

| Scenario                               | Expected Behavior                                                       |
| -------------------------------------- | ----------------------------------------------------------------------- |
| Both peers on the same local network   | ✅ Direct connection via host candidates (low latency, high throughput) |
| Both peers on typical residential NAT  | ✅ Usually works via STUN-reflexive candidates                          |
| One or both peers behind symmetric NAT | ⚠️ May require a TURN relay; PeerJS Cloud does not provide TURN         |
| Corporate VPN / strict firewall        | ⚠️ May block UDP entirely, preventing WebRTC                            |
| Mobile networks (4G/5G)                | ✅ Usually works, but performance varies                                |
| Both peers behind CGNAT                | ⚠️ May fail without TURN                                                |

**Current limitation:** The MVP uses the PeerJS Cloud signaling server, which
does not include a TURN server. This means peers behind symmetric NATs or
firewalls that block UDP may not be able to connect. A TURN relay can be added
by self-hosting a PeerJS server with TURN credentials or using a third-party
TURN service.

### Data channel reliability

Filebara uses the WebRTC DataChannel in **reliable, ordered** mode. This
ensures:

- All chunks arrive in the order they were sent.
- No chunk is lost without detection (the SCTP protocol provides
  retransmission at the transport layer).

However, reliable mode means that a **stuck or slow connection** will cause
the data channel to buffer or stall. Filebara's sender-side backpressure
(bounded send window of 4 outstanding chunks) mitigates this by not
overwhelming the receiver or the network.

### Browser backgrounding and throttling

Modern browsers aggressively throttle or suspend JavaScript timers and
network activity in background tabs. This can affect Filebara transfers:

- **Sender tab must stay in the foreground** (or at least not be fully
  suspended). If the sender tab is backgrounded for an extended period,
  the browser may throttle `setTimeout`/`setInterval` callbacks used for
  the backpressure polling loop, slowing the transfer.
- **Receiver tab** can be backgrounded more safely because PeerJS data
  events are processed when the tab regains focus, but throttling may
  delay ACK messages and slow the sender.

**Recommendation:** Keep both tabs in the foreground during active transfers.

## Large-File Handling

### Memory constraints

Filebara reads the sender's file incrementally using a `FileChunker` with a
256 KiB (262,144 byte) chunk size. The receiver stores all decrypted chunks
in memory (`receivedChunks: Map<number, Uint8Array>`) until the transfer is
complete, then assembles them into a single `Blob`.

This means:

| File Size | Sender Memory      | Receiver Memory       | Notes                                                             |
| --------- | ------------------ | --------------------- | ----------------------------------------------------------------- |
| < 50 MB   | ~256 KB + overhead | ~file-size + overhead | Comfortable on all modern devices                                 |
| 50–500 MB | ~256 KB + overhead | ~file-size + overhead | Receiver needs enough RAM for the full file                       |
| > 500 MB  | ~256 KB + overhead | ~file-size + overhead | May exceed available memory on low-end devices or mobile browsers |

**Known limitations:**

- There is no streaming download — the receiver must hold the entire
  decrypted file in memory before saving. This is a limitation of the
  in-browser Blob API and the current assembly strategy.
- There is no chunk-to-disk spilling. Files larger than available system
  memory will cause the receiver tab to crash (Out-of-Memory).
- The MVP does not support **resume** after interruption. If a transfer of a
  large file fails at 90%, the entire file must be re-sent.

### Timeout considerations

- PeerJS DataConnection does not have a configurable inactivity timeout in
  the MVP. Long transfers (multi-minute) may be subject to browser tab
  throttling (see above).
- The receiver's `_waitForFirstMessage()` has a 60-second timeout between
  protocol steps (e.g., between AuthProof and AuthAccepted). Large files
  that take longer to prepare should not trigger this timeout because the
  timeout only applies to setup messages, not chunk transfer.

### Browser download limits

After successful transfer, the receiver downloads the file via a Blob URL
(`URL.createObjectURL`). Some browsers have limitations on Blob URL downloads:

- **Chrome:** No known size limit for Blob downloads, but very large Blobs
  (> 2 GB) may cause instability.
- **Firefox:** Similar behavior; very large Blobs may be slow to materialize.
- **Safari:** May have stricter memory limits for Blob URLs; large files
  may not save correctly.

## Known Environment Issues

| Issue                                        | Impact                                             | Mitigation                                                  |
| -------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| PeerJS Cloud server outage                   | All transfers fail to establish                    | Self-host a PeerJS server; monitor `0.peerjs.com` status    |
| Corporate firewall blocking `0.peerjs.com`   | Signaling fails                                    | Whitelist `0.peerjs.com:443` or use custom signaling server |
| Symmetric NAT / CGNAT without TURN           | Peer connection fails                              | Use a TURN relay server; switch to a network without CGNAT  |
| Safari Intelligent Tracking Prevention (ITP) | May affect clipboard API or storage                | Link copy has a fallback; no critical data stored           |
| Mobile browser RAM limits                    | Large files crash receiver                         | Keep files under ~200 MB for mobile transfers               |
| Browser extension interference               | Ad-blockers or privacy extensions may block PeerJS | Test with extensions disabled; whitelist the site           |

## Browser Version Verification

During the MVP development cycle, Filebara was manually tested on:

- **Brave 1.75.x** (Chromium 130+) — Linux
- **Chrome 130+** — Linux

Automated cross-browser testing (BrowserStack, Playwright) is not part of the
current MVP validation scope.

## Contributing

If you discover a browser-specific issue or a limitation not listed here,
please open a GitHub issue at the project repository. Include:

- Browser name and version
- Operating system
- Network configuration (VPN, NAT type if known)
- Steps to reproduce

---

_Last updated: July 2026_
