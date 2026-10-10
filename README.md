# Charter Boats MCP server

Connect Claude, ChatGPT, Cursor or any MCP client to 14,000+ charter boats worldwide. Search boats by destination, dates, capacity and budget, explore marinas, anchorages, points of interest, sailing routes and curated itineraries, and get the full details of any boat, with live prices and booking links.

**Endpoint:** `https://charter.boats/mcp`
**Transport:** Streamable HTTP (JSON-RPC 2.0). No authentication.
**Install page:** open [charter.boats/mcp](https://charter.boats/mcp) in a browser.
**Full documentation:** [docs.charter.boats/api/ai/mcp-server](https://docs.charter.boats/api/ai/mcp-server)

The server is hosted by Charter Boats. This repository holds its listing metadata (`server.json`) and logo; the server code is not published here.

## Connect

**Claude.ai / Claude Desktop** (Pro, Max, Team or Enterprise)
Settings → Connectors → Add custom connector. Name `Charter Boats`, URL `https://charter.boats/mcp`, leave the OAuth fields blank.

**Claude Code**
```
claude mcp add --transport http charter-boats https://charter.boats/mcp
```

**ChatGPT**
Settings → Apps → Create app → MCP Server. Name `Charter Boats`, URL `https://charter.boats/mcp`, authentication `No authentication`. Enable it in a chat with **+** → Charter Boats.

**Cursor** — add to `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "charter-boats": { "url": "https://charter.boats/mcp" }
  }
}
```

**MCP Inspector**
```
npx @modelcontextprotocol/inspector
```
Transport `Streamable HTTP`, URL `https://charter.boats/mcp`.

## Tools

All eleven tools are read-only.

| Tool | What it does |
|------|--------------|
| `search_boats` | Boats by location, type, dates, capacity, budget. Up to 8, with prices, images and booking links. |
| `search_locations` | Marinas, harbours and anchorages by name, by popularity within a region (ranked on observed vessel traffic), or by reach from a place. |
| `search_pois` | Restaurants, fuel, groceries, shops and attractions near a destination. |
| `search_routes` | Sailing passages between destinations, with distance and difficulty. |
| `search_trips` | Multi-day curated itineraries. |
| `search_content` | Articles, guides and FAQs on booking, costs, licences, deposits, check-in. |
| `get_boat_details` | Full specs, 365-day availability and prices, fees, discounts, cancellation policy, check-in and check-out times. |
| `get_boat_standouts` | What is better or worse about one boat than similar boats for a week. |
| `get_poi_details` | Description, opening hours, address, contact, nearby marinas, offers. |
| `get_location_details` | Description, amenities, contact, boat count, cheapest day rate, and how busy the place is month by month from tracked vessel traffic. |
| `get_trip_details` | Day-by-day stops, distances, activities, highlights. |

Three prompt presets are registered for clients that show them: `plan-sailing-trip`, `find-charter-boat`, `explore-destination`.

`search_boats` and `search_locations` render visual cards in clients that support MCP Apps (ChatGPT, Claude).

## Try

- "Find a catamaran in Croatia for 6 guests, July 10–17, under €400/day."
- "What's near Trogir marina for provisioning?"
- "Which anchorages in the Ionian are busiest in August?"

## Links

- Website: [charter.boats](https://charter.boats)
- API documentation: [docs.charter.boats](https://docs.charter.boats/api/ai/overview)
- Rate limits: [docs.charter.boats/api/ai/mcp-server#rate-limits](https://docs.charter.boats/api/ai/mcp-server#rate-limits)
- Privacy: [charter.boats/privacy](https://charter.boats/privacy)
- Terms: [charter.boats/terms](https://charter.boats/terms)
- Support: [charter.boats/contact](https://charter.boats/contact)
