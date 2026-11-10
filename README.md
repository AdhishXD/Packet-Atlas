# Packet Atlas

Packet Atlas is an interactive learning website that visualizes how a search request can move through the OSI model, TCP/IP, local networks, DNS, routers, subsea fiber, edge servers, and an origin server before returning to the browser.

The globe uses Natural Earth-derived country geometry from `world-atlas` with an orthographic D3 projection. The packet lab demonstrates the complete transformation from user text to UTF-8, locally generated AES-GCM ciphertext, session state, a TCP segment, an IP packet, a link-layer frame, and physical signals.

## Run locally

No package installation or build step is required. Start the included Node server so the live traceroute API is available:

```bash
npm start
```

Then open `http://localhost:4173`.

## Important scope

Every search supplies its own public destination hostname. The server resolves that hostname, runs a fresh traceroute, and geolocates responding public hops. Each estimated coordinate is checked against the measured RTT; a location that is physically impossible is explained but not plotted. A browser cannot expose the user's intermediate routers, standard traceroute measures only one direction, some routers do not respond, and private hops have no public location. If tracing fails, the UI does not invent a replacement route.

The items between endpoints are usually routers, not application servers. Packet Atlas uses the correct node type in its copy and never manufactures a coordinate for a silent or private hop.

Traceroute cannot reveal the exact submarine cable. Packet Atlas therefore does not insert predefined landing stations or claim a specific seabed route. The learning material explains subsea transport separately from the measured hop map.

The educational question remains in the browser. The separately entered hostname is sent to the Packet Atlas server so it can resolve and trace that destination.

## Accessibility

- Keyboard-accessible controls and visible focus states
- Live status announcements during the simulation
- Text labels in addition to color-coded routes
- Reduced motion, reduced transparency, and increased contrast adaptations
- Responsive layouts from mobile to large desktop widths
