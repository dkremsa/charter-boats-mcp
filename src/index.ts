const API_BASE = 'https://charter.boats/api/ai'
const WIDGET_MIME = 'text/html;profile=mcp-app'
const WIDGET_CSP = { resourceDomains: ['https://charter.boats', 'https://*.r2.dev', 'https://*.cloudflare.com'] }

// ── API helper ──────────────────────────────────────────────

async function api(path: string, params: Record<string, string | undefined>): Promise<any> {
  const url = new URL(`${API_BASE}${path}`)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, v)
  }
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

// ── Tool definitions ────────────────────────────────────────

const TOOLS = [
  {
    name: 'search_boats',
    title: 'Search Charter Boats',
    description: 'Search available charter boats by location, type, dates, capacity, and budget. Returns boats with prices, availability, images, and direct booking links.',
    inputSchema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: "Destination — marina, city, island, country. Fuzzy matched. Examples: 'Lefkada', 'Croatia'." },
        boat_type: { type: 'string', enum: ['sailboat', 'catamaran', 'motor', 'gulet', 'motorboat', 'motoryacht', 'trawler', 'rib'], description: 'Type of boat' },
        guests: { type: 'integer', minimum: 1, maximum: 50, description: 'Number of guests' },
        date_from: { type: 'string', description: 'Start date YYYY-MM-DD' },
        date_to: { type: 'string', description: 'End date YYYY-MM-DD' },
        price_max: { type: 'number', description: 'Max price per day in EUR' },
        cabins: { type: 'integer', description: 'Minimum cabins' },
        sort: { type: 'string', enum: ['deals', 'price_low', 'price_high', 'rating', 'newest'], description: 'Sort order' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { ui: { resourceUri: 'ui://widget/boats.html' }, 'ui/resourceUri': 'ui://widget/boats.html' },
  },
  {
    name: 'search_locations',
    title: 'Search Sailing Destinations',
    description: 'Find charter bases, marinas, islands, and cities. Returns locations with boat counts.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', minLength: 2, description: "Search query — marina, city, island, country. Examples: 'Lefkada', 'Dubrovnik'." },
      },
      required: ['q'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { ui: { resourceUri: 'ui://widget/locations.html' }, 'ui/resourceUri': 'ui://widget/locations.html' },
  },
  {
    name: 'search_pois',
    title: 'Find Nearby Points of Interest',
    description: 'Find restaurants, fuel stations, shops, and attractions near a sailing destination.',
    inputSchema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'Location name (fuzzy matched)' },
        category: { type: 'string', enum: ['restaurant', 'fuel', 'grocery', 'chandlery', 'pharmacy', 'bank', 'laundry', 'entertainment', 'water', 'ice', 'fishing', 'provisioning', 'other'], description: 'Filter by category' },
      },
      required: ['location'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: {},
  },
  {
    name: 'search_routes',
    title: 'Find Sailing Routes',
    description: 'Find sailing passages between destinations with distance, difficulty, and ratings.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Starting location (fuzzy matched)' },
        difficulty: { type: 'string', enum: ['easy', 'moderate', 'challenging'], description: 'Difficulty filter' },
      },
      required: ['from'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: {},
  },
  {
    name: 'search_trips',
    title: 'Find Sailing Itineraries',
    description: 'Search curated multi-day sailing itineraries with day-by-day plans.',
    inputSchema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'Destination (fuzzy matched)' },
        boat_type: { type: 'string', description: 'Boat type filter' },
        min_days: { type: 'integer', description: 'Minimum trip days' },
        max_days: { type: 'integer', description: 'Maximum trip days' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: {},
  },
  {
    name: 'search_content',
    title: 'Search Sailing Knowledge Base',
    description: 'Search articles, guides, and FAQs about chartering, licenses, costs, weather, and destinations.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', minLength: 2, description: "Search query. Examples: 'sailing license greece', 'what to pack'." },
      },
      required: ['q'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: {},
  },
]

// ── Tool handlers ───────────────────────────────────────────

async function callTool(name: string, args: any): Promise<{ structuredContent: any; content: { type: string; text: string }[] }> {
  switch (name) {
    case 'search_boats': {
      const data = await api('/boats', {
        location: args.location, boat_type: args.boat_type, guests: args.guests?.toString(),
        date_from: args.date_from, date_to: args.date_to, price_max: args.price_max?.toString(),
        cabins: args.cabins?.toString(), sort: args.sort, limit: '8',
      })
      const boats = data.boats ?? []
      const summary = boats.map((b: any, i: number) => `${i + 1}. ${b.title} — €${b.price_per_day}/day, ${b.capacity} guests, ${b.location}`).join('\n')
      return {
        structuredContent: data,
        content: [{ type: 'text', text: boats.length
          ? `Found ${data.total_matching ?? boats.length} boats${data.location_matched ? ` near ${data.location_matched.name}` : ''}:\n${summary}\n\nFull results: ${data.search_url ?? 'https://charter.boats/search'}`
          : 'No boats found matching your criteria. Try broadening your search.' }],
      }
    }
    case 'search_locations': {
      const data = await api('/locations', { q: args.q, limit: '10' })
      const locs = data.locations ?? []
      return {
        structuredContent: data,
        content: [{ type: 'text', text: locs.length
          ? `Found ${locs.length} locations:\n` + locs.map((l: any) => `${l.name} (${l.country}) — ${l.boat_count} boats, ${l.type}`).join('\n')
          : `No locations found for "${args.q}".` }],
      }
    }
    case 'search_pois': {
      const data = await api('/pois', { location: args.location, category: args.category, limit: '10' })
      const pois = data.pois ?? []
      return {
        structuredContent: data,
        content: [{ type: 'text', text: pois.length
          ? `Found ${pois.length} places near ${args.location}:\n` + pois.map((p: any) => `${p.name} (${p.category})${p.distance_from_marina ? ` — ${p.distance_from_marina}` : ''}`).join('\n')
          : `No points of interest found near "${args.location}".` }],
      }
    }
    case 'search_routes': {
      const data = await api('/routes', { from: args.from, difficulty: args.difficulty, limit: '5' })
      const routes = data.routes ?? []
      return {
        structuredContent: data,
        content: [{ type: 'text', text: routes.length
          ? `Found ${routes.length} routes from ${args.from}:\n` + routes.map((r: any) => `${r.title} — ${r.distance_nm}nm, ${r.difficulty}, ~${r.estimated_hours}h`).join('\n')
          : `No routes found from "${args.from}".` }],
      }
    }
    case 'search_trips': {
      const data = await api('/trips', { location: args.location, boat_type: args.boat_type, min_days: args.min_days?.toString(), max_days: args.max_days?.toString(), limit: '5' })
      const trips = data.trips ?? []
      return {
        structuredContent: data,
        content: [{ type: 'text', text: trips.length
          ? `Found ${trips.length} itineraries:\n` + trips.map((t: any) => `${t.title} — ${t.duration_days} days, ${t.distance_nm}nm`).join('\n')
          : 'No itineraries found. Try a different location or remove filters.' }],
      }
    }
    case 'search_content': {
      const data = await api('/content', { q: args.q, limit: '5' })
      const parts: string[] = []
      if (data.questions?.length) parts.push('Q&A:\n' + data.questions.map((q: any) => `Q: ${q.question}\nA: ${q.answer_summary}`).join('\n\n'))
      if (data.articles?.length) parts.push('Articles:\n' + data.articles.map((a: any) => `- ${a.title}: ${a.summary}`).join('\n'))
      return {
        structuredContent: data,
        content: [{ type: 'text', text: parts.length > 0 ? parts.join('\n\n') : `No content found for "${args.q}".` }],
      }
    }
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

// ── Widget HTML ─────────────────────────────────────────────

const BOATS_WIDGET = BOATS_WIDGET_HTML
const LOCATIONS_WIDGET = LOCATIONS_WIDGET_HTML

// ── Resources ───────────────────────────────────────────────

const RESOURCES = [
  { uri: 'ui://widget/boats.html', name: 'boats-widget', mimeType: WIDGET_MIME },
  { uri: 'ui://widget/locations.html', name: 'locations-widget', mimeType: WIDGET_MIME },
]

function readResource(uri: string) {
  const html = uri.includes('boats') ? BOATS_WIDGET : LOCATIONS_WIDGET
  return {
    contents: [{
      uri, mimeType: WIDGET_MIME, text: html,
      _meta: { ui: { prefersBorder: true, csp: WIDGET_CSP } },
    }],
  }
}

// ── JSON-RPC handler ────────────────────────────────────────

function jsonrpc(id: any, result: any) {
  return { jsonrpc: '2.0', id, result }
}

function jsonrpcError(id: any, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

async function handleRpc(msg: any): Promise<any> {
  const { id, method, params } = msg

  switch (method) {
    case 'initialize':
      return jsonrpc(id, {
        protocolVersion: params?.protocolVersion ?? '2024-11-05',
        capabilities: { resources: {}, tools: {} },
        serverInfo: { name: 'Charter Boats', version: '1.0.0' },
      })

    case 'notifications/initialized':
      return null // no response for notifications

    case 'tools/list':
      return jsonrpc(id, { tools: TOOLS })

    case 'tools/call': {
      const { name, arguments: args } = params ?? {}
      try {
        const result = await callTool(name, args ?? {})
        return jsonrpc(id, result)
      } catch (err: any) {
        return jsonrpc(id, {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        })
      }
    }

    case 'resources/list':
      return jsonrpc(id, { resources: RESOURCES })

    case 'resources/read': {
      const uri = params?.uri
      if (!uri) return jsonrpcError(id, -32602, 'Missing uri')
      return jsonrpc(id, readResource(uri))
    }

    case 'ping':
      return jsonrpc(id, {})

    default:
      return jsonrpcError(id, -32601, `Method not found: ${method}`)
  }
}

// ── CF Worker ───────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, mcp-session-id',
  'Access-Control-Expose-Headers': 'mcp-session-id',
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    const url = new URL(request.url)

    if (url.pathname === '/' || url.pathname === '/health') {
      return Response.json({ status: 'ok', name: 'Charter Boats MCP' }, { headers: CORS_HEADERS })
    }

    if (url.pathname === '/mcp' && request.method === 'GET') {
      return Response.json({
        name: 'Charter Boats',
        description: 'Search 8,000+ charter boats across the Mediterranean. MCP server for AI assistants.',
        url: 'https://charter.boats',
        tools: TOOLS.map(t => t.name),
      }, { headers: CORS_HEADERS })
    }

    if (url.pathname === '/mcp' && request.method === 'POST') {
      const body = await request.json() as any

      // Batch request (JSON array)
      if (Array.isArray(body)) {
        const results: any[] = []
        for (const msg of body) {
          const result = await handleRpc(msg)
          if (result) results.push(result)
        }
        return Response.json(results, { headers: CORS_HEADERS })
      }

      // Single request
      const result = await handleRpc(body)
      if (!result) return new Response(null, { status: 204, headers: CORS_HEADERS })
      return Response.json(result, { headers: CORS_HEADERS })
    }

    return new Response('Not Found', { status: 404, headers: CORS_HEADERS })
  },
}

// ── Inline widget HTML (avoids file reads) ──────────────────

const BOATS_WIDGET_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:transparent;color:#1a1a1a;padding:12px}.header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px}.header h2{font-family:'Zilla Slab',Georgia,serif;font-size:18px;font-weight:600}.header .count{font-size:13px;color:#666}.header a{font-size:13px;color:#0066cc;text-decoration:none}.boats{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}.boat-card{border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;background:#fff;transition:box-shadow .15s;cursor:pointer;text-decoration:none;color:inherit;display:block}.boat-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.1)}.boat-img{width:100%;height:160px;object-fit:cover;background:#f0f0f0}.boat-body{padding:10px 12px 12px}.boat-title{font-size:15px;font-weight:600;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.boat-location{font-size:13px;color:#666;margin-bottom:6px}.boat-specs{display:flex;gap:10px;font-size:12px;color:#888;margin-bottom:8px}.boat-footer{display:flex;align-items:center;justify-content:space-between}.boat-price{font-size:16px;font-weight:700}.boat-price .per-day{font-size:12px;font-weight:400;color:#666}.boat-total{font-size:12px;color:#666;margin-top:1px}.badge{display:inline-block;font-size:11px;font-weight:600;padding:2px 6px;border-radius:4px}.badge-discount{background:#dcfce7;color:#166534}.badge-instant{background:#dbeafe;color:#1e40af}.boat-rating{font-size:13px;color:#666}.boat-rating .star{color:#f59e0b}.no-results{text-align:center;padding:32px 16px;color:#666}.no-results a{color:#0066cc;text-decoration:none}@media(prefers-color-scheme:dark){body{color:#e5e5e5}.boat-card{background:#2a2a2a;border-color:#404040}.boat-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.3)}.boat-title{color:#f5f5f5}.boat-location,.boat-specs,.boat-price .per-day,.boat-total,.boat-rating,.header .count{color:#aaa}.header a{color:#5ba3f5}.no-results{color:#aaa}}
</style></head><body><div id="app"><div class="no-results">Loading...</div></div>
<script>
function render(d){var a=document.getElementById('app'),bs=d?.boats??[],su=d?.search_url??'https://charter.boats/search',ln=d?.location_matched?.name,t=d?.total_matching??bs.length;if(!bs.length){a.innerHTML='<div class="no-results"><p>No boats found.</p><p style="margin-top:8px"><a href="https://charter.boats/search" target="_blank">Browse all boats</a></p></div>';return}var h='<div class="header"><div><h2>'+(ln?esc(ln)+' Boats':'Charter Boats')+'</h2><span class="count">'+t+' boat'+(t!==1?'s':'')+' found</span></div><a href="'+esc(su)+'" target="_blank">View all &rarr;</a></div><div class="boats">';for(var b of bs){var bg=[];if(b.discount_percentage>0)bg.push('<span class="badge badge-discount">'+(b.discount_label||b.discount_percentage+'% off')+'</span>');if(b.instant_book)bg.push('<span class="badge badge-instant">Instant Book</span>');h+='<a class="boat-card" href="'+esc(b.url)+'" target="_blank">'+(b.hero_image_url?'<img class="boat-img" src="'+esc(b.hero_image_url)+'" alt="'+esc(b.title)+'" loading="lazy">':'<div class="boat-img"></div>')+'<div class="boat-body"><div class="boat-title">'+esc(b.title)+'</div><div class="boat-location">'+esc(b.location||'')+'</div><div class="boat-specs">'+(b.length_ft?'<span>'+b.length_ft+'ft</span>':'')+(b.cabins?'<span>'+b.cabins+' cabin'+(b.cabins>1?'s':'')+'</span>':'')+(b.capacity?'<span>'+b.capacity+' guests</span>':'')+(b.year?'<span>'+b.year+'</span>':'')+'</div><div class="boat-footer"><div>'+(b.price_per_day!=null?'<div class="boat-price">&euro;'+fmt(b.price_per_day)+' <span class="per-day">/day</span></div>':'')+(b.price_total?'<div class="boat-total">&euro;'+fmt(b.price_total)+' total</div>':'')+'</div><div>'+(b.rating?'<span class="boat-rating"><span class="star">&#9733;</span> '+b.rating+(b.review_count?' ('+b.review_count+')':'')+'</span>':'')+'</div></div>'+(bg.length?'<div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">'+bg.join('')+'</div>':'')+'</div></a>'}h+='</div>';a.innerHTML=h}
function esc(s){if(!s)return'';var d=document.createElement('div');d.textContent=s;return d.innerHTML}
function fmt(n){return typeof n==='number'?n.toLocaleString('en-US',{maximumFractionDigits:0}):n}
window.addEventListener('message',function(e){if(e.source!==window.parent)return;var m=e.data;if(m&&typeof m==='object'&&m.jsonrpc==='2.0'&&m.method==='ui/notifications/tool-result'){var d=m.params?.structuredContent;if(d)render(d)}})
</script></body></html>`

const LOCATIONS_WIDGET_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:transparent;color:#1a1a1a;padding:12px}.header{margin-bottom:12px}.header h2{font-family:'Zilla Slab',Georgia,serif;font-size:18px;font-weight:600}.locations{display:flex;flex-direction:column;gap:8px}.loc-card{display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid #e5e5e5;border-radius:10px;background:#fff;text-decoration:none;color:inherit;transition:box-shadow .15s}.loc-card:hover{box-shadow:0 2px 8px rgba(0,0,0,.08)}.loc-icon{width:36px;height:36px;border-radius:8px;background:#dbeafe;color:#1e40af;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}.loc-info{flex:1;min-width:0}.loc-name{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.loc-meta{font-size:12px;color:#888}.loc-count{font-size:13px;font-weight:600;color:#0066cc;white-space:nowrap}.no-results{text-align:center;padding:24px;color:#666}@media(prefers-color-scheme:dark){body{color:#e5e5e5}.loc-card{background:#2a2a2a;border-color:#404040}.loc-icon{background:#1e3a5f;color:#7bb3f5}.loc-meta{color:#aaa}.loc-count{color:#5ba3f5}}
</style></head><body><div id="app"><div class="no-results">Loading...</div></div>
<script>
var TI={marina:'⚓',city:'🏙️',island:'🏝️',municipality:'📍',state:'🗺️',country:'🌍'};
function render(d){var a=document.getElementById('app'),ls=d?.locations??[];if(!ls.length){a.innerHTML='<div class="no-results">No destinations found.</div>';return}var h='<div class="header"><h2>Sailing Destinations</h2></div><div class="locations">';for(var l of ls){var ic=TI[l.type]||'📍';h+='<a class="loc-card" href="'+esc(l.url)+'" target="_blank"><div class="loc-icon">'+ic+'</div><div class="loc-info"><div class="loc-name">'+esc(l.name)+'</div><div class="loc-meta">'+esc(l.country||'')+(l.type?' · '+l.type:'')+'</div></div>'+(l.boat_count?'<div class="loc-count">'+l.boat_count+' boats</div>':'')+'</a>'}h+='</div>';a.innerHTML=h}
function esc(s){if(!s)return'';var d=document.createElement('div');d.textContent=s;return d.innerHTML}
window.addEventListener('message',function(e){if(e.source!==window.parent)return;var m=e.data;if(m&&typeof m==='object'&&m.jsonrpc==='2.0'&&m.method==='ui/notifications/tool-result'){var d=m.params?.structuredContent;if(d)render(d)}})
</script></body></html>`
