import Vector from './Vector.js';
import { fetch_asset, MAP_ASSETS, PUBLIC_NAMESPACE, SHIP_ASSETS } from './editor.js';

var renderer, cameraState = {
    position: Vector.zero(),
    center: Vector.zero(),
    lastOverdraw: Vector.zero(),
    lastOverdrawTime: 0,
    shake: 0
    }, 
    pixiTextureByName = {}, 
    pixiSpriteByName = {}, 
    pixiContainerByName = {},
    userScalingFactor
    ;

Graphics.setup = function() {
    initGameObjScreenVars(window.innerWidth, window.innerHeight),
    setupPixiRenderer(),
    Textures.load(),
    setupPixiContainers(),
    initContainerScales(),
    initPixiTextures(),
    Graphics.apply_bounds(game.server.config.mapBounds),
    Graphics.load_assets({...game.server.config}),
    UI.setupHUD();
    //Graphics.updateDebug();
};

var setupPixiRenderer = function() {
    PIXI.utils.skipHello(),
    PIXI.settings.PRECISION_FRAGMENT = PIXI.PRECISION.HIGH;
    var pixiSettings = {
        autoResize: true,
        clearBeforeRender: false,
        preserveDrawingBuffer: true
    };
    config.settings.hidpi && (pixiSettings.resolution = 2);
    try {
        renderer = new PIXI.WebGLRenderer(game.screenX,game.screenY,pixiSettings);
    } catch (e) {
        try {
            // workaround for WebGL failure on Linux + Mesa drivers + Firefox, see issue #18
            PIXI.settings.SPRITE_MAX_TEXTURES = Math.min(PIXI.settings.SPRITE_MAX_TEXTURES, 16);
            renderer = new PIXI.WebGLRenderer(game.screenX,game.screenY,pixiSettings);
        } catch (e) {
            UI.popBigMsg(2);
            return;
        }
    }
    document.body.appendChild(renderer.view);
    Graphics.renderer = renderer;
}

var setupPixiContainers = function() {
    for (var containerName of ["game", "ui0", "ui1", "ui2", "ui3", "ui4", "hudHealth", "hudEnergy", "flags", "doodads", "map", "sea", "objects", "groundobjects", "fields", "shadows", "powerups", "crates", "aircraft", "aircraftme", "glows", "playernames", "bubbles", "thrusters", "projectiles", "smoke", "explosions"])
        pixiContainerByName[containerName] = new PIXI.Container;
    for (var childContainerName of ["smoke", "crates", "thrusters", "projectiles", "aircraft", "aircraftme", "glows", "explosions", "powerups", "playernames", "flags", "bubbles"])
        pixiContainerByName.objects.addChild(pixiContainerByName[childContainerName]);
    for (var childContainerName of ["fields"])
        pixiContainerByName.groundobjects.addChild(pixiContainerByName[childContainerName]);
    game.graphics.layers = pixiContainerByName;
    game.graphics.gui = pixiSpriteByName;
    game.graphics.sprites = pixiTextureByName;
}

var initPixiTextures = function() {
    pixiTextureByName.render = PIXI.RenderTexture.create(game.screenX + config.overdraw, game.screenY + config.overdraw, void 0, config.settings.hidpi ? 2 : void 0),
    pixiTextureByName.renderSprite = new PIXI.Sprite(pixiTextureByName.render),
    pixiTextureByName.shadows = PIXI.RenderTexture.create(game.shadowX, game.shadowY, void 0, config.settings.hidpi ? 2 : void 0),
    pixiTextureByName.shadowsSprite = new PIXI.Sprite(pixiTextureByName.shadows),
    pixiTextureByName.shadowsSprite.scale.set(game.screenX / game.shadowX, game.screenY / game.shadowY),
    pixiTextureByName.shadowsSprite.blendMode = PIXI.BLEND_MODES.MULTIPLY,
    pixiTextureByName.shadowsSprite.alpha = .4,
    pixiContainerByName.game.addChild(pixiTextureByName.renderSprite),
    pixiContainerByName.game.addChild(pixiContainerByName.groundobjects),
    pixiContainerByName.game.addChild(pixiTextureByName.shadowsSprite),
    pixiTextureByName.shade = Textures.sprite("screenshade"),
    pixiTextureByName.shade.scale.set(game.shadowX / 126 / game.scale, game.shadowY / 126 / game.scale),
    pixiTextureByName.shade.alpha = .825,
    pixiTextureByName.shade.anchor.set(.5, .5),
    pixiContainerByName.shadows.addChild(pixiTextureByName.shade),
    pixiContainerByName.game.addChild(pixiContainerByName.objects),
    pixiContainerByName.game.addChild(pixiContainerByName.ui0),
    pixiContainerByName.game.addChild(pixiContainerByName.ui1),
    pixiContainerByName.game.addChild(pixiContainerByName.ui2),
    pixiContainerByName.game.addChild(pixiContainerByName.ui3),
    pixiContainerByName.game.addChild(pixiContainerByName.ui4),
    pixiSpriteByName.hudTextureEnergy = PIXI.RenderTexture.create(80, 348, void 0, config.settings.hidpi ? 2 : void 0),
    pixiSpriteByName.hudSpriteEnergy = new PIXI.Sprite(pixiSpriteByName.hudTextureEnergy),
    pixiSpriteByName.hudSpriteEnergy.pivot.set(-250, 174),
    pixiSpriteByName.hudTextureHealth = PIXI.RenderTexture.create(80, 348, void 0, config.settings.hidpi ? 2 : void 0),
    pixiSpriteByName.hudSpriteHealth = new PIXI.Sprite(pixiSpriteByName.hudTextureHealth),
    pixiSpriteByName.hudSpriteHealth.pivot.set(330, 174),
    pixiContainerByName.game.addChild(pixiSpriteByName.hudSpriteEnergy),
    pixiContainerByName.game.addChild(pixiSpriteByName.hudSpriteHealth)
};

Graphics.updateDebug = function() {
    if (!window.DEVELOPMENT) return;
    if (config.debug.collisions) {
        if (!this.gfx) {
            let gfx = new PIXI.Graphics;
            for (let i = 0; i < config.walls.length; i++) {
                gfx.beginFill(16777215, .2);
                gfx.drawCircle(config.walls[i][0], config.walls[i][1], config.walls[i][2]);
                gfx.endFill();
            }
            pixiContainerByName.objects.addChild(gfx)
            this.gfx = gfx;
        }
    } else {
        if (this.gfx) {
            pixiContainerByName.objects.removeChild(this.gfx);
            this.gfx.destroy();
            this.gfx = null;
        }
    }

    const players = Players.all();
    for (let player_id in players) {
        players[player_id].updateDebug();
    }

    pixiContainerByName.map.visible = !config.debug.hide_container_map;

    if (config.debug.hide_texture_forest) {
        pixiTextureByName.forest.alpha = 0;
    } else {
        pixiTextureByName.forest.alpha = 1;
    }

    if (config.debug.hide_texture_rock) {
        pixiTextureByName.rock.alpha = 0;
    } else {
        pixiTextureByName.rock.alpha = 1;
    }

    if (config.debug.hide_mask_rock) {
        if (pixiTextureByName.rock.mask) {
            pixiContainerByName.map.removeChild(pixiTextureByName.rock.mask);
            pixiTextureByName.rock.mask = null;
        }
    } else {
        if (!pixiTextureByName.rock.mask) {
            pixiContainerByName.map.addChild(pixiTextureByName.rock_mask);
            pixiTextureByName.rock.mask = pixiTextureByName.rock_mask;
        }
    }

    if (config.debug.hide_texture_sand) {
        pixiTextureByName.sand.alpha = 0;
    } else {
        pixiTextureByName.sand.alpha = 1;
    }

    if (config.debug.hide_mask_sand) {
        if (pixiTextureByName.sand.mask) {
            pixiContainerByName.map.removeChild(pixiTextureByName.sand.mask);
            pixiTextureByName.sand.mask = null;
        }
    } else {
        if (!pixiTextureByName.sand.mask) {
            pixiContainerByName.map.addChild(pixiTextureByName.sand_mask);
            pixiTextureByName.sand.mask = pixiTextureByName.sand_mask;
        }
    }

    if (config.debug.hide_mask_map) {
        if (pixiContainerByName.map.mask) {
            pixiContainerByName.map.removeChild(pixiTextureByName.polygons);
            pixiContainerByName.map.mask = null;
        }
    } else {
        if (!pixiContainerByName.map.mask && pixiTextureByName.polygons) {
            pixiContainerByName.map.addChild(pixiTextureByName.polygons);
            pixiContainerByName.map.mask = pixiTextureByName.polygons;
        }
    }

    if (config.debug.hide_container_sea) {
        pixiTextureByName.sea.alpha = 0;
        pixiTextureByName.sea_mask.alpha = 0;

        var overdrawWidth = renderer.width + config.overdraw,
        overdrawHeight = renderer.height + config.overdraw;
        pixiTextureByName.sea_solid = new PIXI.Sprite(PIXI.Texture.WHITE);
        pixiTextureByName.sea_solid.tint = 0x555555;
        pixiTextureByName.sea_solid.width = overdrawWidth;
        pixiTextureByName.sea_solid.height = overdrawHeight;
        pixiContainerByName.sea.addChild(pixiTextureByName.sea_solid);
    } else {
        pixiTextureByName.sea.alpha = 1;
        pixiTextureByName.sea_mask.alpha = config.debug.hide_texture_sea_mask ? 0 : 0.5;
        pixiContainerByName.sea.removeChild(pixiTextureByName.sea_solid);
        pixiTextureByName.sea_solid?.destroy();
    }

    if (config.debug.hide_container_shadows) {
        this.removed_shadows = true;
        pixiContainerByName.game.removeChild(pixiTextureByName.shadowsSprite);
    } else {
        if (this.removed_shadows)
            pixiContainerByName.game.addChild(pixiTextureByName.shadowsSprite);
    }
};

Graphics.resizeRenderer = function(width, height) {
    var overdrawWidth = width + config.overdraw,
        overdrawHeight = height + config.overdraw;
    initGameObjScreenVars(width, height),
    initContainerScales(),
    renderer.resize(width, height),
    pixiTextureByName.render.resize(overdrawWidth, overdrawHeight),
    pixiTextureByName.shadows.resize(width, height),
    pixiTextureByName.shadowsSprite.scale.set(game.screenX / game.shadowX, game.screenY / game.shadowY),
    pixiTextureByName.shade.scale.set(game.shadowX / 126 / game.scale, game.shadowY / 126 / game.scale);
    for (var textureName of ["sea", "forest", "sand", "rock"])
        pixiTextureByName[textureName].width = overdrawWidth,
        pixiTextureByName[textureName].height = overdrawHeight;
    UI.resizeMinimap(),
    UI.resizeHUD(),
    initTextureScalesAndMasks(),
    initPolygonsScale(),
    Graphics.setCamera(cameraState.center.x, cameraState.center.y),
    game.state == Network.STATE.PLAYING && Network.resizeHorizon()
};

Graphics.toggleHiDPI = function() {
    Tools.setSettings({ hidpi: !config.settings.hidpi }),
    UI.updateMainMenuSettings(),
    1 == config.oldhidpi == config.settings.hidpi ? UI.showMessage("alert", "", 1e3) : UI.showMessage("alert", 'Reload game to apply HiDPI settings<br><span class="button" onclick="Games.redirRoot()">RELOAD</span>', 1e4)
};

var initGameObjScreenVars = function(screenInnerWidth, screenInnerHeight) {
    game.screenX = screenInnerWidth,
    game.screenY = screenInnerHeight,
    game.halfScreenX = screenInnerWidth / 2,
    game.halfScreenY = screenInnerHeight / 2,
    game.shadowX = Math.floor(game.screenX / config.shadowScaling),
    game.shadowY = Math.floor(game.screenY / config.shadowScaling)
};

var initContainerScales = function() {
    game.scale = (game.screenX + game.screenY) / UI.getScalingFactor(),
    pixiContainerByName.groundobjects.scale.set(game.scale),
    pixiContainerByName.objects.scale.set(game.scale),
    pixiContainerByName.shadows.scale.set(game.scale),
    pixiContainerByName.doodads.scale.set(game.scale),
    pixiContainerByName.bubbles.scale.set(1 / game.scale),
    modifyConfigIfMobile()
};

var modifyConfigIfMobile = function() {
    if (config.mobile) {
        var e = game.screenX > game.screenY ? "landscape" : "portrait";
        config.phone = game.screenX <= 599 && "portrait" == e || game.screenY <= 599 && "landscape" == e,
        config.tablet = game.screenX >= 600 && game.screenX <= 1024 && "portrait" == e || game.screenY >= 600 && game.screenY <= 1024 && game.screenX <= 1024 && "landscape" == e,
        config.maxScoreboard = 8,
        config.phone && (config.minimapSize = 160,
        config.maxScoreboard = 5),
        config.tablet && (config.maxScoreboard = 7),
        config.minimapPaddingX = game.screenX / 2 - config.minimapSize / 2
    }
};

var initMapTextures = function({sea_mask, sand_mask, rock_mask}) {
    if (!pixiTextureByName.sea) {
        const overdrawWidth = renderer.width + config.overdraw,
            overdrawHeight = renderer.height + config.overdraw;
        pixiTextureByName.sea = Textures.tile("map_sea", overdrawWidth, overdrawHeight);
        pixiTextureByName.forest = Textures.tile("map_forest", overdrawWidth, overdrawHeight);
        pixiTextureByName.sand = Textures.tile("map_sand", overdrawWidth, overdrawHeight);
        pixiTextureByName.rock = Textures.tile("map_rock", overdrawWidth, overdrawHeight);
        pixiContainerByName.sea.addChild(pixiTextureByName.sea);
        for (var textureName of ["forest", "sand", "rock"])
            pixiContainerByName.map.addChild(pixiTextureByName[textureName]);
        pixiContainerByName.map.addChild(pixiContainerByName.doodads);
    }

    if (pixiTextureByName.sea_mask) {
        pixiContainerByName.sea.removeChild(pixiTextureByName.sea_mask);
        pixiContainerByName.map.removeChild(pixiTextureByName.rock_mask);
        pixiContainerByName.map.removeChild(pixiTextureByName.sand_mask);
    }
    pixiTextureByName.sea_mask = Textures.sprite(sea_mask);
    pixiTextureByName.sea_mask.scale.set(8, 8);
    pixiTextureByName.sea_mask.blendMode = PIXI.BLEND_MODES.MULTIPLY;
    pixiTextureByName.sea_mask.alpha = .5;
    pixiTextureByName.sand_mask = Textures.sprite(sand_mask);
    pixiTextureByName.sand_mask.scale.set(8, 8);
    pixiTextureByName.sand.mask = pixiTextureByName.sand_mask;
    pixiTextureByName.rock_mask = Textures.sprite(rock_mask);
    pixiTextureByName.rock_mask.scale.set(8, 8);
    pixiTextureByName.rock.mask = pixiTextureByName.rock_mask;

    pixiContainerByName.sea.addChild(pixiTextureByName.sea_mask);
    for (var textureName of ["sand_mask", "rock_mask"])
        pixiContainerByName.map.addChild(pixiTextureByName[textureName]);

    initTextureScalesAndMasks();
};

var initTextureScalesAndMasks = function() {
    var textureName;
    for (textureName of ["sea", "forest", "sand", "rock"])
        pixiTextureByName[textureName].tileScale.set(game.scale, game.scale);
    for (textureName of ["sea", "sand", "rock"])
        pixiTextureByName[textureName + "_mask"].scale.set(8 * game.scale, 8 * game.scale)
};

var initPolygonsScale = function() {
    pixiTextureByName.polygons.scale.x = game.scale;
    pixiTextureByName.polygons.scale.y = game.scale;
    if (pixiTextureByName.polygons_overlay) {
        pixiTextureByName.polygons_overlay.scale.x = game.scale;
        pixiTextureByName.polygons_overlay.scale.y = game.scale;
    }
};
Graphics.initPolygonsScale = initPolygonsScale;

Graphics.createMapFromJson = function(json, walls_json, doodads_json, polygons_json) {
    const {doodads, groundDoodads, walls, polygons, bounds, objects, extra} = json;

    config.doodads = doodads;
    config.groundDoodads = groundDoodads;
    config.walls = walls;
    config.polygons = polygons;
    config.objects = objects;
    config.extra = extra;

    // reset mountains, ground doodads
    Mobs.setupDoodads();

    // update debug
    if (Graphics.gfx) {
        pixiContainerByName.objects.removeChild(Graphics.gfx);
        Graphics.gfx.destroy();
        Graphics.gfx = null;
        Graphics.updateDebug();
    }

    // clear polygons
    if (pixiContainerByName.map.mask) {
        pixiContainerByName.map.removeChild(pixiTextureByName.polygons);
        pixiContainerByName.map.mask = null;
    }

    pixiTextureByName.polygons = new PIXI.Graphics;
    pixiTextureByName.polygons.beginFill();
    var t, r, o, points, a, l, u, c = 0, h = 0, d = 0;
    for (l = 0; l < polygons.length; l++) {
        for (o = 0, u = 0; u < polygons[l].length; u++) {
            for (points = [], a = 0; a < polygons[l][u].length; a += 2) {
                t = polygons[l][u][a] + h;
                r = polygons[l][u][a + 1] + d;
                points.push(parseFloat(t), -parseFloat(r));
                h = t;
                d = r;
                c++;
            }
            pixiTextureByName.polygons.drawPolygon(points);
            0 != o && pixiTextureByName.polygons.addHole();
            o++;
        }
    }
    pixiTextureByName.polygons.endFill();
    initPolygonsScale();
    pixiContainerByName.map.addChild(pixiTextureByName.polygons);
    pixiContainerByName.map.mask = pixiTextureByName.polygons;

    cameraState.lastOverdrawTime = -2e3;
};

Graphics.apply_bounds = function(mapBounds) {
    console.log('apply_bounds', mapBounds);
    // update scalingFactor and resize if map bounds smaller than screen (TODO: also prevent user from increasing scalingFactor if that's the case)
    const cur_scaling_factor = UI.getScalingFactor();
    if (userScalingFactor) {
        config.settings.scalingFactor = userScalingFactor;
        game.scale = (game.screenX + game.screenY) / userScalingFactor;
        userScalingFactor = null;
    }
    let scalingFactor = UI.getScalingFactor();
    while (game.screenX > (mapBounds.MAX_X - mapBounds.MIN_X)*game.scale || game.screenY > (mapBounds.MAX_Y - mapBounds.MIN_Y)*game.scale) {
        scalingFactor -= 100;
        game.scale = (game.screenX + game.screenY) / scalingFactor;
    }
    if (scalingFactor !== cur_scaling_factor) {
        console.log('changing scalingFactor', scalingFactor);
        userScalingFactor = config.settings.scalingFactor;
        config.settings.scalingFactor = scalingFactor;
        Graphics.resizeRenderer(window.innerWidth, window.innerHeight);
    }
        
    UI.maskMinimap();    
};

Graphics.load_assets = async function ({parentMapId, mapId, mapVersion, mapBounds, ships}) {
    console.log('load_assets', {parentMapId, mapId, mapVersion, ships}, config.manifest);

    return await Promise.all([fetch_ships_assets(parentMapId, mapId, ships), fetch_map_assets(parentMapId, mapId, mapVersion)]).then(([ships_assets, map_assets])=>{
        if (ships_assets && !(config.manifest.mapId == mapId && JSON.stringify(ships) == JSON.stringify(config.manifest.ships))) {
            apply_ships_assets(mapId, ships, ships_assets);
        }
        if (map_assets && !(config.manifest.mapId == mapId && JSON.stringify(mapVersion) == JSON.stringify(config.manifest.mapVersion))) {
            const json = apply_map_assets(parentMapId, mapId, mapVersion, map_assets);
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

function apply_map_assets(parentMapId, mapId, mapVersion, map_assets) {
    //console.log('apply_map_assets', {parentMapId, mapId, mapVersion, map_assets}, config.manifest);
    const [json, walls_json, doodads_json, polygons_json, sea_mask_uri, sand_mask_uri, rock_mask_uri, gui_uri] = map_assets;

    // optimization (assumption is that mapId starts as a copy of parentMapId) 
    const asset_has_changed = (i) => config.manifest.mapId == null || !(config.manifest.mapId == parentMapId && mapVersion[i] == config.manifest.mapVersion[i]);
    
    // concurrency check (while downloading, map or version might have changed)
    const map_has_changed = config.manifest.mapId === null || (config.manifest.mapId=='vanilla' && config.manifest.mapId != mapId) || ( config.manifest.mapId < mapId);
    const check = (i) => map_has_changed || mapVersion[i] > config.manifest.mapVersion[i];

    if (json && check(0)) {
        if (asset_has_changed(0)) {
            console.log('apply_map_assets json');
            Graphics.createMapFromJson(json, walls_json, doodads_json, polygons_json);
        }
        config.manifest.mapVersion[0] = mapVersion[0];
    }
    
    let textures = {};
    if (sea_mask_uri && check(4)) {
        if (asset_has_changed(4)) {
            console.log('apply_map_assets sea_mask');
            // alternative to ${mapVersion[4]||''}: call Textures.delete
            Textures.add(`${mapId}_map_sea_mask${mapVersion[4]||''}`, sea_mask_uri);
            textures['sea_mask'] = `${mapId}_map_sea_mask${mapVersion[4]||''}`;
        } else {
            textures['sea_mask'] = `${parentMapId}_map_sea_mask${mapVersion[4]||''}`;
        }
        config.manifest.mapVersion[4] = mapVersion[4];
    }
    if (sand_mask_uri && check(5)) {
        if (asset_has_changed(5)) {
            console.log('apply_map_assets sand_mask');
            Textures.add(`${mapId}_map_sand_mask${mapVersion[5]||''}`, sand_mask_uri);
            textures['sand_mask'] = `${mapId}_map_sand_mask${mapVersion[5]||''}`;
        } else {
            textures['sand_mask'] = `${parentMapId}_map_sand_mask${mapVersion[5]||''}`;
        }
        config.manifest.mapVersion[5] = mapVersion[5];
    }
    if (rock_mask_uri && check(6)) {
        if (asset_has_changed(6)) {
            console.log('apply_map_assets rock_mask');
            Textures.add(`${mapId}_map_rock_mask${mapVersion[6]||''}`, rock_mask_uri);
            textures['rock_mask'] = `${mapId}_map_rock_mask${mapVersion[6]||''}`;
        } else {
            textures['rock_mask'] = `${parentMapId}_map_rock_mask${mapVersion[6]||''}`;
        }
        config.manifest.mapVersion[6] = mapVersion[6];
    }
    
    initMapTextures(textures);

    if (gui_uri && check(7)) {
        if (asset_has_changed(7)) {
            console.log('apply_map_assets gui');
            Textures.delete("gui");
            Textures.delete("ui_minimap");
            Textures.add('gui', gui_uri);
            UI.setupMinimap();
        }
        config.manifest.mapVersion[7] = mapVersion[7];
    }

    UI.maskMinimap();
    cameraState.lastOverdrawTime = -2e3;
    config.manifest.mapId = mapId;
    config.manifest.parentMapId = parentMapId;

    if (json)
        return json;
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

function apply_ships_assets(mapId, ships, assets) {
    console.log('apply_ships_assets', mapId, ships, assets, config.manifest);
    const asset_types = SHIP_ASSETS;
    const map_has_changed = config.manifest.mapId === null || (config.manifest.mapId=='vanilla' && config.manifest.mapId != mapId) || ( config.manifest.mapId < mapId);

    for (let i=0; i<assets.length; i+=asset_types.length) {
        const id = i/asset_types.length;
        const [ship_json, ship_datauri, ship_shadow_datauri] = assets.slice(i, i+asset_types.length);

        // concurrency check (while downloading, ships might have changed)
        const check = (asset_idx) => map_has_changed || 
            (ships[id] && !config.manifest.ships[id]) || //ship was added
            (!ships[id] && config.manifest.ships[id]) || //ship was removed
            (!(!ships[id] && !config.manifest.ships[id]) && ships[id][asset_idx] > config.manifest.ships[id][asset_idx]);

        const checks = [
            ship_json && check(0),
            ship_datauri !== null && check(1),
            ship_shadow_datauri !== null && check(2),
        ];

        if (checks[0]) {
            config.ships[id] = ship_json;
            if (config.manifest.ships[id])
                config.manifest.ships[id][0] = ships[id][0];
            else
                config.manifest.ships[id] = [ships[id][0]];
        }

        if (checks[1]) {
            Textures.delete(config.ships[id].name);
            Textures.add(config.ships[id].name, ship_datauri, 'aircraft', config.ships[id].graphics.frame);
            config.manifest.ships[id][1] = ships[id][1];
        }
        if (checks[2]) {
            Textures.delete(config.ships[id].name+'_shadow');
            Textures.add(config.ships[id].name+'_shadow', ship_shadow_datauri, 'shadows', config.ships[id].graphics.frame_shadow);
            config.manifest.ships[id][2] = ships[id][2];
        }

        if (ships[id])
            Textures.add_ship_template(config.ships[id].name, config.ships[id].name, config.ships[id].graphics.anchor);
    }
    Object.values(Players.all()).forEach(player=>player.sprites.sprite?player.reloadGraphics():player.setupGraphics());
    UI.setupAircraft();
}


Graphics.initSprite = function(name, container, properties) {
    var sprite = Textures.sprite(name);
    return properties.position && sprite.position.set(properties.position[0], properties.position[1]),
    properties.anchor && sprite.anchor.set(properties.anchor[0], properties.anchor[1]),
    properties.pivot && sprite.pivot.set(properties.pivot[0], properties.pivot[1]),
    properties.scale && (Array.isArray(properties.scale) ? sprite.scale.set(properties.scale[0], properties.scale[1]) : sprite.scale.set(properties.scale)),
    properties.rotation && (sprite.rotation = properties.rotation),
    properties.alpha && (sprite.alpha = properties.alpha),
    properties.blend && (sprite.blendMode = PIXI.BLEND_MODES[properties.blend]),
    properties.tint && (sprite.tint = properties.tint),
    properties.mask && (sprite.mask = properties.mask),
    'visible' in properties && (sprite.visible = properties.visible),
    container.addChild(sprite),
    sprite
};

Graphics.transform = function(container, xPos, yPos, rot, xScale, yScale, alpha) {
    if (!container) return;
    container.position.set(xPos, yPos),
    null != yScale ? container.scale.set(xScale, yScale) : null != xScale && container.scale.set(xScale),
    null != rot && (container.rotation = rot),
    null != alpha && (container.alpha = alpha)
};

Graphics.update = function() {
    pixiTextureByName.shade.position.set(cameraState.center.x / config.shadowScaling, cameraState.center.y / config.shadowScaling),
    pixiTextureByName.renderSprite.position.set(game.scale * (-cameraState.position.x + cameraState.lastOverdraw.x) - config.overdraw / 2, game.scale * (-cameraState.position.y + cameraState.lastOverdraw.y) - config.overdraw / 2),
    pixiContainerByName.objects.position.set(-cameraState.position.x * game.scale, -cameraState.position.y * game.scale),
    pixiContainerByName.groundobjects.position.set(-cameraState.position.x * game.scale, -cameraState.position.y * game.scale),
    pixiContainerByName.doodads.position.set(-cameraState.position.x * game.scale + config.overdraw / 2, -cameraState.position.y * game.scale + config.overdraw / 2),
    pixiContainerByName.shadows.position.set(-cameraState.position.x * (game.scale / config.shadowScaling), -cameraState.position.y * (game.scale / config.shadowScaling)),
    pixiSpriteByName.minimap_box?.position.set(game.screenX - config.minimapPaddingX - config.minimapSize * ((16384 - cameraState.center.x) / 32768), game.screenY - config.minimapPaddingY - config.minimapSize / 2 * ((8192 - cameraState.center.y) / 16384)),
    config.overdrawOptimize ? (Math.abs(cameraState.position.x - cameraState.lastOverdraw.x) > config.overdraw / 2 / game.scale || Math.abs(cameraState.position.y - cameraState.lastOverdraw.y) > config.overdraw / 2 / game.scale || game.time - cameraState.lastOverdrawTime > 2e3) && redrawBackground() : redrawBackground()
};

Graphics.setCamera = function(e, n) {
    var r = 0,
        i = 0;
    if (cameraState.shake > .5) {
        r = Tools.rand(-cameraState.shake, cameraState.shake);
        i = Tools.rand(-cameraState.shake, cameraState.shake);
        cameraState.shake *= 1 - .06 * game.timeFactor;
    };
    var o = game.halfScreenX / game.scale,
        s = game.halfScreenY / game.scale;
    e = Tools.clamp(e, game.server.config.mapBounds.MIN_X + o, game.server.config.mapBounds.MAX_X - o);
    n = Tools.clamp(n, game.server.config.mapBounds.MIN_Y + s, game.server.config.mapBounds.MAX_Y - s);
    cameraState.position.x = r + e - game.screenX / 2 / game.scale;
    cameraState.position.y = i + n - game.screenY / 2 / game.scale;
    cameraState.center.x = r + e;
    cameraState.center.y = i + n;
};

Graphics.getCamera = function() {
    return cameraState.center
};
Graphics.getCameraState = function() {
    return cameraState;
};

Graphics.shakeCamera = function(e, n) {
    var length = Tools.length(e.x - cameraState.center.x, e.y - cameraState.center.y),
        i = (game.halfScreenX / game.scale + game.halfScreenY / game.scale) / 2,
        o = Tools.clamp(1.3 * (1 - length / i), 0, 1);
    o < .1 || (cameraState.shake = o * n)
};

Graphics.shadowCoords = function(e) {
    var t = Mobs.getClosestDoodad(e);
    return new Vector((e.x + config.shadowOffsetX * t) / config.shadowScaling,(e.y + config.shadowOffsetY * t) / config.shadowScaling)
};

Graphics.minimapMob = function(container, x, y) {
    null != container && container.position.set(game.screenX - config.minimapPaddingX - config.minimapSize * ((16384 - x) / 32768), game.screenY - config.minimapPaddingY - config.minimapSize / 2 * ((8192 - y) / 16384))
};

Graphics.toggleFullscreen = function() {
    !function() {
        var e = document;
        return e.fullscreenElement ? null !== e.fullscreenElement : e.mozFullScreenElement ? null !== e.mozFullScreenElement : e.webkitFullscreenElement ? null !== e.webkitFullscreenElement : e.msFullscreenElement ? null !== e.msFullscreenElement : void 0
    }() ? function() {
        var e = document.documentElement;
        if (e.requestFullscreen ? e.requestFullscreen() : e.mozRequestFullScreen ? e.mozRequestFullScreen() : e.webkitRequestFullscreen ? e.webkitRequestFullscreen() : e.msRequestFullscreen && e.msRequestFullscreen(),
        config.mobile && null != window.screen && null != window.screen.orientation)
            try {
                screen.orientation.lock("landscape")
            } catch (e) {}
    }() : function() {
        var e = document;
        e.exitFullscreen ? e.exitFullscreen() : e.mozCancelFullScreen ? e.mozCancelFullScreen() : e.webkitExitFullscreen ? e.webkitExitFullscreen() : e.msExitFullscreen && e.msExitFullscreen()
    }()
};

Graphics.inScreen = function(e, n) {
    return e.x >= cameraState.center.x - game.halfScreenX / game.scale - n && e.x <= cameraState.center.x + game.halfScreenX / game.scale + n && e.y >= cameraState.center.y - game.halfScreenY / game.scale - n && e.y <= cameraState.center.y + game.halfScreenY / game.scale + n
};

var redrawBackground = function() {
    Mobs.updateDoodads(),
    cameraState.lastOverdraw.x = cameraState.position.x,
    cameraState.lastOverdraw.y = cameraState.position.y,
    pixiTextureByName.renderSprite.position.set(-config.overdraw / 2, -config.overdraw / 2);
    var textureName, o = cameraState.position.x - config.overdraw / game.scale / 2, s = cameraState.position.y - config.overdraw / game.scale / 2, a = -o * game.scale, l = -s * game.scale, u = (-o - 16384) * game.scale, c = (-s - 8192) * game.scale;
    for (textureName of ["sea", "forest", "sand", "rock"])
        pixiTextureByName[textureName]?.tilePosition.set(a, l);
    for (textureName of ["sea", "sand", "rock"])
        pixiTextureByName[textureName + "_mask"]?.position.set(u, c);
    null != pixiTextureByName.polygons && null != pixiTextureByName.polygons.position && pixiTextureByName.polygons.position.set(-o * game.scale, -s * game.scale);
    null != pixiTextureByName.polygons_overlay && null != pixiTextureByName.polygons_overlay.position && pixiTextureByName.polygons_overlay.position.set(-o * game.scale, -s * game.scale);
    cameraState.lastOverdrawTime = game.time;
    renderer.render(pixiContainerByName.sea, pixiTextureByName.render);
    renderer.render(pixiContainerByName.map, pixiTextureByName.render);
};
Graphics.redrawBackground = redrawBackground;

Graphics.render = function() {
    renderer.render(pixiContainerByName.shadows, pixiTextureByName.shadows, true),
    renderer.render(pixiContainerByName.hudEnergy, pixiSpriteByName.hudTextureEnergy, true),
    renderer.render(pixiContainerByName.hudHealth, pixiSpriteByName.hudTextureHealth, true),
    renderer.render(pixiContainerByName.game)
};
