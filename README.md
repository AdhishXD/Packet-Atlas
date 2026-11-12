# Packet Atlas

Packet Atlas is an interactive computer-science study site. The home page offers two courses: Computer Networks and Operating Systems.

- `/journey.html` preserves the network tracer and OSI demonstration.
- `/learn.html` is the existing Computer Networks learning guide.
- `/os.html` is the Operating Systems guide, presenting one chapter at a time with an interactive model in every chapter and 105 worked five-mark question-bank responses. Scheduling answers include Gantt charts; page replacement and disk scheduling answers show step traces.

The globe uses Natural Earth-derived country geometry from `world-atlas` with an orthographic D3 projection. The packet lab demonstrates the complete transformation from user text to UTF-8, locally generated AES-GCM ciphertext, session state, a TCP segment, an IP packet, a link-layer frame, and physical signals.

The Computer Networks Learn course provides eleven plain-language chapters, interactive DNS, packet, TCP, NAT, OSI, and latency models, a knowledge check, a glossary, and credited infrastructure imagery.

## Run locally

No package installation or build step is required. Start the included Node server so the live traceroute API is available:

```bash
npm start
```

Then open `http://localhost:4173`.

On macOS, you can also double-click `start-packet-atlas.command`; it starts the server and opens the correct URL for you.

Do not open `index.html` directly with a `file://` URL when testing live routes. Browsers cannot run the included traceroute API; the Node server must be running.

## Deploy

The repository includes a GitHub Pages workflow for the static frontend. See [`DEPLOYMENT.md`](DEPLOYMENT.md) for setup and for the small external backend required to keep live Trace search working. GitHub Pages cannot execute Node or traceroute by itself.

The deployed frontend enables tracing only after the configured API passes its health check. When no backend is connected, Packet Atlas shows an offline status and never substitutes simulated endpoints, distances, or hops.

## Important scope

Every search supplies its own public destination hostname or full website URL. The server resolves that hostname, runs a time-bounded traceroute, checks TCP reachability, and compares two independent IP-location services for each responding public hop and destination. A coordinate is plotted only when both sources agree within 250 km and the measured latency makes it physically possible. Disputed or single-source locations are explained but not plotted. A nearby Mumbai or Delhi result can be correct for a French or African website when DNS selects an Indian CDN edge; Packet Atlas labels that as a delivery edge and does not pretend it is the protected origin server.

The items between endpoints are usually routers, not application servers. Packet Atlas uses the correct node type in its copy and never manufactures a coordinate for a silent or private hop.

The journey’s mapped distance is calculated as the cumulative great-circle distance between consecutive visible, latency-compatible coordinates. It is intentionally separate from RTT. Because IP geolocation is approximate and traceroute can hide routers, the result is an estimate; a dashed unobserved span is a geographic lower bound, not a claim about exact cable length.

Traceroute cannot reveal the exact submarine cable. Packet Atlas therefore does not insert predefined landing stations or claim a specific seabed route. The learning material explains subsea transport separately from the measured hop map.

The educational question remains in the browser. The separately entered hostname is sent to the Packet Atlas server so it can resolve and trace that destination.

## Accessibility

- Keyboard-accessible controls and visible focus states
- Live status announcements during the simulation
- Text labels in addition to color-coded routes
- Reduced motion, reduced transparency, and increased contrast adaptations
- Responsive layouts from mobile to large desktop widths
