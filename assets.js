export const PUBLIC_NAMESPACE = '0';
export const MAP_ASSETS = ['map.json', 'walls.json', 'doodads.json', 'polygons.json', 'map_sea_mask.jpg', 'map_sand_mask.jpg', 'map_rock_mask.jpg', 'gui.png'];
export const SHIP_ASSETS = ['ship.json', 'ship.png', 'ship_shadow.png'];
let TOKEN = '';

export function set_token(token) { TOKEN = token; }

export async function fetch_catalog() {
    const data = await fetch(`https://asset-manager.airmash.workers.dev`).then(res=>res.json());
    /* 
    [{"k":"0/assets/maps/vanilla/doodads.json/0","owner":"a","version":0},{"k":"0/assets/maps/vanilla/ships/1/ship.json/0","w":0,"version":0},...]
    */
    const maps = {};
    for (let {k, w, version} of data) {
        const [namespace, , , mapId, asset] = k.split('/');
        maps[mapId] ||= {mapId, mapVersion:[], ships:[], w};
        if (asset == 'ships') {
            const [,,,,, ship_id, asset, version] = k.split('/');
            maps[mapId].ships[ship_id] ||= [];
            maps[mapId].ships[ship_id][SHIP_ASSETS.indexOf(asset)] = version;
        } else {
            const [,,,, asset, version] = k.split('/');
            maps[mapId].mapVersion[MAP_ASSETS.indexOf(asset)] = version;
        }
    }
    return maps;
}
window.fetch_catalog = fetch_catalog;

async function fetch_asset(key1, key2) {
    //if (key1.includes('undefined') || key2.includes('undefined')) throw "";
    const asset = (key1||key2).split('/').at(-2);
    const cache = await caches.open('asset_cache');
    const res = (key1 && await cache.match(key1)) || (key2 && await cache.match(key2));
    if (res && !location.search.includes('nocache')) {
        console.log('asset from cache', key1, key2);
        var data = asset.endsWith('json') ? await res.json() : await res.text();
    } else {
        try {
            if (!key1) throw "";
            console.log('fetching asset', key1);
            var data = await fetch(`https://asset-manager.airmash.workers.dev/${key1}`, {
                headers: {
                    "authorization": `Bearer ${TOKEN}`,
                }
            }).then(res=>asset.endsWith('json') ? res.json() : res.text());
            await cache.put(key1, new Response(asset.endsWith('json') ? JSON.stringify(data) : data));
            if (key2)
                await cache.put(key2, new Response(asset.endsWith('json') ? JSON.stringify(data) : data));
        } catch(e) {
            if (!key2) throw "fetch_asset assert 2";
            try {
                console.log('fetching asset', key2);
                var data = await fetch(`https://asset-manager.airmash.workers.dev/${key2}`, {
                    headers: {
                        "authorization": `Bearer ${TOKEN}`,
                    }
                }).then(res=>asset.endsWith('json') ? res.json() : res.text());
                // if (key1)
                //     await cache.put(key1, new Response(asset.endsWith('json') ? JSON.stringify(data) : data));
                await cache.put(key2, new Response(asset.endsWith('json') ? JSON.stringify(data) : data));
            } catch(e) {
                //console.error('fetching asset failed:', e);
                throw e;
            }
        }
    }
    return data;
}

export async function load_assets({parentMapId, mapId, mapVersion, mapBounds, ships}) {
    console.log('load_assets', {parentMapId, mapId, mapVersion, ships}, config.manifest);

    return await Promise.all([fetch_ships_assets(parentMapId, mapId, ships), fetch_map_assets(parentMapId, mapId, mapVersion)]).then(([ships_assets, map_assets])=>{
        if (ships_assets && !(config.manifest.mapId == mapId && JSON.stringify(ships) == JSON.stringify(config.manifest.ships))) {
            game.renderer.apply_ships_assets(mapId, ships, ships_assets);
        }
        if (map_assets && !(config.manifest.mapId == mapId && JSON.stringify(mapVersion) == JSON.stringify(config.manifest.mapVersion))) {
            const json = game.renderer.apply_map_assets(parentMapId, mapId, mapVersion, map_assets);
            return json.bounds;
        }
    });
};


async function fetch_map_assets(parentMapId, mapId, mapVersion) {
    if (!mapId || !mapVersion) return;

    const asset_types = MAP_ASSETS;
    const map_has_changed = config.manifest.mapId === null || (config.manifest.mapId=='vanilla' && config.manifest.mapId != mapId) || ( config.manifest.mapId < mapId);

    try {
        var assets = await Promise.all(asset_types.map((asset, i)=>{
            if (map_has_changed || config.manifest.mapVersion[i] < mapVersion[i]) {
                return fetch_asset(
                    parentMapId && `${PUBLIC_NAMESPACE}/assets/maps/${parentMapId}/${asset}/${mapVersion[i]||'0'}`, 
                    `${Network.server_id||PUBLIC_NAMESPACE}/assets/maps/${mapId}/${asset}/${mapVersion[i]||'0'}`);
            } else {
                return null;
            }
        }));
    } catch (e) {
        await new Promise(r=>setTimeout(r, 1000));
        console.log('fetch_map_assets failed, retry');
        return fetch_map_assets(parentMapId, mapId, mapVersion);
    }

    return assets;
}

async function fetch_ships_assets(parentMapId, mapId, ships) {
    if (!ships) return;
    //console.log('fetch_ships_assets', parentMapId, mapId, ships);

    const asset_types = SHIP_ASSETS;
    const map_has_changed = config.manifest.mapId === null || (config.manifest.mapId=='vanilla' && config.manifest.mapId != mapId) || ( config.manifest.mapId < mapId);

    try {
        var assets = await Promise.all(Array.from(ships, x=>x||null) //remove empty
            .flatMap((versions, id)=>versions?.map((version,i)=>[id, version, i])||[[],[],[]])
            .map(([id, version, asset_idx])=>{
                if (id && (map_has_changed || !config.manifest.ships[id] || config.manifest.ships[id][asset_idx] < version)) {
                    return fetch_asset(
                        `${PUBLIC_NAMESPACE}/assets/maps/${parentMapId}/ships/${id}/${asset_types[asset_idx]}/${version}`, 
                        `${Network.server_id||PUBLIC_NAMESPACE}/assets/maps/${mapId}/ships/${id}/${asset_types[asset_idx]}/${version}`);
                } else {
                    return null;
                }
            }));
    } catch {
        await new Promise(r=>setTimeout(r, 1000));
        console.log('fetch_ships_assets failed, retry');
        return fetch_ships_assets(parentMapId, mapId, ships);
    }

    return assets;
}

let current_uploads = {};
export async function upload_assets_throttled(assets) {
    // if a request is already in progress for the same assets(excl.version), cancel it and start a new one
    const key = Object.keys(assets).filter(x=>assets[x]).map(x=>`${x}:${assets[x].namespace}`).join('');
    //console.log('upload_assets_throttled', key, assets);
    if (!current_uploads[key]) {
        current_uploads[key] = {ts:Date.now()};
        return upload_assets(assets);
    } else {
        const diff = Date.now() - current_uploads[key].ts;
        clearTimeout(current_uploads[key].timer);
        await new Promise(resolve=>{current_uploads[key].timer = setTimeout(resolve, 1000 - diff);});
        current_uploads[key].ts = Date.now();
        return upload_assets(assets);
    }
}

async function upload_assets(assets) {
    await Promise.all(Object.keys(assets).map((asset)=>{
        if (!assets[asset]) return;
        let {version, namespace, body, copy} = assets[asset];
        const k = `${namespace||Network.server_id}/assets/${asset}${typeof version != "undefined" ? `/${version}`:''}`;
        if (typeof body != "undefined" && asset.endsWith('.json'))
            body = JSON.stringify(body);
        const url = `https://asset-manager.airmash.workers.dev/${k}${copy?`?copy=${copy}`:''}`;
        console.log('upload_assets', k, body?.length, copy, url);
        return fetch(url, {
            method: "PUT",
            headers: {
                "content-type": "application/text",
                "authorization": `Bearer ${TOKEN}`,
            },
            body,
        });
    }));
}

// async function upload_map_assets(asset, version, namespace) {
//     const mapId = config.manifest.mapId || 'vanilla';
//     return upload_assets_throttled({
//         [`maps/${mapId}/map.json`]: (typeof asset == 'undefined' || asset === 0) && {version, namespace, body:exportJson(true)},
//         [`maps/${mapId}/walls.json`]: (typeof asset == 'undefined' || asset === 1) && {version, namespace, body:''},
//         [`maps/${mapId}/doodads.json`]: (typeof asset == 'undefined' || asset === 2) && {version, namespace, body:''},
//         [`maps/${mapId}/polygons.json`]: (typeof asset == 'undefined' || asset === 3) && {version, namespace, body:''},
//         [`maps/${mapId}/map_sea_mask.jpg`]: (typeof asset == 'undefined' || asset === 4) && {version, namespace, body:exportMask('map_sea_mask.jpg', true)},
//         [`maps/${mapId}/map_sand_mask.jpg`]: (typeof asset == 'undefined' || asset === 5) && {version, namespace, body:exportMask('map_sand_mask.jpg', true)},
//         [`maps/${mapId}/map_rock_mask.jpg`]: (typeof asset == 'undefined' || asset === 6) && {version, namespace, body:exportMask('map_rock_mask.jpg', true)},
//         [`maps/${mapId}/gui.png`]: (typeof asset == 'undefined' || asset === 7) && {version, namespace, body:exportMinimap(true)},
//     });
// }
export async function upload_map_assets(assets, version, namespace) {
    const mapId = config.manifest.mapId || 'vanilla';
    let _assets = {};
    for (let asset in assets) {
        _assets[`maps/${mapId}/${MAP_ASSETS[asset]}`] = {version, namespace, body:assets[asset]};
    }
    return upload_assets_throttled(_assets);
}

// async function upload_ship_assets(ship_id, asset, version, namespace, body) {
//     const mapId = config.manifest.mapId || 'vanilla';
//     version = typeof version == 'undefined' ? config.manifest.ships[ship_id][asset] : version;
//     return upload_assets_throttled({
//         [`maps/${mapId}/ships/${ship_id}/ship.json`]: (typeof asset == 'undefined' || asset === 0) && {version, namespace, body:body||config.ships[ship_id]},
//         [`maps/${mapId}/ships/${ship_id}/ship.png`]: (typeof asset == 'undefined' || asset === 1) && {version, namespace, body:body||(!config.ships[ship_id].graphics.frame ? exportShipTexture(ship_id, false, false) : '')},
//         [`maps/${mapId}/ships/${ship_id}/ship_shadow.png`]: (typeof asset == 'undefined' || asset === 2) && {version, namespace, body:body||(!config.ships[ship_id].graphics.frame ? exportShipTexture(ship_id, true, false) : '')},
//     });
// }
export async function upload_ship_assets(ship_id, assets, version, namespace) {
    const mapId = config.manifest.mapId || 'vanilla';
    //version = typeof version == 'undefined' ? config.manifest.ships[ship_id][asset] : version;
    let _assets = {};
    for (const asset in assets) {
        version = typeof version == 'undefined' ? config.manifest.ships[ship_id][asset] : version;
        _assets[`maps/${mapId}/ships/${ship_id}/${SHIP_ASSETS[asset]}`] = {version, namespace, body:assets[asset]};
    }
    return upload_assets_throttled(_assets);
}

export async function copy_assets(mapIdSrc, mapIdTarget, namespaceSrc, namespaceTarget) {
    await upload_assets({
        [`maps/${mapIdTarget}`]: {namespace:namespaceTarget, copy:`${namespaceSrc}/assets/maps/${mapIdSrc}`},
    });
}
