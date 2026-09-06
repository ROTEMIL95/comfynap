# ComfyNap asset sources

All imagery on the page is ComfyNap's own creative, pulled from two places. Nothing here is
stock photography or AI-generated. `assets/src/` holds the untouched originals (not needed in
production — keep for re-cropping); `assets/img/` holds the generated WebP + JPEG renditions
that the page actually loads, built by `tools/build-images.py`.

## Figma
File: `Djordje x Rome` — key `gS0tP6PqwloAHbZ69HwSyI`
Pages used: "Neck Pillow v2 - Clouds" (node `4626:10`) and "neck pillow" (node `6961:62`)

| Local file | Figma node | Content |
|---|---|---|
| `figma/main-black-v6.png` | `6721:29` | Clean product shot, dark colorway |
| `figma/dims-cnn.png` | `5018:9` | 8.5" dimensions + travel pouch + CNN quote (full card) |
| `figma/head-bobbing-95.png` | `5047:22` | "No More Head Bobbing! 95%" comparison photo |
| `figma/positions-grid.png` | `5063:2` | "For Every Travel Moment" 3×3 photo grid — source for all 9 position cards |
| `figma/memory-foam-5x.png` | `5010:31` | "Premium Memory Foam Provides 5X Support" |
| `figma/stay-cool.png` | `5047:31` | "Stay Cool On Every Flight" |
| `figma/one-size-fits-all.png` | `5010:32` | "One Size Fits All" (downloaded, not currently placed) |
| `figma/travel-case.png` | `5067:6` | "Compact Travel Case" (downloaded, not currently placed) |
| `figma/compact-travel-design.png` | `5010:51` | "Compact Travel Design / Easy to Carry" (downloaded, not currently placed) |
| `figma/gift.png` | `5010:58` | Gifting card (downloaded, not currently placed) |
| `figma/video-thumb-16x9.png` | `5010:53` | Listing video thumbnail — cropped for the Travel Ready material card |
| `figma/cnn-clouds-16x9.png` | `4866:22` | CNN quote hero image on clouds — used for lifestyle + final CTA background |
| `figma/brand-story.png` | `6969:30` | Technique headers + 4-seat "Support In Any Seat Position" strip |
| `figma/aplus-desktop-design.png` | `7314:249` | Full Amazon A+ desktop design — cropped for moisture-wicking tile and the two comparison-table pillow renders |

Each `figma/*.png` above is the Figma-rendered "export" composite of that node (not the raw
uploaded fill), which is what matches the approved listing layout pixel-for-pixel.

## Amazon
Listing: `https://www.amazon.com/dp/B0FZLV4SHQ` — ComfyNap® Versatile Travel Neck Pillow, Mercury (dark) colorway

| Local file | Source |
|---|---|
| `posters/meet-the-last-travel-pillow.jpg` | Poster for "ComfyNap - Meet The Last Travel Pillow You'll Ever Need" (0:59) |
| `posters/how-to-use.png` | Poster for "How To Use Your Neck Pillow" (1:49) |
| `posters/dr-palacios.png` | Poster for "Sleep & Mindfulness Expert Dr. Palacios Presents The Innovative Versatile Pillow" (2:16) |
| `amazon/*.jpg` | Gallery JPEGs (all colorways), kept as a fallback source; not currently used since the Figma exports cover the dark colorway at higher fidelity |

### Video streams (currently wired into the page)
All videos stream live from Amazon's HLS endpoints — no files to host yet. The
first three are brand-produced; the last two are genuine third-party content
found in Amazon's "Videos for this product" carousel (`&quot;segmentName&quot;:
&quot;Videos for this product&quot;` in the listing's page data) and are what
fill the UGC section beyond the one placeholder:

- Meet The Last Travel Pillow (0:59), brand: `.../8acbb0df-3178-4113-92a9-d1e3b6950f2f/default.jobtemplate.hls.m3u8`
- How To Use Your Neck Pillow (1:49), brand: `.../401a5579-99d3-47c4-b921-225647d2fbf3/default.jobtemplate.hls.m3u8`
- Sleep & Mindfulness Expert Dr. Palacios — product walkthrough (2:16): `.../bbeee5fc-75c2-4aaa-bb2f-147d4e595b23/default.jobtemplate.hls.m3u8`
- Dr. Palacios — 5 Tips to Help Prevent Jet Lag (1:33), same expert, second listing video: `.../d812f3af-33ce-4fec-aa88-45bb09c1ffa9/default.jobtemplate.hls.m3u8`
- **Amazon Influencer "Lori Loves Stuff"** — Versatile Travel Neck Pillow for Comfortable Flights (2:16, native vertical/9:16 format): `.../f0281115-c82a-4bc8-9814-26354a149176/default.vertical.jobtemplate.hls.m3u8`
- **Amazon Influencer "Lori Loves Stuff"** — Travel Neck Pillow with 9 Positions for Better Sleep (2:38, horizontal): `.../08bb555f-2672-45e1-9fb9-d9bda667a8e3/default.jobtemplate.hls.m3u8`

(full host: `https://m.media-amazon.com/images/S/vse-vms-transcoding-artifact-us-east-1-prod/`)

The two Lori Loves Stuff videos are Amazon-disclosed as commission-earning
influencer content (`"creatorType":"Influencer"`, `"disclosureText":"Earns
commissions"`) — labelled "Amazon Influencer" on the page, deliberately not
"Verified Customer," since that label means something specific it isn't. One
UGC card remains a genuine placeholder for organic customer footage, which
isn't available from either source yet.

These play via hls.js (loaded on demand, see `script.js` → `initVideoModal`). Swap
`data-video-src` on each trigger in `index.html` for an MP4 URL once the client supplies
video masters — hls.js will simply not load for a non-`.m3u8` source.

## Rebuilding images
```
python tools/build-images.py
```
Regenerates everything in `assets/img/` from `assets/src/`. Crop boxes and output names are
defined in the `ENTRIES` dict at the top of that file — adjust and rerun rather than editing
images by hand.

## Known open items (see plan / conversation for full list)
Color: only the dark colorway (Figma "Black" / Amazon "Mercury") is used. Price ($49.90),
product weight, box contents, and shipping/return policy are not confirmed anywhere in these
sources and remain placeholders in the page.
