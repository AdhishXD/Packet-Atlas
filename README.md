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

The app attempts a real traceroute from the website's server to `www.google.com` (configurable with `TRACE_TARGET`). Every responding public hop is geolocated and plotted. A browser cannot expose the user's intermediate routers, standard traceroute only measures one direction, some routers do not respond, private hops have no public location, and IP geolocation is approximate. The UI states these limitations and falls back to a clearly labeled learning route if tracing is unavailable.

The items between endpoints are usually routers, not application servers. Packet Atlas uses the correct node type in its copy and never manufactures a coordinate for a silent or private hop.

Queries entered into the interface remain in the browser; only the fixed trace target is contacted by the server.

## Accessibility

- Keyboard-accessible controls and visible focus states
- Live status announcements during the simulation
- Text labels in addition to color-coded routes
- Reduced motion, reduced transparency, and increased contrast adaptations
- Responsive layouts from mobile to large desktop widths
