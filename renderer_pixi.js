
import Vector from './Vector.js';
import { load_assets, SHIP_ASSETS } from './assets.js';

/*
read+write
config
    minimapSize
    minimapPaddingX, minimapPaddingY
    settings.scalingFactor
    ships..
    manifest..
game
    scale
    screenX, screenY, halfScreenX, halfScreenY
    shadowX, shadowY


read only
window
    innerWidth,innerHeight
    DEVELOPMENT
config
    overdraw
    overdrawOptimize
    shadowScaling
    airmashRefugees.fontSizeMul
    settings.hidpi
    debug.X (debug)
    walls (debug)
    mobs
game
    time
    timeFactor
    gameType
    myTeam
    flagEnabled
    server.config..

-----

Players
    get()
    all()
Player instance
    reloadGraphics()
UI
    getScalingFactor()
    setupAircraft()
    modifyConfigIfMobile()
Games
    update()
Network
    STATE
    resizeHorizon()
Mobs
    setupDoodads()
    updateDoodads()
    shadowCoords()
Tools
    colorLerp
    clamp
    rand, randInt, randCircle
    length
    oscillator
    easing
    distance
MobType
GameType


 */


class AbstractRenderer {
    init() {}
    resize() {}
    apply_bounds() {}
    apply_map_assets() {}
    apply_ships_assets() {}
    updateDebug() {}
    render() {}
    visibilityHUD() {}
    updateHUD() {}
    add_minimap_mob() {}
    remove_minimap_mob() {}
    updateMinimapMob() {}
    //minimapMob() {}
    changeMinimapTeam() {}
    visibilityMinimap() {}
    inScreen() {}
    setCamera() {}
    shakeCamera() {}
    add_doodad() {}
    remove_doodad() {}
    doodad_visibility() {}
    add_mob() {}
    remove_mob() {}
    update_mob() {}
    mob_visibility() {}
    mob_alpha() {}
    despawn_mob() {}
    setTeamColourOnMissiles() {}
    add_player() {}
    remove_player() {}
    update_player() {}
    powerup() {}
    powerup_visibility() {}
    player_flag() {}
    badge() {}
    player_visibility() {}
    player_opacity() {}
    player_saybubble() {}
    setupLevelPlate() {}
    update_nameplate() {}
    update_player_debug() {}
    changeSkin() {}
    add_controlpoint() {}
    remove_controlpoint() {}
    update_controlpoint() {}
    add_progressbar() {}
    update_progressbar() {}
    remove_progressbar() {}
    add_ctf_flag() {}
    remove_ctf_flag() {}
    update_ctf_flag() {}
    popFirewall() {}
    removeFirewall() {}
    particles_count() {}
    particles_explosion() {}
    particles_missile_smoke() {}
    particles_plane_damage() {}
    particles_plane_boost() {}
    particles_spirit_shockwave() {}
    wipe_particles() {}
}

export class HeadlessRenderer extends AbstractRenderer {
    cameraState = {
        position: Vector.zero(),
        center: Vector.zero(),
    }
}

export class PIXIRenderer {
    renderer
    cameraState = {
        position: Vector.zero(),
        center: Vector.zero(),
        lastOverdraw: Vector.zero(),
        lastOverdrawTime: 0,
        shake: 0
    }
    pixiTextureByName = {}   //sprites
    pixiSpriteByName = {}    //gui
    pixiContainerByName = {} //layers
    graphics = {}
    userScalingFactor

    pixiImageByName = {}   //PIXI.Texture

    minimapMobs = {}

    particles_containers = {}

    init() {
        this.#initGameObjScreenVars(window.innerWidth, window.innerHeight);

        //setupPixiRenderer();
        {
            PIXI.utils.skipHello();
            PIXI.settings.PRECISION_FRAGMENT = PIXI.PRECISION.HIGH;
            var pixiSettings = {
                autoResize: true,
                clearBeforeRender: false,
                preserveDrawingBuffer: true
            };
            config.settings.hidpi && (pixiSettings.resolution = 2);
            this.renderer = new PIXI.WebGLRenderer(game.screenX,game.screenY,pixiSettings);
            document.body.appendChild(this.renderer.view);
        }

        this.#load_textures();

        const pixiTextureByName = this.pixiTextureByName;
        const pixiContainerByName = this.pixiContainerByName;
        const pixiSpriteByName = this.pixiSpriteByName;

        //setupPixiContainers();
        {
            for (var containerName of ["game", "ui0", "ui1", "ui2", "ui3", "ui4", "hudHealth", "hudEnergy", "flags", "doodads", "map", "sea", "objects", "groundobjects", "fields", "shadows", "powerups", "crates", "aircraft", "aircraftme", "glows", "playernames", "bubbles", "thrusters", "projectiles", "smoke", "explosions"])
                pixiContainerByName[containerName] = new PIXI.Container;
            for (var childContainerName of ["smoke", "crates", "thrusters", "projectiles", "aircraft", "aircraftme", "glows", "explosions", "powerups", "playernames", "flags", "bubbles"])
                pixiContainerByName.objects.addChild(pixiContainerByName[childContainerName]);
            for (var childContainerName of ["fields"])
                pixiContainerByName.groundobjects.addChild(pixiContainerByName[childContainerName]);
            this.graphics.layers = pixiContainerByName;
            this.graphics.gui = pixiSpriteByName;
            this.graphics.sprites = pixiTextureByName;
        }

        this.#initContainerScales();

        //initPixiTextures();
        {
            pixiTextureByName.render = PIXI.RenderTexture.create(game.screenX + config.overdraw, game.screenY + config.overdraw, void 0, config.settings.hidpi ? 2 : void 0);
            pixiTextureByName.renderSprite = new PIXI.Sprite(pixiTextureByName.render);
            pixiTextureByName.shadows = PIXI.RenderTexture.create(game.shadowX, game.shadowY, void 0, config.settings.hidpi ? 2 : void 0);
            pixiTextureByName.shadowsSprite = new PIXI.Sprite(pixiTextureByName.shadows);
            pixiTextureByName.shadowsSprite.scale.set(game.screenX / game.shadowX, game.screenY / game.shadowY);
            pixiTextureByName.shadowsSprite.blendMode = PIXI.BLEND_MODES.MULTIPLY;
            pixiTextureByName.shadowsSprite.alpha = .4;
            pixiContainerByName.game.addChild(pixiTextureByName.renderSprite);
            pixiContainerByName.game.addChild(pixiContainerByName.groundobjects);
            pixiContainerByName.game.addChild(pixiTextureByName.shadowsSprite);
            pixiTextureByName.shade = new PIXI.Sprite(this.pixiImageByName["screenshade"]);//Textures.sprite("screenshade");
            pixiTextureByName.shade.scale.set(game.shadowX / 126 / game.scale, game.shadowY / 126 / game.scale);
            pixiTextureByName.shade.alpha = .825;
            pixiTextureByName.shade.anchor.set(.5, .5);
            pixiContainerByName.shadows.addChild(pixiTextureByName.shade);
            pixiContainerByName.game.addChild(pixiContainerByName.objects);
            pixiContainerByName.game.addChild(pixiContainerByName.ui0);
            pixiContainerByName.game.addChild(pixiContainerByName.ui1);
            pixiContainerByName.game.addChild(pixiContainerByName.ui2);
            pixiContainerByName.game.addChild(pixiContainerByName.ui3);
            pixiContainerByName.game.addChild(pixiContainerByName.ui4);
            pixiSpriteByName.hudTextureEnergy = PIXI.RenderTexture.create(80, 348, void 0, config.settings.hidpi ? 2 : void 0);
            pixiSpriteByName.hudSpriteEnergy = new PIXI.Sprite(pixiSpriteByName.hudTextureEnergy);
            pixiSpriteByName.hudSpriteEnergy.pivot.set(-250, 174);
            pixiSpriteByName.hudTextureHealth = PIXI.RenderTexture.create(80, 348, void 0, config.settings.hidpi ? 2 : void 0);
            pixiSpriteByName.hudSpriteHealth = new PIXI.Sprite(pixiSpriteByName.hudTextureHealth);
            pixiSpriteByName.hudSpriteHealth.pivot.set(330, 174);
            pixiContainerByName.game.addChild(pixiSpriteByName.hudSpriteEnergy);
            pixiContainerByName.game.addChild(pixiSpriteByName.hudSpriteHealth);
        }

        this.apply_bounds(game.server.config.mapBounds);
        load_assets({...game.server.config});

        //UI.setupHUD();
        {
            this.graphics.gui.hudHealth_shadow = this.#add_sprite("hudHealth_shadow");//Textures.init("hudHealth_shadow");
            this.graphics.gui.hudHealth = this.#add_sprite("hudHealth");//Textures.init("hudHealth");
            this.graphics.gui.hudHealth_mask = this.#add_sprite("hudHealth_mask");//Textures.init("hudHealth_mask");
            this.graphics.gui.hudHealth_mask.blendMode = PIXI.BLEND_MODES.LUMINOSITY;
            this.graphics.gui.hudHealth.rotation = -1.5;
            this.graphics.gui.hudHealth.position.set(330, 174);
            this.graphics.gui.hudHealth_mask.position.set(330, 174);
            this.graphics.gui.hudEnergy_shadow = this.#add_sprite("hudEnergy_shadow");//Textures.init("hudEnergy_shadow");
            this.graphics.gui.hudEnergy = this.#add_sprite("hudEnergy");//Textures.init("hudEnergy");
            this.graphics.gui.hudEnergy_mask = this.#add_sprite("hudEnergy_mask");//Textures.init("hudEnergy_mask");
            this.graphics.gui.hudEnergy_mask.blendMode = PIXI.BLEND_MODES.LUMINOSITY;
            this.graphics.gui.hudEnergy.position.set(-250, 174);
            this.graphics.gui.hudEnergy_mask.position.set(-250, 174);
            this.#resizeHUD();
            this.visibilityHUD(false);
        }

        this.#setup_particles();
    }

    #initGameObjScreenVars(screenInnerWidth, screenInnerHeight) {
        game.screenX = screenInnerWidth,
        game.screenY = screenInnerHeight,
        game.halfScreenX = screenInnerWidth / 2,
        game.halfScreenY = screenInnerHeight / 2,
        game.shadowX = Math.floor(game.screenX / config.shadowScaling),
        game.shadowY = Math.floor(game.screenY / config.shadowScaling)
    }

    #initContainerScales () {
        game.scale = (game.screenX + game.screenY) / UI.getScalingFactor();
        this.pixiContainerByName.groundobjects.scale.set(game.scale);
        this.pixiContainerByName.objects.scale.set(game.scale);
        this.pixiContainerByName.shadows.scale.set(game.scale);
        this.pixiContainerByName.doodads.scale.set(game.scale);
        this.pixiContainerByName.bubbles.scale.set(1 / game.scale);
        UI.modifyConfigIfMobile();
    }

    #initPolygonsScale () {
        this.pixiTextureByName.polygons.scale.x = game.scale;
        this.pixiTextureByName.polygons.scale.y = game.scale;
        if (this.pixiTextureByName.polygons_overlay) {
            this.pixiTextureByName.polygons_overlay.scale.x = game.scale;
            this.pixiTextureByName.polygons_overlay.scale.y = game.scale;
        }
    }

    #initTextureScalesAndMasks() {
        var textureName;
        for (textureName of ["sea", "forest", "sand", "rock"])
            this.pixiTextureByName[textureName].tileScale.set(game.scale, game.scale);
        for (textureName of ["sea", "sand", "rock"])
            this.pixiTextureByName[textureName + "_mask"].scale.set(8 * game.scale, 8 * game.scale)
    }

    #initMapTextures({sea_mask, sand_mask, rock_mask}) {
        const {pixiContainerByName, pixiTextureByName, pixiImageByName} = this;
        if (!pixiTextureByName.sea) {
            const overdrawWidth = this.renderer.width + config.overdraw,
                overdrawHeight = this.renderer.height + config.overdraw;
            pixiTextureByName.sea = new PIXI.extras.TilingSprite(pixiImageByName["map_sea"], overdrawWidth, overdrawHeight);//Textures.tile("map_sea", overdrawWidth, overdrawHeight);
            pixiTextureByName.forest = new PIXI.extras.TilingSprite(pixiImageByName["map_forest"], overdrawWidth, overdrawHeight);//Textures.tile("map_forest", overdrawWidth, overdrawHeight);
            pixiTextureByName.sand = new PIXI.extras.TilingSprite(pixiImageByName["map_sand"], overdrawWidth, overdrawHeight);//Textures.tile("map_sand", overdrawWidth, overdrawHeight);
            pixiTextureByName.rock = new PIXI.extras.TilingSprite(pixiImageByName["map_rock"], overdrawWidth, overdrawHeight);//Textures.tile("map_rock", overdrawWidth, overdrawHeight);
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
        pixiTextureByName.sea_mask = new PIXI.Sprite(this.pixiImageByName[sea_mask]);//Textures.sprite(sea_mask);
        pixiTextureByName.sea_mask.scale.set(8, 8);
        pixiTextureByName.sea_mask.blendMode = PIXI.BLEND_MODES.MULTIPLY;
        pixiTextureByName.sea_mask.alpha = .5;
        pixiTextureByName.sand_mask = new PIXI.Sprite(this.pixiImageByName[sand_mask]);//Textures.sprite(sand_mask);
        pixiTextureByName.sand_mask.scale.set(8, 8);
        pixiTextureByName.sand.mask = pixiTextureByName.sand_mask;
        pixiTextureByName.rock_mask = new PIXI.Sprite(this.pixiImageByName[rock_mask]);//Textures.sprite(rock_mask);
        pixiTextureByName.rock_mask.scale.set(8, 8);
        pixiTextureByName.rock.mask = pixiTextureByName.rock_mask;

        pixiContainerByName.sea.addChild(pixiTextureByName.sea_mask);
        for (var textureName of ["sand_mask", "rock_mask"])
            pixiContainerByName.map.addChild(pixiTextureByName[textureName]);

        this.#initTextureScalesAndMasks();
    }

    #resizeHUD() {
        var e = 0.5 * game.scale,
            t = game.halfScreenX - 30 * game.scale,
            n = game.halfScreenX + 30 * game.scale;
        this.graphics.gui.hudHealth_shadow.scale.set(e),
        this.graphics.gui.hudEnergy_shadow.scale.set(e),
        this.graphics.gui.hudHealth_shadow.position.set(t, game.halfScreenY),
        this.graphics.gui.hudEnergy_shadow.position.set(n, game.halfScreenY),
        this.graphics.gui.hudSpriteHealth.scale.set(e),
        this.graphics.gui.hudSpriteHealth.position.set(t, game.halfScreenY),
        this.graphics.gui.hudSpriteEnergy.scale.set(e),
        this.graphics.gui.hudSpriteEnergy.position.set(n, game.halfScreenY)
    }

    resize(width, height) {
        const pixiTextureByName = this.pixiTextureByName;
        const overdrawWidth = width + config.overdraw, overdrawHeight = height + config.overdraw;
        this.#initGameObjScreenVars(width, height);
        this.#initContainerScales();
        this.renderer.resize(width, height);
        pixiTextureByName.render.resize(overdrawWidth, overdrawHeight);
        pixiTextureByName.shadows.resize(width, height);
        pixiTextureByName.shadowsSprite.scale.set(game.screenX / game.shadowX, game.screenY / game.shadowY);
        pixiTextureByName.shade.scale.set(game.shadowX / 126 / game.scale, game.shadowY / 126 / game.scale);
        for (const textureName of ["sea", "forest", "sand", "rock"]) {
            pixiTextureByName[textureName].width = overdrawWidth;
            pixiTextureByName[textureName].height = overdrawHeight;
        }
        this.#resizeMinimap();
        Games.update(true);
        this.#resizeHUD();
        this.#initTextureScalesAndMasks();
        this.#initPolygonsScale();
        this.setCamera(this.cameraState.center.x, this.cameraState.center.y);
        game.state == Network.STATE.PLAYING && Network.resizeHorizon();
    }

    apply_bounds(mapBounds) {
        console.log('apply_bounds', mapBounds);
        // update scalingFactor and resize if map bounds smaller than screen (TODO: also prevent user from increasing scalingFactor if that's the case)
        const cur_scaling_factor = UI.getScalingFactor();
        if (this.userScalingFactor) {
            config.settings.scalingFactor = this.userScalingFactor;
            game.scale = (game.screenX + game.screenY) / this.userScalingFactor;
            this.userScalingFactor = null;
        }
        let scalingFactor = UI.getScalingFactor();
        while (game.screenX > (mapBounds.MAX_X - mapBounds.MIN_X)*game.scale || game.screenY > (mapBounds.MAX_Y - mapBounds.MIN_Y)*game.scale) {
            scalingFactor -= 100;
            game.scale = (game.screenX + game.screenY) / scalingFactor;
        }
        if (scalingFactor !== cur_scaling_factor) {
            console.log('changing scalingFactor', scalingFactor);
            this.userScalingFactor = config.settings.scalingFactor;
            config.settings.scalingFactor = scalingFactor;
            this.resize(window.innerWidth, window.innerHeight);
        }

        this.#maskMinimap();
    }

    createMapFromJson(json, walls_json, doodads_json, polygons_json) {
        const {pixiContainerByName, pixiTextureByName} = this;
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
        if (this.gfx) {
            pixiContainerByName.objects.removeChild(this.gfx);
            this.gfx.destroy();
            this.gfx = null;
            this.updateDebug();
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
        this.#initPolygonsScale();
        pixiContainerByName.map.addChild(pixiTextureByName.polygons);
        pixiContainerByName.map.mask = pixiTextureByName.polygons;

        this.cameraState.lastOverdrawTime = -2e3;
    }

    apply_map_assets(parentMapId, mapId, mapVersion, map_assets) {
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
                this.createMapFromJson(json, walls_json, doodads_json, polygons_json);
            }
            config.manifest.mapVersion[0] = mapVersion[0];
        }

        let textures = {};
        if (sea_mask_uri && check(4)) {
            if (asset_has_changed(4)) {
                console.log('apply_map_assets sea_mask');
                // alternative to ${mapVersion[4]||''}: call Textures.delete
                this.#add_texture(`${mapId}_map_sea_mask${mapVersion[4]||''}`, sea_mask_uri);
                textures['sea_mask'] = `${mapId}_map_sea_mask${mapVersion[4]||''}`;
            } else {
                textures['sea_mask'] = `${parentMapId}_map_sea_mask${mapVersion[4]||''}`;
            }
            config.manifest.mapVersion[4] = mapVersion[4];
        }
        if (sand_mask_uri && check(5)) {
            if (asset_has_changed(5)) {
                console.log('apply_map_assets sand_mask');
                this.#add_texture(`${mapId}_map_sand_mask${mapVersion[5]||''}`, sand_mask_uri);
                textures['sand_mask'] = `${mapId}_map_sand_mask${mapVersion[5]||''}`;
            } else {
                textures['sand_mask'] = `${parentMapId}_map_sand_mask${mapVersion[5]||''}`;
            }
            config.manifest.mapVersion[5] = mapVersion[5];
        }
        if (rock_mask_uri && check(6)) {
            if (asset_has_changed(6)) {
                console.log('apply_map_assets rock_mask');
                this.#add_texture(`${mapId}_map_rock_mask${mapVersion[6]||''}`, rock_mask_uri);
                textures['rock_mask'] = `${mapId}_map_rock_mask${mapVersion[6]||''}`;
            } else {
                textures['rock_mask'] = `${parentMapId}_map_rock_mask${mapVersion[6]||''}`;
            }
            config.manifest.mapVersion[6] = mapVersion[6];
        }

        this.#initMapTextures(textures);

        if (gui_uri && check(7)) {
            if (asset_has_changed(7)) {
                console.log('apply_map_assets gui');
                this.#delete_texture("gui");
                this.#delete_texture("ui_minimap");
                this.#add_texture('gui', gui_uri);
                this.#setupMinimap();
            }
            config.manifest.mapVersion[7] = mapVersion[7];
        }

        this.#maskMinimap();
        this.cameraState.lastOverdrawTime = -2e3;
        config.manifest.mapId = mapId;
        config.manifest.parentMapId = parentMapId;

        if (json)
            return json;
    }

    apply_ships_assets(mapId, ships, assets) {
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
                this.#delete_texture(config.ships[id].name);
                this.#add_texture(config.ships[id].name, ship_datauri, 'aircraft', config.ships[id].graphics.frame);
                config.manifest.ships[id][1] = ships[id][1];
            }
            if (checks[2]) {
                this.#delete_texture(config.ships[id].name+'_shadow');
                this.#add_texture(config.ships[id].name+'_shadow', ship_shadow_datauri, 'shadows', config.ships[id].graphics.frame_shadow);
                config.manifest.ships[id][2] = ships[id][2];
            }

            if (ships[id])
                this.#add_ship_template(config.ships[id].name, config.ships[id].name, config.ships[id].graphics.anchor);
        }
        Object.values(Players.all()).forEach(player=>player.reloadGraphics());
        UI.setupAircraft();
    }

    updateDebug() {
        if (!window.DEVELOPMENT) return;
        const {pixiTextureByName, pixiContainerByName} = this;
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
    }

    #update() {
        const {pixiTextureByName, cameraState, pixiContainerByName, pixiSpriteByName} = this;
        pixiTextureByName.shade.position.set(cameraState.center.x / config.shadowScaling, cameraState.center.y / config.shadowScaling),
        pixiTextureByName.renderSprite.position.set(game.scale * (-cameraState.position.x + cameraState.lastOverdraw.x) - config.overdraw / 2, game.scale * (-cameraState.position.y + cameraState.lastOverdraw.y) - config.overdraw / 2),
        pixiContainerByName.objects.position.set(-cameraState.position.x * game.scale, -cameraState.position.y * game.scale),
        pixiContainerByName.groundobjects.position.set(-cameraState.position.x * game.scale, -cameraState.position.y * game.scale),
        pixiContainerByName.doodads.position.set(-cameraState.position.x * game.scale + config.overdraw / 2, -cameraState.position.y * game.scale + config.overdraw / 2),
        pixiContainerByName.shadows.position.set(-cameraState.position.x * (game.scale / config.shadowScaling), -cameraState.position.y * (game.scale / config.shadowScaling)),
        pixiSpriteByName.minimap_box?.position.set(game.screenX - config.minimapPaddingX - config.minimapSize * ((16384 - cameraState.center.x) / 32768), game.screenY - config.minimapPaddingY - config.minimapSize / 2 * ((8192 - cameraState.center.y) / 16384)),
        config.overdrawOptimize ? (Math.abs(cameraState.position.x - cameraState.lastOverdraw.x) > config.overdraw / 2 / game.scale || Math.abs(cameraState.position.y - cameraState.lastOverdraw.y) > config.overdraw / 2 / game.scale || game.time - cameraState.lastOverdrawTime > 2e3) && this.redrawBackground() : this.redrawBackground();
    }

    redrawBackground() {
        const {cameraState, pixiContainerByName, pixiTextureByName} = this;
        //Mobs.updateDoodads(),
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
        this.renderer.render(pixiContainerByName.sea, pixiTextureByName.render);
        this.renderer.render(pixiContainerByName.map, pixiTextureByName.render);
    }

    render() {
        const {pixiContainerByName, pixiTextureByName, pixiSpriteByName} = this;
        this.#update_particles();
        this.#update();
        this.renderer.render(pixiContainerByName.shadows, pixiTextureByName.shadows, true);
        this.renderer.render(pixiContainerByName.hudEnergy, pixiSpriteByName.hudTextureEnergy, true);
        this.renderer.render(pixiContainerByName.hudHealth, pixiSpriteByName.hudTextureHealth, true);
        this.renderer.render(pixiContainerByName.game);
    }

    visibilityHUD(e) {
        this.graphics.gui.hudHealth_shadow.visible = e,
        this.graphics.gui.hudHealth.visible = e,
        this.graphics.gui.hudEnergy_shadow.visible = e,
        this.graphics.gui.hudEnergy.visible = e
    }

    updateHUD(e, t, n) {
        if (n && !config.ships[n.type]) return;
        e = Tools.clamp(e, 0, 1),
        t = Tools.clamp(t, 0, 1),
        this.graphics.gui.hudHealth.rotation = -1.1 * (1 - e),
        this.graphics.gui.hudEnergy.rotation = Math.PI + 1.1 * (1 - t),
        this.graphics.gui.hudHealth.tint = e > .5 ? Tools.colorLerp(13487404, 2591785, 2 * (e - .5)) : Tools.colorLerp(12201261, 13487404, 2 * e);
        var r = 3374821;
        n && (r = t < config.ships[n.type].energyLight ? 2841755 : 3374821),
        this.graphics.gui.hudEnergy.tint = r
    }

    #load_textures() {
        const pixiImageByName = this.pixiImageByName;
        for(let name in imageUrlByName) {
            if (!pixiImageByName[name]) {
                //console.log("Loading texture: " + name, imageUrlByName[name]);
                pixiImageByName[name] = new PIXI.Texture.fromImage(imageUrlByName[name]);
            }
        }
        for(let name in spriteByName) {
            if (!pixiImageByName[name]) {
                //console.log("Loading texture (1): " + name, spriteByName[name]);
                let sprite = spriteByName[name];
                pixiImageByName[name] = new PIXI.Texture(pixiImageByName[sprite[0]].baseTexture, new PIXI.Rectangle(sprite[1][0], sprite[1][1], sprite[1][2], sprite[1][3]));
            }
        }
        for(let name in flagByName) {
            if (!pixiImageByName[name]) {
                let sprite = flagByName[name];
                pixiImageByName[name] = new PIXI.Texture(pixiImageByName[sprite[0]].baseTexture, new PIXI.Rectangle(sprite[1][0], sprite[1][1], sprite[1][2], sprite[1][3]))
            }
        }
    }

    #add_sprite(textureName, propOverrides) {
        const cloned = JSON.parse(JSON.stringify(textureByName[textureName]));
        if("screencenter" === cloned.position && (cloned.position = [game.halfScreenX, game.halfScreenY]),
            propOverrides)
            for(var i in propOverrides)
                cloned[i] = propOverrides[i];
        return this.#_add_sprite(cloned.texture, this.graphics.layers[cloned.layer], cloned)
    }

    #_add_sprite(name, container, properties) {
        var sprite = new PIXI.Sprite(this.pixiImageByName[name]);//Textures.sprite(name);
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
    }

    #add_texture(name, url, base_texture, frame) {
        if (base_texture && frame)
            spriteByName[name] = [base_texture, frame];
        else
            imageUrlByName[name] = url;
        this.#load_textures();
    }

    #add_ship_template(name, texture_name, anchor) {
        textureByName[`ship_${name}`] = {
            texture: texture_name,
            layer: "aircraft",
            anchor
        };

        textureByName[`ship_shadow_${name}`] = {
            texture: `${texture_name}_shadow`,
            layer: "shadows",
            anchor
        };
    }

    #delete_texture(name) {
        delete imageUrlByName[name];
        delete this.pixiImageByName[name];
    }

    #transform(container, xPos, yPos, rot, xScale, yScale, alpha) {
        if (!container) return;
        container.position.set(xPos, yPos),
        null != yScale ? container.scale.set(xScale, yScale) : null != xScale && container.scale.set(xScale),
        null != rot && (container.rotation = rot),
        null != alpha && (container.alpha = alpha)
    }

    add_minimap_mob(minimapMobs, mobTextureName) {
        this.minimapMobs = minimapMobs;
        return this.#add_sprite(mobTextureName);//Textures.init(mobTextureName)
    }

    remove_minimap_mob(minimapMob) {
        this.graphics.layers.ui1.removeChild(minimapMob.sprite);
        minimapMob.sprite.destroy();
    }

    // updateMinimapMob(minimapMob) {
    //     minimapMob.sprite.position.set(game.screenX - config.minimapPaddingX - config.minimapSize * ((16384 - minimapMob.x) / 32768), game.screenY - config.minimapPaddingY - config.minimapSize / 2 * ((8192 - minimapMob.y) / 16384));
    // }

    updateMinimapMob(container, x, y) {
        null != container?.position && container.position.set(game.screenX - config.minimapPaddingX - config.minimapSize * ((16384 - x) / 32768), game.screenY - config.minimapPaddingY - config.minimapSize / 2 * ((8192 - y) / 16384))
    }

    changeMinimapTeam(minimapMob, team) {
        if (null != minimapMob && null != minimapMob.sprite) {
            var r = 1 == team ? "minimapBlue" : "minimapMob";
            minimapMob.sprite.texture = this.pixiImageByName[textureByName[r].texture];//Textures.getNamed(r)
        }
    }

    #setupMinimap() {
        const graphics = this.graphics;
        if (graphics.gui.minimap) {
            if (graphics.gui.minimap.mask) {
                graphics.gui.minimap.removeChild(graphics.gui.minimap.mask);
                graphics.gui.minimap.mask.destroy();
            }
            graphics.layers["ui0"].removeChild(graphics.gui.minimap);
            graphics.gui.minimap.destroy();
        }
        graphics.gui.minimap = this.#add_sprite("minimap");
        if (!graphics.gui.minimap_box)
            graphics.gui.minimap_box = this.#add_sprite("minimapBox");
        this.#resizeMinimap();
        this.visibilityMinimap(game.state === Network.STATE.PLAYING);
    };

    visibilityMinimap(isVisible) {
        this.graphics.gui.minimap.visible = isVisible;
        this.graphics.gui.minimap_box.visible = isVisible;
    };

    #resizeMinimap() {
        this.graphics.gui.minimap.scale.set(config.minimapSize / 512);
        this.graphics.gui.minimap.position.set(game.screenX - config.minimapPaddingX, game.screenY - config.minimapPaddingY);
        this.graphics.gui.minimap_box.scale.set(.03 + 2 * config.minimapSize * (game.screenX / game.scale / 32768) / 64, .03 + config.minimapSize * (game.screenY / game.scale / 16384) / 64);
        for (const playerId in this.minimapMobs)
            this.updateMinimapMob(this.minimapMobs[playerId]);
    };

    #maskMinimap() {
        if (!this.graphics.gui.minimap)
            return;

        // mask
        if (this.graphics.gui.minimap.mask) {
            this.graphics.gui.minimap.removeChild(this.graphics.gui.minimap.mask);
            this.graphics.gui.minimap.mask.destroy();
        }
        const w = 512, h = 256; // minimap texture size: 512x256
        const half_w = w/2, half_h = h/2;
        const bounds = game.server.config.mapBounds;
        const new_x = (bounds.MIN_X/ 16384)*half_w - half_w; //coords from -512 to 0
        const new_y = (bounds.MIN_Y/ 8192)*half_h - half_h;  //coords from -256 to 0
        const new_w = ((bounds.MAX_X - bounds.MIN_X)/32768)*w; 
        const new_h = ((bounds.MAX_Y - bounds.MIN_Y)/16384)*h;
        const mask = new PIXI.Graphics();
        mask.beginFill(0xFFFFFF);
        mask.drawRect(new_x, new_y, new_w, new_h);
        mask.endFill();
        this.graphics.gui.minimap.mask = mask;
        this.graphics.gui.minimap.addChild(mask);

        // zoom in
        const f = 512/240;//2.1333; // todo: remove hardcoded 240
        const zoom = Math.min(4, Math.min(w/new_w, h/new_h));
        config.minimapSize = 240 * zoom;

        // translate to the center of the bottom right rect(240*120)
        const new_center_w = ((w+new_x)+new_w/2)*zoom;
        const new_center_h = ((h+new_y)+new_h/2)*zoom;
        const old_center_w = w*zoom - half_w;
        const old_center_h = h*zoom - half_h;
        config.minimapPaddingX = 16 + (new_center_w - old_center_w)/f;
        config.minimapPaddingY = 16 + (new_center_h - old_center_h)/f;

        this.#resizeMinimap();
    }

    inScreen(e, n) {
        const {cameraState} = this;
        return e.x >= cameraState.center.x - game.halfScreenX / game.scale - n && e.x <= cameraState.center.x + game.halfScreenX / game.scale + n && e.y >= cameraState.center.y - game.halfScreenY / game.scale - n && e.y <= cameraState.center.y + game.halfScreenY / game.scale + n
    }

    setCamera(e, n) {
        const cameraState = this.cameraState;
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
    }

    shakeCamera(e, n) {
        const cameraState = this.cameraState;
        var length = Tools.length(e.x - cameraState.center.x, e.y - cameraState.center.y),
            i = (game.halfScreenX / game.scale + game.halfScreenY / game.scale) / 2,
            o = Tools.clamp(1.3 * (1 - length / i), 0, 1);
        o < .1 || (cameraState.shake = o * n)
    }

    add_doodad(doodad) {
        const texture = this.#add_sprite((Number.isInteger(doodad[2]) ? "mountain" : "") + doodad[2]);
        texture.scale.set(doodad[3]);
        texture.position.set(doodad[0], doodad[1]);
        texture.visible = doodad[7];
        if(doodad[4]) {
            texture.rotation = doodad[4];
        }
        if(doodad[5]) {
            texture.alpha = doodad[5];
        }
        if(doodad[6]) {
            texture.tint = doodad[6];
        }
        return texture;
    }

    remove_doodad(doodad) {
        const sprite = doodad[8];
        this.graphics.layers.doodads.removeChild(sprite);
        sprite.destroy();
    }

    doodad_visibility(doodad, visible) {
        doodad[8].visible = visible;
    }

    add_mob(mob) {
        const {type, sprites, state} = mob;
        if(MissileMobTypeSet[type]) {
            sprites.thrusterGlow = this.#add_sprite("thrusterGlowSmall", {
                layer: "projectiles"
            });
            sprites.smokeGlow = this.#add_sprite("smokeGlow", {
                layer: "projectiles"
            });
            sprites.thruster = this.#add_sprite("missileThruster");
        }

        switch (type) {
        case MobType.PredatorMissile:
        case MobType.TornadoSingleMissile:
        case MobType.TornadoTripleMissile:
        case MobType.ProwlerMissile:
            sprites.sprite = this.#add_sprite("missile"),
            sprites.shadow = this.#add_sprite("missileShadow", {
                scale: [.25, .2]
            }),
            sprites.thrusterGlow.scale.set(3, 2),
            sprites.thrusterGlow.alpha = .2,
            sprites.smokeGlow.scale.set(1.5, 3),
            sprites.smokeGlow.alpha = .75;
            break;
        case MobType.GoliathMissile:
        case MobType.CarrotMissile:
            if(type == MobType.GoliathMissile) {
                sprites.sprite = this.#add_sprite("missileFat");
            } else {
                sprites.sprite = this.#add_sprite("missileCarrot");
            }

            sprites.shadow = this.#add_sprite("missileShadow", {
                scale: [.5, .25]
            });
            sprites.thrusterGlow.scale.set(4, 3);
            sprites.thrusterGlow.alpha = .25;
            sprites.smokeGlow.scale.set(2.5, 3);
            sprites.smokeGlow.alpha = .75;
            break;
        case MobType.MohawkMissile:
            sprites.sprite = this.#add_sprite("missileSmall", {
                scale: [.28, .2]
            }),
            sprites.shadow = this.#add_sprite("missileShadow", {
                scale: [.18, .14]
            }),
            sprites.thrusterGlow.scale.set(3, 2),
            sprites.thrusterGlow.alpha = .2,
            sprites.smokeGlow.scale.set(1, 2),
            sprites.smokeGlow.alpha = .75;
            break;
        case MobType.Upgrade:
        case MobType.Shield:
        case MobType.Inferno:
        case MobType.MagicCrate:
            var textureName = CrateTextureNameByMobType[type];
            // state.baseScale = .33;
            // state.baseScaleShadow = 2.4 / config.shadowScaling * .33;
            sprites.sprite = this.#add_sprite(textureName, {
                scale: state.baseScale
            });
            sprites.shadow = this.#add_sprite("crateShadow", {
                scale: state.baseScaleShadow
            });
        }

        this.setTeamColourOnMissiles(mob);
    }

    remove_mob(mob) {
        const {type, sprites} = mob;
        switch (type) {
        case MobType.PredatorMissile:
        case MobType.GoliathMissile:
        case MobType.CarrotMissile:
        case MobType.MohawkMissile:
        case MobType.TornadoSingleMissile:
        case MobType.TornadoTripleMissile:
        case MobType.ProwlerMissile:
            this.graphics.layers.projectiles.removeChild(sprites.sprite),
            this.graphics.layers.shadows.removeChild(sprites.shadow),
            this.graphics.layers.thrusters.removeChild(sprites.thruster),
            this.graphics.layers.projectiles.removeChild(sprites.thrusterGlow),
            this.graphics.layers.projectiles.removeChild(sprites.smokeGlow),
            sprites.sprite.destroy(),
            sprites.shadow.destroy(),
            sprites.thruster.destroy(),
            sprites.thrusterGlow.destroy(),
            sprites.smokeGlow.destroy();
            break;
        case MobType.Upgrade:
        case MobType.Shield:
        case MobType.Inferno:
        case MobType.MagicCrate:
            this.graphics.layers.crates.removeChild(sprites.sprite),
            this.graphics.layers.shadows.removeChild(sprites.shadow)
        }
    }

    update_mob(mob) {
        const {type, sprites, pos, randomness, spriteRot, exhaust, state} = mob;
        var mobConfig = config.mobs[type];

        switch (type) {
        case MobType.PredatorMissile:
        case MobType.GoliathMissile:
        case MobType.CarrotMissile:
        case MobType.MohawkMissile:
        case MobType.TornadoSingleMissile:
        case MobType.TornadoTripleMissile:
        case MobType.ProwlerMissile:
            var t = Mobs.shadowCoords(pos),
                n = Tools.oscillator(.1, .5, randomness),
                r = Tools.oscillator(.15, 10, randomness);
            this.#transform(
                sprites.sprite,
                pos.x,
                pos.y,
                spriteRot
            );
            this.#transform(
                sprites.shadow,
                t.x,
                t.y,
                spriteRot
            );
            this.#transform(
                sprites.thrusterGlow,
                pos.x + Math.sin(-spriteRot) * (exhaust + 20),
                pos.y + Math.cos(-spriteRot) * (exhaust + 20),
                null,
                null,
                null,
                (((mobConfig.thrusterGlowAlpha || 1.0) * .5)
                    * state.luminosity + .2) * r
            );
            this.#transform(
                sprites.smokeGlow,
                pos.x + Math.sin(-spriteRot) * (exhaust + 20),
                pos.y + Math.cos(-spriteRot) * (exhaust + 20),
                spriteRot,
                undefined,
                undefined,
                mobConfig.smokeGlowAlpha
            );
            this.#transform(
                sprites.thruster,
                pos.x + Math.sin(-spriteRot) * exhaust,
                pos.y + Math.cos(-spriteRot) * exhaust,
                spriteRot,
                mobConfig.thruster[0] * n,
                mobConfig.thruster[1] * n,
                mobConfig.thrusterAlpha
            );
            break;
        case MobType.Upgrade:
        case MobType.Shield:
        case MobType.Inferno:
        case MobType.MagicCrate:
            var i;
            t = Mobs.shadowCoords(pos);
            i = 0 == state.despawnType ? 1 - state.despawnTicker : 1 + 2 * state.despawnTicker,
            i *= Tools.oscillator(.08, 500, randomness),
            this.#transform(sprites.sprite, pos.x, pos.y + 20 * (Tools.oscillator(.08, 330, randomness) - 1.04), null, state.baseScale * i, state.baseScale * i, 1 - state.despawnTicker),
            this.#transform(sprites.shadow, t.x, t.y, null, state.baseScaleShadow * i, state.baseScaleShadow * i, 1 - state.despawnTicker)
        }
    }

    mob_visibility(mob, isVisible) {
        const {sprites, type} = mob;
        sprites.sprite.visible = isVisible;
        sprites.shadow.visible = isVisible;
        if(MissileMobTypeSet[type]) {
            sprites.thruster.visible = isVisible;
            sprites.thrusterGlow.visible = isVisible;
        }
    }

    mob_alpha(mob, n) {
        mob.sprites.sprite.alpha = n;
        mob.sprites.shadow.alpha = n;
    }

    despawn_mob(mob) {
        const {sprites} = mob;
        sprites.thruster.renderable = false,
        sprites.thrusterGlow.renderable = false,
        sprites.smokeGlow.renderable = false;
    }

    setTeamColourOnMissiles(mob) {
        const {type, ownerId, sprites} = mob;
        if (game.gameType == GameType.CTF || game.server.config.tdmMode || GameType.CONQUEST == game.gameType) {
            switch (type) {
                case MobType.PredatorMissile:
                case MobType.TornadoSingleMissile:
                case MobType.TornadoTripleMissile:
                case MobType.ProwlerMissile:
                case MobType.GoliathMissile:
                case MobType.MohawkMissile:
                    let team = Players.getMe().team == 1 ? 2 : 1;

                    if (ownerId) {
                        let owner = Players.get(ownerId);
                        if (owner) {
                            team = owner.team;
                        }
                    }

                    sprites.smokeGlow.tint = 
                    sprites.sprite.tint = 
                    sprites.thruster.tint = (team == 1 ? 0x3232FA : 0xEA4242);

                    break;
            }
        } else if (game.gameType == GameType.FFA) {
            switch (type) {
                case MobType.PredatorMissile:
                case MobType.TornadoSingleMissile:
                case MobType.TornadoTripleMissile:
                case MobType.ProwlerMissile:
                case MobType.GoliathMissile:
                case MobType.MohawkMissile:
                    if (ownerId) {
                        let owner = Players.get(ownerId);
                        if (owner && owner.in_my_team) {
                            sprites.smokeGlow.tint = 
                            sprites.sprite.tint = 
                            sprites.thruster.tint = 0x3232FA;
                        }
                    }
                    break;
            }
        }
    }

    add_player(player, isPlaneTypeChange) {
        const {type, sprites, reel, flag, name:playerName, level, bot} = player;
        if (!config.ships[type]) return;
        var propOverrides = null;
        if(player.me()) {
            propOverrides = {
                layer: "aircraftme"
            };
        }
        sprites.powerup = this.#add_sprite("powerupShield", {
            visible: false,
            alpha: .75
        });
        sprites.powerupCircle = this.#add_sprite("powerupCircle", {
            visible: false,
            alpha: .75
        });

        const {name, graphics:{baseScale, thrusters, rotors}} = config.ships[type];
        sprites.sprite = this.#add_sprite(`ship_${name}`, propOverrides);
        if (player.skin)
            this.changeSkin(player, player.skin.url, player.skin.hash);
        sprites.shadow = this.#add_sprite(`ship_shadow_${name}`, {
            scale: baseScale * (2.4 / config.shadowScaling)
        });
        for (let i=0; i<thrusters.length; i++) {
            sprites[`thruster${i}`] = this.#add_sprite("shipRaptorThruster");
            sprites[`thruster${i}Glow`] = this.#add_sprite("thrusterGlowSmall");
            sprites[`thruster${i}Shadow`] = this.#add_sprite("thrusterShadow");
        }
        for (let i=0; i<rotors.length; i++) {
            sprites[`rotor${i}`] = this.#add_sprite("shipComancheRotor", propOverrides);
            sprites[`rotor${i}Shadow`] = this.#add_sprite("shipComancheRotorShadow", {
                scale: 2 * baseScale * (2.4 / config.shadowScaling)
            });
        }

        if(! (reel || isPlaneTypeChange)) {
            //this.setupNameplate();
            var e = "";
            2 == game.gameType && (e = "  ■"),
            sprites.name = new PIXI.Text(playerName + e,this.#nameplateTextStyle(player)),
            sprites.name.scale.set(.5, .5),
            sprites.flag = new PIXI.Sprite(this.pixiImageByName["flag_" + flag]);//Textures.sprite("flag_" + player.flag),
            sprites.flag.scale.set(.4, .4),
            sprites.flag.anchor.set(.5, .5),
            sprites.badge = new PIXI.Sprite(this.pixiImageByName["badge_gold"]);//Textures.sprite("badge_gold"),
            sprites.badge.scale.set(.3),
            sprites.badge.visible = false,
            this.graphics.layers.playernames.addChild(sprites.badge),
            this.graphics.layers.playernames.addChild(sprites.flag),
            this.graphics.layers.playernames.addChild(sprites.name);

            //this.setupChatBubbles();
            sprites.bubble = new PIXI.Container;
            sprites.bubbleLeft = /*Graphics.initSprite*/this.#_add_sprite("chatbubbleleft", sprites.bubble, {
                scale: .5
            });
            sprites.bubbleRight = this.#_add_sprite("chatbubbleright", sprites.bubble, {
                scale: .5
            });
            sprites.bubbleCenter = this.#_add_sprite("chatbubblecenter", sprites.bubble, {
                scale: .5
            });
            sprites.bubblePoint = this.#_add_sprite("chatbubblepoint", sprites.bubble, {
                scale: .5
            });
            sprites.emote = this.#_add_sprite("emote_tf", sprites.bubble, {
                scale: .6,
                anchor: [.5, .5]
            });
            sprites.bubbleText = new PIXI.Text("a",{
                fontFamily: "MontserratWeb, Helvetica, sans-serif",
                fontSize: (12 * config.airmashRefugees.fontSizeMul) + "px",
                fill: "white"
            });
            sprites.bubble.addChild(sprites.bubbleText);
            sprites.bubble.visible = false;
            sprites.bubble.pivot.set(.5, 34);
            this.graphics.layers.bubbles.addChild(sprites.bubble);

            if(level != null || bot) {
                this.setupLevelPlate(player);
            }
        }
        this.update_player_debug(player);
    }

    remove_player(player, maybeFullDestroy) {
        const {sprites, col, reel} = player;
        if (!sprites.sprite) return;

        var layer = player.me() ? this.graphics.layers.aircraftme : this.graphics.layers.aircraft;

        if (window.DEVELOPMENT && col) {
            this.graphics.layers.explosions.removeChild(col);
            col.destroy();
            player.col = null;
        }

        layer.removeChild(sprites.sprite);
        this.graphics.layers.shadows.removeChild(sprites.shadow);
        sprites.sprite.destroy();
        sprites.shadow.destroy();
        sprites.powerup.destroy();
        sprites.powerupCircle.destroy();

        for (let i=0; i<Infinity; i++) {
            if (!sprites[`thruster${i}`]) break;
            this.graphics.layers.thrusters.removeChild(sprites[`thruster${i}`]);
            this.graphics.layers.thrusters.removeChild(sprites[`thruster${i}Glow`]);
            this.graphics.layers.shadows.removeChild(sprites[`thruster${i}Shadow`]);
            sprites[`thruster${i}`]?.destroy();
            sprites[`thruster${i}Glow`]?.destroy();
            sprites[`thruster${i}Shadow`]?.destroy();
        }
        for (let i=0; i<Infinity; i++) {
            if (!sprites[`rotor${i}`]) break;
            layer.removeChild(sprites[`rotor${i}`]);
            sprites[`rotor${i}`]?.destroy();
            this.graphics.layers.shadows.removeChild(sprites[`rotor${i}Shadow`]);
            sprites[`rotor${i}Shadow`]?.destroy();
        }

        if(maybeFullDestroy && !reel) {
            this.graphics.layers.playernames.removeChild(sprites.badge, sprites.name, sprites.flag);
            if(null != sprites.level) {
                this.graphics.layers.playernames.removeChild(sprites.level, sprites.levelBorder);
                sprites.level.destroy();
                sprites.levelBorder.destroy();
            }
            this.graphics.layers.bubbles.removeChild(sprites.bubble);
            sprites.badge.destroy();
            sprites.name.destroy();
            sprites.flag.destroy();
            sprites.bubble.destroy({
                children: true
            });
        }
    }

    update_player(player) {
        if (!player.sprites.sprite) return;
        const {type, alpha, powerupActive, randomness, pos, scale, rot, state, sprites, col, reel, bot, render} = player;
        const {graphics:{baseScale, nameplateDist=60, thrusters, rotors}, special} = config.ships[type];

        var t = Tools.oscillator(0.025, 1e3, randomness) * scale,
            n = 1.5 * state.thrustLevel,
            r = rot,
            shadow_pos = Mobs.shadowCoords(pos);
        if (this.#transform(sprites.sprite, pos.x, pos.y, r, t * baseScale, t * baseScale),
        this.#transform(sprites.shadow, shadow_pos.x, shadow_pos.y, r, baseScale * (2.4 / config.shadowScaling) * scale, baseScale * (2.4 / config.shadowScaling) * scale),
        powerupActive) {
            var o = .35 * (0 == state.powerupFadeState ? 2 * (1 - state.powerupFade) + 1 : 1 - state.powerupFade) * Tools.oscillator(.075, 100, randomness),
                s = .75 * (0 == state.powerupFadeState ? Tools.clamp(2 * state.powerupFade, 0, 1) : Tools.clamp(1 - 1.3 * state.powerupFade, 0, 1)) * alpha;
            this.#transform(sprites.powerup, pos.x, pos.y - 80, 0, o, o, s),
            this.#transform(sprites.powerupCircle, pos.x, pos.y - 80, state.powerupAngle, 1.35 * o, 1.35 * o, s)
        }
        var a = Tools.oscillator(.1, .5, randomness),
            l = Math.abs(state.thrustLevel) < .01 ? 0 : state.thrustLevel / 2 + (state.thrustLevel > 0 ? .5 : -.5),
            u = Tools.clamp(2 * Math.abs(state.thrustLevel) - .1, 0, 1);

        //if (config.ships[this.type]) {  is always true if this.sprites.sprite
        {
            //const {graphics:{thrusters, rotors}, special} = config.ships[type];
            thrusters.length > 1 && state.thrustLevel < 0 && (a *= .7);
            for (let i=0; i<thrusters.length; i++) {
                const {pos_angle, pos_radius, rot_factor, scale_x, scale_y, glow_pos_angle1, glow_pos_angle2, glow_pos_radius, glow_scale_x, glow_scale_y, glow_alpha_factor} = thrusters[i];
                const params = [pos_angle, pos_radius, rot_factor, scale_x, scale_y, glow_pos_angle1, glow_pos_angle2, glow_pos_radius, glow_scale_x, glow_scale_y, glow_alpha_factor];
                this.#transform(sprites[`thruster${i}`], 
                    pos.x + Math.sin(-r - params[0]) * (params[1] * t), 
                    pos.y + Math.cos(-r - params[0]) * (params[1] * t), 
                    r + params[2] * (state.thrustLevel > 0 ? state.thrustDir : 0), 
                    params[3] * a * l * scale, 
                    params[4] * a * l * scale, 
                    u * (special===5?alpha:1));
                this.#transform(sprites[`thruster${i}Shadow`],
                    shadow_pos.x + Math.sin(-r - params[0]) * (params[1] * t) / config.shadowScaling, 
                    shadow_pos.y + Math.cos(-r - params[0]) * (params[1] * t) / config.shadowScaling, 
                    r + params[2] * (state.thrustLevel > 0 ? state.thrustDir : 0), 
                    (params[3]+0.1) * a * l * scale * (4 / config.shadowScaling), 
                    params[4] * a * l * scale * (4 / config.shadowScaling), 
                    u * (special===5?alpha:1) / 2.5);
                this.#transform(sprites[`thruster${i}Glow`], 
                    pos.x + Math.sin(-r + params[5] - params[6] * state.thrustDir) * (params[7] * t), 
                    pos.y + Math.cos(-r + params[5] - params[6] * state.thrustDir) * (params[7] * t), 
                    null, 
                    params[8] * n * scale, 
                    params[9] * n * scale, 
                    params[10] * state.thrustLevel * (special===5?alpha:1));
            }

            for (let i=0; i<rotors.length; i++) {
                const {scale, alpha, shadow_scale} = rotors[i];
                const params = [scale, alpha, shadow_scale];
                this.#transform(sprites[`rotor${i}`], 
                    pos.x, 
                    pos.y, 
                    state.rotorDir, 
                    t * baseScale * params[0], 
                    t * baseScale * params[0], 
                    params[1]);
                this.#transform(sprites[`rotor${i}Shadow`], 
                    shadow_pos.x, 
                    shadow_pos.y, 
                    state.rotorDir, 
                    baseScale * (params[2] / config.shadowScaling) * scale * params[0], 
                    baseScale * (params[2] / config.shadowScaling) * scale * params[0]);
            }
        }

        //this.updateNameplate(),
        if (!reel) {
            let nameFlagHalfWidth = (sprites.name.width + sprites.flag.width + 10) / 2;
            let nameplateX = pos.x - nameFlagHalfWidth + (state.hasBadge ? 12 : 0) - (sprites.level ? sprites.level.width / 2 + 8 : 0);
            let nameplateY = pos.y + nameplateDist * scale;
            sprites.flag.position.set(nameplateX + 15, nameplateY + 10);
            sprites.name.position.set(nameplateX + 40, nameplateY);
            if (sprites.level) {
                sprites.level.position.set(nameplateX + 2 * nameFlagHalfWidth + 13, nameplateY + (bot ? 3 : 2));
                sprites.levelBorder.position.set(nameplateX + 2 * nameFlagHalfWidth + 7.75, nameplateY - 0.5);
            }
            if (state.hasBadge) {
                sprites.badge.position.set(nameplateX - 28, nameplateY);
            }
        }

        //state.bubble && this.updateBubble();
        if (state.bubble) {
            sprites.bubble.visible = render;
            // state.bubbleProgress += .015 * game.timeFactor;
            // state.bubbleProgress >= 1 && (state.bubbleProgress = 1);
            if (game.time - state.bubbleTime > 4e3) { 
                // state.bubbleFade += .08 * game.timeFactor
                // state.bubbleFade >= 1 && (state.bubbleFade = 1);
                sprites.bubble.scale.set(1 + .2 * state.bubbleFade);
                sprites.bubble.alpha = 1 * (1 - state.bubbleFade);
                state.bubbleFade >= 1 && (/*state.bubble = false, */sprites.bubble.visible = false)
            } else {
                sprites.bubble.scale.set(Tools.easing.outElastic(state.bubbleProgress, .5)),
                sprites.bubble.alpha = 1
            }
            var e = (state.bubbleTextWidth + game.screenX) % 2 == 0 ? .5 : 0,
                t = game.screenY % 2 == 0 ? 0 : .5,
                n = nameplateDist * scale;
            powerupActive && (n += 60),
            sprites.bubble.position.set(pos.x * game.scale + e, (pos.y - n) * game.scale + t)
        }

        config.debug.collisions && col && (col.position.set(pos.x, pos.y),
        col.rotation = rot)
    }

    powerup(player, type, tint) {
        const {sprites} = player;
        sprites.powerup.texture = this.pixiImageByName[type];//Textures.get(type);
        sprites.powerupCircle.tint = tint;
    }

    powerup_visibility(player, visible) {
        player.sprites.powerup.visible = visible;
        player.sprites.powerupCircle.visible = visible;
    }

    player_flag(player, e) {
        player.sprites.flag.texture = this.pixiImageByName["flag_" + e.flag];
    }

    badge(player, e) {
        player.sprites.badge.texture = this.pixiImageByName[e];
    }

    player_visibility(player, isVisible) {
        const {sprites, state, type, powerupActive} = player;
        sprites.sprite.visible = isVisible && !config.debug.hide_texture_player;
        sprites.shadow.visible = isVisible && !config.debug.hide_texture_player;
        sprites.flag.visible = isVisible;
        sprites.name.visible = isVisible;

        if(null != sprites.level) {
            sprites.level.visible = isVisible;
            sprites.levelBorder.visible = isVisible;
        }

        sprites.badge.visible = state.hasBadge && isVisible;
        sprites.powerup.visible = powerupActive && isVisible;
        sprites.powerupCircle.visible = powerupActive && isVisible;

        const {thrusters, rotors} = config.ships[type].graphics || {thrusters:[], rotors:[]};
        for (let i=0; i<thrusters.length; i++) {
            sprites[`thruster${i}`].visible = isVisible && !config.debug.hide_texture_thruster;
            sprites[`thruster${i}Glow`].visible = isVisible && !config.debug.hide_texture_thruster;
            sprites[`thruster${i}Shadow`].visible = isVisible && !config.debug.hide_texture_thruster;
        }
        for (let i=0; i<rotors.length; i++) {
            sprites[`rotor${i}`].visible = isVisible;
            sprites[`rotor${i}Shadow`].visible = isVisible;
        }
    }

    player_opacity(player, alpha) {
        const {sprites, type} = player;
        sprites.sprite.alpha = alpha;
        sprites.shadow.alpha = alpha;
        sprites.flag.alpha = alpha;
        sprites.name.alpha = alpha;
        sprites.badge.alpha = alpha;
        sprites.powerup.alpha = .75 * alpha;
        sprites.powerupCircle.alpha = .75 * alpha;

        if(null != sprites.level) {
            sprites.level.alpha = alpha;
            sprites.levelBorder.alpha = .4 * alpha;
        }

        if (config.ships[type]?.special === 5) {
            const {thrusters} = config.ships[type].graphics;
            for (let i=0; i<thrusters.length; i++) {
                sprites[`thruster${i}`].alpha = alpha;
                sprites[`thruster${i}Glow`].alpha = alpha;
            }
        }
    }

    player_saybubble(player, e, changed) {
        const {sprites} = player;
        if (changed) {
            sprites.bubble.visible = this.render,
            sprites.bubble.alpha = 0,
            sprites.bubble.scale.set(0, 0)
        }
        sprites.bubble.cacheAsBitmap = false;
        var t = UI.isEmote(e.text, true);
        if (t) {
            sprites.bubbleText.visible = false,
            sprites.emote.texture = this.pixiImageByName["emote_" + t];
            sprites.emote.visible = true;
            var n = 26;
            sprites.emote.position.set(0, 0)
        } else {
            sprites.bubbleText.visible = true,
            sprites.emote.visible = false,
            sprites.bubbleText.text = e.text;
            n = sprites.bubbleText.width;
            sprites.bubbleText.position.set(-n / 2, -7)
        }
        sprites.bubbleLeft.position.set(-n / 2 - 16, -21),
        sprites.bubbleRight.position.set(n / 2 + 8, -21),
        sprites.bubbleCenter.position.set(-n / 2 - 9, -21),
        sprites.bubbleCenter.scale.set(n / 82 + 18 / 82, .5),
        sprites.bubblePoint.position.set(-9, 18),
        sprites.bubble.cacheAsBitmap = true;
        return n;
    }

    setupLevelPlate(player) {
        let plateText = player.bot ? "bot" : player.level + "";
        null == player.sprites.level ? (player.sprites.level = new PIXI.Text(plateText, {
            fontFamily: "MontserratWeb, Helvetica, sans-serif",
            fontSize: (
                ((player.bot ? 24 : 28) * config.airmashRefugees.fontSizeMul) + "px"
            ),
            fill: "rgb(200, 200, 200)",
            dropShadow: true,
            dropShadowBlur: 6,
            dropShadowDistance: 0,
            padding: 4
        }),
        player.sprites.level.scale.set(.5, .5),
        player.sprites.levelBorder = new PIXI.Sprite(this.pixiImageByName["levelborder"]),//Textures.sprite("levelborder"),
        player.sprites.levelBorder.alpha = .4,
        this.graphics.layers.playernames.addChild(player.sprites.levelBorder),
        this.graphics.layers.playernames.addChild(player.sprites.level)) : player.sprites.level.text = plateText,
        player.sprites.levelBorder.scale.set((player.sprites.level.width + 10) / 32, .65),
        player.sprites.level.visible = player.render,
        player.sprites.levelBorder.visible = player.render
    }

    update_nameplate(player) {
        player.sprites.name.style = new PIXI.TextStyle(this.#nameplateTextStyle(player));
    }

    #nameplateTextStyle(player) {
        if (GameType.CTF == game.gameType || game.server.config.tdmMode || GameType.CONQUEST == game.gameType)
            var e = 1 == player.team ? "#4076E2" : "#EA4242";
        else {
            if (player.in_my_team) {
                e = "#4076E2";
            } else if (player.in_team) {
                e = player.in_team;
            } else {
                e = player.team == game.myTeam ? "#FFFFFF" : "#FFEC52";
            }
        }
        return {
            fontFamily: "MontserratWeb, Helvetica, sans-serif",
            fontSize: (33 * config.airmashRefugees.fontSizeMul) + "px",
            fill: e,
            dropShadow: true,
            dropShadowBlur: 10,
            dropShadowDistance: 0,
            padding: 4
        }
    }

    update_player_debug(player) {
        const {sprites, type, col} = player;
        if (!window.DEVELOPMENT) return;
        if (!config.ships[type]) return;
        if(config.debug.collisions) {
            if (!col) {
                col = player.col = new PIXI.Graphics;
                for (var n of config.ships[type].collisions) {
                    col.beginFill(0xffffff, .2);
                    col.drawCircle(n[0], n[1], n[2]);
                    col.endFill();
                }
                this.graphics.layers.explosions.addChild(col);
            }
        } else {
            if (col) {
                this.graphics.layers.explosions.removeChild(col);
                col.destroy();
                player.col = null;
            }
        }
        const {graphics:{thrusters, rotors}} = config.ships[type];
        sprites.sprite.visible = !config.debug.hide_texture_player;
        sprites.shadow.visible = !config.debug.hide_texture_player;
        for (let i=0; i< thrusters.length; i++) {
            sprites[`thruster${i}`] && (sprites[`thruster${i}`].visible = !config.debug.hide_texture_thruster);
            sprites[`thruster${i}Glow`] && (sprites[`thruster${i}Glow`].visible = !config.debug.hide_texture_thruster);
            sprites[`thruster${i}Shadow`] && (sprites[`thruster${i}Shadow`].visible = !config.debug.hide_texture_thruster);
        }
    }

    async changeSkin(player, url, hash) {
        //const player = this;
        player.skin = {url, hash};
        if (!config.ships[player.type] || !player.sprites.sprite) return;
        const dataURL = await Player.load_skin(player.type, url, hash);
        if (!dataURL)
            return;

        let layer = player.me() ? this.graphics.layers.aircraftme : this.graphics.layers.aircraft;
        layer.removeChild(player.sprites.sprite);

        const texture = new PIXI.Texture.fromImage(dataURL);
        let sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(...config.ships[player.type].graphics.anchor);
        layer.addChild(sprite);
        player.sprites.sprite = sprite;
    }

    add_controlpoint(name, [x, y], [x1, y1], width, debug) {
        const w = debug ? 600 : width;
        const halfwidth = w/2;

        let doodad_field = Textures.init("doodadField", { position: [x, y], scale: 0.5});

        const texture = PIXI.RenderTexture.create(w, w);

        const line = new PIXI.Graphics();
        //line.pivot.set(halfwidth, halfwidth);
        if (debug)
            line.position.set(halfwidth-width/2, halfwidth-width/2);

        const label = new PIXI.Text(name, new PIXI.TextStyle({fill:0xffffff}));
        label.anchor.set(0.5, 0.5);
        label.position.set(halfwidth, halfwidth);

        const circle = new PIXI.Graphics();
        circle.lineStyle(2, 0xFFFFFF, 1);
        circle.beginFill(0xffffff, 0);
        circle.drawCircle(halfwidth, halfwidth, halfwidth);
        circle.endFill();

        const obj = new PIXI.Container();
        obj.addChild(line);
        obj.addChild(label);
        if (debug)
            obj.addChild(circle);

        const big = new PIXI.Sprite(texture);
        big.anchor.set(0.5, 0.5);
        big.x = x;
        big.y = y;
        this.graphics.layers.fields.addChild(big);

        const ui = new PIXI.Container();
        const ui_bg = new PIXI.Sprite(PIXI.Texture.WHITE);
        ui_bg.width = w;
        ui_bg.height = w;
        ui_bg.tint = 0x000000;
        ui_bg.alpha = 0.2;
        ui.addChild(ui_bg);
        const _ui = new PIXI.Sprite(texture);
        //ui.x = x1;
        ui.y = y1;
        ui.scale.set(0.4);
        ui.addChild(_ui);
        this.graphics.layers.ui0.addChild(ui);

        const minimap = new PIXI.Sprite(texture);
        minimap.anchor.set(0.5, 0.5);
        minimap.scale.set(0.3);
        this.graphics.layers.ui2.addChild(minimap);
        this.updateMinimapMob(minimap, x, y);

        return {texture, obj, big, line, label, circle, ui, width, minimap, doodad_field, mapId:game.server.config.mapId};
    }

    remove_controlpoint(cp) {
        this.graphics.layers.fields.removeChild(cp.big);
        cp.big.destroy();
        this.graphics.layers.ui0.removeChild(cp.ui);
        cp.ui.destroy();
        this.graphics.layers.ui2.removeChild(cp.minimap);
        cp.minimap.destroy();
        this.graphics.layers.fields.removeChild(cp.doodad_field);
        cp.doodad_field.destroy();
    }

    update_controlpoint(cp, end_progress) {
        const line = cp.line;
        const width = cp.width;
        const square8th = width/2;
        const total8th = end_progress/8;
        const total4th = end_progress/4;
        const factor = square8th/total8th;
        let p = Math.abs(cp.progress);
        line.clear();
        if (p > 0) {
            line.lineStyle(10, cp.progress > 0 ? red_color : blue_color, 1);
            line.moveTo(square8th, 0);
            if (p >= 0)
            line.lineTo(square8th+Math.min(square8th, p*factor), 0);
            p -= total8th;
            if (p >= 0)
            line.lineTo(width, Math.min(width, p*factor));
            p -= total4th;
            if (p >= 0)
            line.lineTo(width-Math.min(width, p*factor), width);
            p -= total4th;
            if (p >= 0)
            line.lineTo(0, width-Math.min(width, p*factor));
            p -= total4th;
            if (p >= 0)
            line.lineTo(Math.min(square8th, p*factor), 0);  
        }

        if (cp.team === 0)
            cp.label.tint = 0xffffff;
        else if (cp.team === 1)
            cp.label.tint = blue_color;
        else if (cp.team === 2)
            cp.label.tint = red_color;

        this.renderer.render(cp.obj, cp.texture, true);
    }

    add_progressbar(color, direction, width, height) {
        const mask = new PIXI.Sprite(PIXI.Texture.WHITE);
        mask.width = width;
        mask.height = height;

        const container = new PIXI.Container();
        this.graphics.layers.ui0.addChild(container);
        container.pivot.set(width/2, height/2);
        //container.x = Math.round(game.halfScreenX + direction*x_offset);
        container.y = 50;
        container.mask = mask;
        container.addChild(mask);

        const shadow = new PIXI.Sprite(PIXI.Texture.WHITE);
        shadow.tint = 0x000000;
        shadow.alpha = 0.2;
        shadow.width = width;
        shadow.height = height;
        container.addChild(shadow);

        const p = new PIXI.Sprite(PIXI.Texture.WHITE);
        p.tint = color;
        p.width = width;
        p.height = height;
        container.addChild(p);

        return {container, p, direction, width};
    }

    update_progressbar({p, direction, width}, perc) {
        if (direction > 0)
            p.position.set(width - (perc*width), 0);
        else
            p.position.set(-width + (perc*width), 0);
    }

    remove_progressbar(bar) {
        this.graphics.layers.ui0.removeChild(bar.container);
        bar.container.destroy();
    }

    // read_or_blue: 'Red' or 'Blue'
    add_ctf_flag(red_or_blue) {
        const flag = {
            sprite: this.#add_sprite('ctfFlag'+red_or_blue, {
                scale: 0.4,
                visible: false
            }),
            spriteShadow: this.#add_sprite('ctfFlagShadow', {
                scale: 0.4 * 1.1,
                visible: false
            }),
            minimapSprite: this.#add_sprite('minimapFlag'+red_or_blue),
            minimapBase: this.#add_sprite('minimapBase'+red_or_blue)
        };
        if (game.gameType == GameType.FFA || game.gameType == GameType.EDITOR)
            flag.minimapBase.visible = false;
        return flag;
    }

    remove_ctf_flag(flag) {
        this.graphics.layers.flags.removeChild(flag.sprite);
        this.graphics.layers.shadows.removeChild(flag.spriteShadow);
        this.graphics.layers.ui3.removeChild(flag.minimapSprite);
        this.graphics.layers.ui2.removeChild(flag.minimapBase);
        flag.sprite.destroy();
        flag.spriteShadow.destroy();
        flag.minimapSprite.destroy();
        flag.minimapBase.destroy();
    }

    update_ctf_flag(flag, isResize, msg) {
        if (msg) {
            flag.momentum = 0;
            flag.direction = 1;
            flag.sprite.scale.x = 0.4;
            flag.sprite.rotation = 0;
            flag.spriteShadow.scale.x = 0.4 * 1.1;
            flag.spriteShadow.rotation = 0;

            if (msg.type == 1) {
                // Flag is not being carried
                flag.position.x = msg.posX;
                flag.position.y = msg.posY;
                flag.sprite.position.set(msg.posX, msg.posY);
                let shadow = Mobs.shadowCoords(new Vector(msg.posX,msg.posY));
                flag.spriteShadow.position.set(shadow.x, shadow.y),
                this.updateMinimapMob(flag.minimapSprite, msg.posX, msg.posY);
            } else {
                // Flag is being carried
            }
        }

        // If window is being resized, redraw minimap
        if(isResize && game.flagEnabled) {
            this.updateMinimapMob(flag.minimapSprite, flag.position.x, flag.position.y);
            if (game.gameType == GameType.CTF)
                this.updateMinimapMob(flag.minimapBase, flag.basePos.x, flag.basePos.y);
        }

        if(flag.playerId != null) {
            // Flag is being carried
            let carrier = Players.get(flag.playerId);
            if (carrier != null) {
                // Flag visibility must match visibility of flag carrier player (i.e. are they on-screen?)
                if(carrier.render != flag.visible) {
                    flag.visible = carrier.render;
                    flag.sprite.visible = carrier.render;
                    flag.spriteShadow.visible = carrier.render;

                    if(carrier.render) {
                        flag.momentum = 0;
                        flag.direction = 1;
                        flag.diffX = carrier.pos.x;
                    }
                }

                // Accuracy of flag minimap position depends on whether flag carrier player is visible
                if(carrier.render) {
                    this.updateMinimapMob(flag.minimapSprite, carrier.pos.x, carrier.pos.y);
                } else {
                    this.updateMinimapMob(flag.minimapSprite, carrier.lowResPos.x, carrier.lowResPos.y);
                }
            }

            // Display flag if flag carrier player is visible
            if(flag.visible) {
                flag.position.x = carrier.pos.x;
                flag.position.y = carrier.pos.y;
                flag.sprite.position.set(carrier.pos.x, carrier.pos.y);

                let shadow = Mobs.shadowCoords(carrier.pos);
                flag.spriteShadow.position.set(shadow.x, shadow.y),

                flag.momentum = Tools.clamp(flag.momentum + (carrier.pos.x - flag.diffX) * game.timeFactor, -40, 40);
                let directionModifier = flag.momentum > 0 ? 0.1 : -0.1;
                flag.direction = Tools.clamp(flag.direction - directionModifier * game.timeFactor, -0.4, 0.4);
                flag.sprite.scale.x = flag.direction;
                flag.spriteShadow.scale.x = 1.1 * flag.direction;

                let rotation = 0.04 * -(carrier.pos.x - flag.diffX) * game.timeFactor;
                flag.sprite.rotation = rotation;
                flag.spriteShadow.rotation = rotation;

                flag.diffX = carrier.pos.x;
            }
        } else {
            // Flag is not being carried, display if on-screen
            let isVisible = this.inScreen(flag.position, 128);
            if(isVisible != flag.visible) {
                flag.visible = isVisible;
                flag.sprite.visible = isVisible;
                flag.spriteShadow.visible = isVisible;
            }
        }
    }

    popFirewall(firewall, firewallPosition, firewallRadius) {
        let {minimapFirewallVisible, minimapFirewallMask, firewallSprites} = firewall;
        if (firewallRadius <= 0) {
            firewallRadius = 0;
        }

        // Create Graphics object for firewall minimap mask if it doesn't already exist
        if (!minimapFirewallVisible) {
            firewall.minimapFirewallVisible = true;
            minimapFirewallMask = firewall.minimapFirewallMask = new PIXI.Graphics;
            this.graphics.gui.minimap.mask = minimapFirewallMask;
        }

        // Draw firewall mask on minimap
        minimapFirewallMask.clear();
        minimapFirewallMask.beginFill(0xFFFFFF);
        minimapFirewallMask.drawCircle(
            game.screenX - config.minimapPaddingX - config.minimapSize * (16384 - firewallPosition.x) / 32768, 
            game.screenY - config.minimapPaddingY - config.minimapSize / 2 * (8192 - firewallPosition.y) / 16384, 
            2 * firewallRadius / (256 / config.minimapSize * 256));
        minimapFirewallMask.endFill();

        // Calculate extent of firewall sprite grid
        let horizonalSpriteCount = Math.ceil((game.halfScreenX + 64) / game.scale / 64);
        let verticalSpriteCount =  Math.ceil((game.halfScreenY + 64) / game.scale / 64);
        let activeSprites = {};

        // Coordinates of the visible border
        let camera = this.cameraState.center;
        let upperLeft =  new Vector(camera.x - game.halfScreenX / game.scale - 64, camera.y - game.halfScreenY / game.scale - 64);
        let upperRight = new Vector(camera.x + game.halfScreenX / game.scale + 64, camera.y - game.halfScreenY / game.scale - 64);
        let lowerLeft =  new Vector(camera.x - game.halfScreenX / game.scale - 64, camera.y + game.halfScreenY / game.scale + 64);
        let lowerRight = new Vector(camera.x + game.halfScreenX / game.scale + 64, camera.y + game.halfScreenY / game.scale + 64);

        // Check if any part of the firewall is currently visible
        if (Tools.distance(firewallPosition.x, firewallPosition.y, upperLeft.x, upperLeft.y) > firewallRadius || 
            Tools.distance(firewallPosition.x, firewallPosition.y, upperRight.x, upperRight.y) > firewallRadius ||
            Tools.distance(firewallPosition.x, firewallPosition.y, lowerLeft.x, lowerLeft.y) > firewallRadius || 
            Tools.distance(firewallPosition.x, firewallPosition.y, lowerRight.x, lowerRight.y) > firewallRadius) {
            
            // Iterate over firewall sprite grid
            for (let x = -horizonalSpriteCount; x <= horizonalSpriteCount; x++) {
                for (let y = -verticalSpriteCount; y <= verticalSpriteCount; y++) {
                    let posX = 64 * (Math.floor(camera.x / 64) + 0.5) + 64 * x;
                    let posY = 64 * (Math.floor(camera.y / 64) + 0.5) + 64 * y;
                    let distance = Tools.distance(posX, posY, firewallPosition.x, firewallPosition.y)

                    // If position is outside of firewall radius then we display the hot smoke
                    if (distance >= firewallRadius) {
                        let name = `${posX}_${posY}`;
                        activeSprites[name] = true;

                        // Create firewall sprite for this position if it doesn't already exist
                        if (firewallSprites[name] == null)
                        {
                            let sprite = new PIXI.Sprite(this.pixiImageByName[`hotsmoke_${Tools.randInt(1, 4)}`]);//Textures.sprite(`hotsmoke_${Tools.randInt(1, 4)}`);

                            sprite.scale.set(Tools.rand(1.5, 2.5));
                            sprite.anchor.set(0.5, 0.5);
                            sprite.position.set(posX, posY);
                            let maxOpacity = 1;
                            if (Tools.rand(0, 1) > 0.5) {
                                sprite.blendMode = PIXI.BLEND_MODES.ADD;
                                maxOpacity = 0.5;
                            }

                            this.graphics.layers.powerups.addChild(sprite);

                            firewallSprites[name] = {
                                sprite: sprite,
                                rotation: Tools.rand(0, 100),
                                rotationSpeed: Tools.rand(-0.0025, 0.0025),
                                opacity: 0,
                                maxOpacity: maxOpacity,
                                opacitySpeed: distance - firewallRadius >= 64 ? 0.02 : 0.0035,
                                color: Tools.rand(0, 1),
                                colorDir: Tools.rand(0, 1) < 0.5 ? -1 : 1
                            }
                        }
                    }
                }
            }
        }

        for (let name in firewallSprites) {
            if (activeSprites[name]) {
                // Animate sprite by varying its display properties
                firewallSprites[name].rotation += firewallSprites[name].rotationSpeed * game.timeFactor;
                firewallSprites[name].opacity += firewallSprites[name].opacitySpeed * game.timeFactor;
                if (firewallSprites[name].opacity > firewallSprites[name].maxOpacity) {
                    firewallSprites[name].opacity = firewallSprites[name].maxOpacity
                }
                firewallSprites[name].color += 0.005 * firewallSprites[name].colorDir * game.timeFactor;
                if (firewallSprites[name].color < 0) {
                    firewallSprites[name].colorDir = 1;
                }
                if (firewallSprites[name].color > 1) {
                    firewallSprites[name].colorDir = -1;
                }

                // Apply properties to sprite
                firewallSprites[name].sprite.rotation = firewallSprites[name].rotation;
                firewallSprites[name].sprite.alpha = firewallSprites[name].opacity;
                firewallSprites[name].sprite.tint = Tools.colorLerp(0xFAA806, 0xFA4F06, firewallSprites[name].color);
            }
            else {
                // Remove this firewall sprite
                this.graphics.layers.powerups.removeChild(firewallSprites[name].sprite);
                firewallSprites[name].sprite.destroy();
                delete firewallSprites[name];
            }
        }
    }

    removeFirewall(firewall) {
        const {minimapFirewallVisible, minimapFirewallMask, firewallSprites} = firewall;
        if (minimapFirewallVisible) {
            for (let name in firewallSprites) {
                this.graphics.layers.powerups.removeChild(firewallSprites[name].sprite),
                firewallSprites[name].sprite.destroy();
            }

            firewall.firewallSprites = {};

            this.graphics.gui.minimap.mask = null;

            if (minimapFirewallMask) {
                minimapFirewallMask.destroy();
                firewall.minimapFirewallMask = null;
            }

            firewall.minimapFirewallVisible = false;
        }
    }

    #setup_particles() {
        const containersByName = this.particles_containers;
        containersByName.smoke = new ParticleContainer(this.pixiImageByName, this.graphics.layers.smoke,2e3),
        containersByName.shadows = new ParticleContainer(this.pixiImageByName, this.graphics.layers.shadows,2e3,null,true),
        containersByName.explosions = new ParticleContainer(this.pixiImageByName, this.graphics.layers.explosions,2e3)
    }

    #update_particles() {
        const containersByName = this.particles_containers;
        for (var e = game.timeFactor > .51 ? Math.round(game.timeFactor) : 1, n = game.timeFactor / e, r = 0; r < e; r++)
            containersByName.smoke.update(n),
            containersByName.explosions.update(n),
            containersByName.shadows.update(n)
    }

    particles_count() {
        const containersByName = this.particles_containers;
        var e = 0;
        for (var n in containersByName)
            e += containersByName[n].particles.length;
        return e
    }

    particles_explosion(e, r, i) {
        const containersByName = this.particles_containers;
        let o = r > 1 ? 1 + (r - 1) / 1.5 : r;
        for (let s = 0; s < 2; s++)
            containersByName.explosions.addParticle(particleTypeIdByName.EXPLOSION_FLASH, "flash_" + Tools.randInt(1, 4), Vector.zero(), e.clone(), Vector.diag(1.5 * r), 0, 0, Tools.randCircle(), 15987628, null, PIXI.BLEND_MODES.ADD);
        var a, l, u, c, h, d, p, f, g;
        a = Math.round(Tools.rand(20, 30) * r);
        for (let s = 0; s < a; s++)
            l = Tools.randInt(1, 4),
            u = Tools.randCircle(),
            h = Tools.rand(3, 10) * o,
            d = Tools.rand(-.2, .2),
            p = Tools.rand(.4, 1.5) * o,
            g = Tools.rand(0, .3),
            containersByName.explosions.addParticle(particleTypeIdByName.EXPLOSION_SPARK, "spark_" + l, Vector.create(u, h), e.clone(), Vector.diag(p), 0, d, Tools.randCircle(), 16739073, null, PIXI.BLEND_MODES.ADD, g);
        for (let s = 0; s < i; s++)
            u = Tools.randCircle(),
            h = Tools.rand(3, 7) * o,
            c = Tools.rand(15, 30) * r,
            containersByName.explosions.addEmitter(particleTypeIdByName.EMITTER_EXPLOSION_FRAGMENT, Vector.create(u, h), Vector.createOff(e, u, c), Tools.rand(0, .5), containersByName.shadows);
        a = Math.round(Tools.rand(20, 30) * r);
        for (let s = 0; s < a; s++)
            l = Tools.randInt(1, 16),
            u = Tools.randCircle(),
            c = Tools.rand(0, 10) * r,
            h = Tools.rand(0, 3) * r,
            d = Tools.rand(-.1, .1),
            p = Tools.rand(.5, .8) * r,
            f = Tools.randCircle(),
            containersByName.explosions.addParticle(particleTypeIdByName.EXPLOSION_SMOKE, "smoke_" + l, Vector.create(u, h), Vector.createOff(e, u, c), Vector.diag(p), 0, d, f),
            containersByName.shadows.addParticle(particleTypeIdByName.EXPLOSION_SMOKE, "smokeshadow_" + l, Vector.create(u, h), Vector.createOff(e, u, c), Vector.diag(p), 0, d, f);
        containersByName.explosions.addParticle(particleTypeIdByName.EXPLOSION_FLASH_BIG, "glowsmall", Vector.zero(), e.clone(), Vector.diag(6 * r), 0, 0, 0, null, null, PIXI.BLEND_MODES.ADD),
        a = Math.round(Tools.rand(5, 10) * r);
        for (let s = 0; s < a; s++)
            l = Tools.randInt(1, 4),
            u = Tools.randCircle(),
            h = Tools.rand(1, 3) * r,
            d = Tools.rand(-.1, .1),
            p = Tools.rand(.1, .3) * r,
            containersByName.explosions.addParticle(particleTypeIdByName.EXPLOSION_HOT_SMOKE, "hotsmoke_" + l, Vector.create(u, h), e.clone(), Vector.diag(p), 0, d, Tools.randCircle(), 16739073, null, PIXI.BLEND_MODES.ADD)
    }

    particles_missile_smoke(mob, exhaust, data, tint) {
        const containersByName = this.particles_containers;
        var particleType = particleTypeByMobType[mob.type];
        var rotation = mob.spriteRot + Math.PI,
            pos = Vector.createOff(mob.pos, rotation, exhaust),
            scale = 0.2 * (data = data || 1),
            u = Tools.rand(-0.1, 0.1),
            speed = Vector.create(rotation + u, 5 * data),
            index = Tools.randInt(1, 16),
            rotSpeed = Tools.rand(-0.1, 0.1);
        Tools.randCircle();
        containersByName.smoke.addParticle(
            particleType,                           // type
            "smoke_" + index,                       // spriteName
            speed.clone(),                          // speed
            pos.clone(),                            // pos
            new Vector(1.25 * scale,4 * scale),     // scale
            1,                                      // alpha
            rotSpeed,                               // rotationSpeed
            rotation,                               // rotation
            tint || 0xfff9a6,                       // tint
            null,                                   // anchorPos
            null,                                   // blendMode
            null,                                   // life
            data                                    // data
        );
        containersByName.shadows.addParticle(
            particleType,
            "smokeshadow_" + index,
            speed.clone(),
            pos.clone(),
            new Vector(1.25 * scale,4 * scale),
            1,
            rotSpeed,
            rotation,
            null,
            null,
            null,
            null,
            data
        );
    }

    particles_plane_damage(player) {
        const containersByName = this.particles_containers;
        var r = 2 == player.type ? 2 : 1,
            sparkIdx = Tools.randInt(1, 4),
            angle = Tools.randCircle(),
            s = Tools.rand(0.5, 2),
            a = Tools.rand(0.2, 0.8),
            l = Tools.rand(0, 0.3),
            pos = Vector.createOff(player.pos, angle, Tools.rand(0, 5 * r)),
            c = Vector.create(angle, s);
        containersByName.explosions.addParticle(particleTypeIdByName.PLANE_DAMAGE, "spark_" + sparkIdx, new Vector(c.x + player.speed.x,c.y + player.speed.y), pos, Vector.diag(a), 0, 0, Tools.randCircle(), 16739073, null, PIXI.BLEND_MODES.ADD, l)
    }

    particles_plane_boost(e, r) {
        const containersByName = this.particles_containers;
        var i = e.rot + e.state.thrustDir / 2 + Math.PI,
            o = Vector.createOff(e.pos, i, r ? 40 : -20),
            s = Tools.rand(-0.1, 0.1),
            a = r ? 0 : Math.PI,
            l = Vector.create(i + s + a, 6),
            u = Tools.randInt(1, 16),
            c = Tools.rand(-0.1, 0.1);
        Tools.randCircle();
        containersByName.smoke.addParticle(particleTypeIdByName.MISSILE, "smoke_" + u, l.clone(), o.clone(), new Vector(.3,1.2), 1, c, i, 16775590, null, null, null, 1.2),
        containersByName.shadows.addParticle(particleTypeIdByName.MISSILE, "smokeshadow_" + u, l.clone(), o.clone(), new Vector(.3,1.2), 1, c, i, null, null, null, null, 1.2)
    }

    particles_spirit_shockwave(e) {
        const containersByName = this.particles_containers;
        for (var r, i, o = 0; o < 40; o++)
            i = o / 40 * 2 * Math.PI,
            r = Tools.randInt(1, 16),
            containersByName.smoke.addParticle(particleTypeIdByName.SHOCKWAVE_SMOKE, "smoke_" + r, Vector.create(i, 8), e.clone(), Vector.diag(2), 0, .4, Tools.randCircle());
        containersByName.smoke.addParticle(particleTypeIdByName.SHOCKWAVE_INNER, "shockwave", Vector.zero(), e.clone(), Vector.zero(), 0, 0, -.35 + Math.PI),
        containersByName.smoke.addParticle(particleTypeIdByName.SHOCKWAVE_OUTER, "shockwave", Vector.zero(), e.clone(), Vector.zero(), 0, 0, -.35)
    }

    wipe_particles() {
        const containersByName = this.particles_containers;
        containersByName.smoke.wipe(),
        containersByName.explosions.wipe(),
        containersByName.shadows.wipe()
    }
}







var particleTypeIdByName = {
    MISSILE: 0,
    MISSILE_FAT: 1,
    MISSILE_SMALL: 2,
    SHOCKWAVE_SMOKE: 3,
    SHOCKWAVE_INNER: 4,
    SHOCKWAVE_OUTER: 5,
    EXPLOSION_FLASH: 6,
    EXPLOSION_FLASH_BIG: 7,
    EXPLOSION_SMOKE: 8,
    EXPLOSION_HOT_SMOKE: 9,
    EXPLOSION_SPARK: 10,
    FRAGMENT_SMOKE: 11,
    PLANE_DAMAGE: 12,
    EMITTER_EXPLOSION_FRAGMENT: 100
};

var particleTypeByMobType = [
    null,                                   // 0 Unused
    particleTypeIdByName.MISSILE,           // 1 PredatorMissile
    particleTypeIdByName.MISSILE_FAT,       // 2 GoliathMissile
    particleTypeIdByName.MISSILE_SMALL,     // 3 MohawkMissile
    null,                                   // 4 Upgrade
    particleTypeIdByName.MISSILE,           // 5 TornadoSingleMissile
    particleTypeIdByName.MISSILE,           // 6 TornodaTripleMissile
    particleTypeIdByName.MISSILE,           // 7 ProwlerMissile
    null,                                   // 8 Shield
    null,                                   // 9 Inferno
    null,                                   // 10 Unused
    null,                                   // 11 Unused
    particleTypeIdByName.PLANE_DAMAGE       // 12 CarrotMissile
];

class ParticleContainer {
    constructor(pixiImageByName, pixiContainer, maxParticles, blendMode, shadow) {
        this.maxParticles = maxParticles,
        this.container = new PIXI.Container,
        null != blendMode && (this.container.blendMode = blendMode),
        this.particles = [],
        this.first = -1,
        this.last = -1,
        this.emitters = {},
        this.emitterId = 0,
        this.shadow = shadow,
        pixiContainer.addChild(this.container);
        this.pixiImageByName = pixiImageByName;
    }

    addParticle(type, spriteName, speed, pos, scale, alpha, rotationSpeed, rotation, tint, anchorPos, blendMode, life, data, emitter) {
        if (!(game.timeFactorUncapped > 20 || this.particles.length >= this.maxParticles)) {
          var sprite = new PIXI.Sprite(this.pixiImageByName[spriteName]);//Textures.sprite(spriteName);
          var particle = {
            type: type,
            sprite: sprite,
            speed: speed,
            pos: pos,
            scale: scale,
            alpha: alpha,
            rotationSpeed: rotationSpeed,
            rotation: rotation,
            lastRotation: 0,
            time: game.time,
            tint: tint,
            life: 0,
            data: null != data ? data : 0,
            emitter: null != emitter ? emitter : null,
            _prev: -1,
            _next: -1
          };
          if (null != tint) {
            sprite.tint = tint;
          }
          if (null != blendMode) {
            sprite.blendMode = blendMode;
          }
          if (null != life) {
            particle.life = life;
          }
          if (null != anchorPos) {
            sprite.anchor.set(anchorPos.x, anchorPos.y);
          } else {
            sprite.anchor.set(.5, .5);
          }
          this.container.addChild(sprite);
          var particleId = this.particles.length;
          if (particleId > 0) {
            this.particles[this.last]._next = particleId;
            particle._prev = this.last;
            this.last = particleId;
          } else {
            this.first = particleId;
            this.last = particleId;
          }
          this.particles.push(particle);
        }
      }

    wipe() {
        this.emitters = {},
        this.emitterId = 0;
        for (var e = 0; e < this.particles.length; e++)
            this.container.removeChild(this.particles[e].sprite),
            this.particles[e].sprite.destroy();
        this.particles = [],
        this.first = -1,
        this.last = -1
    }

    addEmitter(type, speed, pos, life, shadowLayer) {
        game.timeFactorUncapped > 20 || (this.emitters[this.emitterId] = {
            type: type,
            pos: pos,
            speed: speed,
            life: null != life ? life : 0,
            shadowLayer: shadowLayer
        },
        this.emitterId++)
    }

    updateEmitters(time) {
        for (var emitterId in this.emitters) {
          var emitter = this.emitters[emitterId];
          switch(emitter.type) {
            case particleTypeIdByName.EMITTER_EXPLOSION_FRAGMENT:
              emitter.life += .02 * time;
              emitter.speed.multiply(1 - .02 * time);
          }
          if (emitter.life > 1) {
            delete this.emitters[emitterId];
          } else {
            emitter.pos.x += emitter.speed.x * time;
            emitter.pos.y += emitter.speed.y * time; 
            switch(emitter.type) {
              case particleTypeIdByName.EMITTER_EXPLOSION_FRAGMENT:
                var sequence = Tools.randInt(1, 16);
                var o = 0.5 * (1 - emitter.life);
                var lifeRemaining = 1 - emitter.life;
                var a = Tools.rand(-0.1, 0.1);
                var l = Tools.randCircle();
                this.addParticle(
                    particleTypeIdByName.FRAGMENT_SMOKE,
                    "smoke_" + sequence,
                    Vector.zero(),
                    emitter.pos.clone(),
                    Vector.diag(o),
                    1,
                    a,
                    l,
                    null,
                    null,
                    null,
                    null,
                    lifeRemaining + .2
                );
                if (emitter.shadowLayer) {
                  emitter.shadowLayer.addParticle(particleTypeIdByName.FRAGMENT_SMOKE, "smokeshadow_" + sequence, Vector.zero(), emitter.pos.clone(), Vector.diag(o), 1, a, l, null, null, null, null, lifeRemaining + .2);
                }
            }
          }
        }
      }

    destroy(particleId) {
        var maxParticles = this.particles.length;
        if (0 != maxParticles && !(particleId >= maxParticles)) {
            this.container.removeChild(this.particles[particleId].sprite),
            this.particles[particleId].sprite.destroy();
            var n = this.particles[particleId]._prev,
                r = this.particles[particleId]._next;
            return maxParticles--,
            -1 != n ? this.particles[n]._next = r : this.first = r,
            -1 != r ? this.particles[r]._prev = n : this.last = n,
            particleId != maxParticles && (this.particles[particleId] = this.particles[maxParticles],
            -1 != this.particles[particleId]._prev ? this.particles[this.particles[particleId]._prev]._next = particleId : this.first = particleId,
            -1 != this.particles[particleId]._next ? this.particles[this.particles[particleId]._next]._prev = particleId : this.last = particleId),
            this.particles.splice(maxParticles, 1),
            r == maxParticles ? particleId : r
        }
    }

    _updateMissile(time, particle) {
        particle.type == particleTypeIdByName.MISSILE ? (particle.scale.add(.2 * time),
        particle.scale.ceil(2 * particle.data),
        particle.life += .05 * time) : particle.type == particleTypeIdByName.MISSILE_FAT ? (particle.scale.add(.3 * time),
        particle.scale.ceil(3 * particle.data),
        particle.life += .05 * time) : (particle.scale.add(.14 * time),
        particle.scale.ceil(1.4 * particle.data),
        particle.life += .08 * time),
        particle.speed.multiply(1 - .05 * time),
        particle.alpha = .7 * (1 - particle.life),
        particle.sprite.tint = Tools.colorLerp(particle.tint, 16777215, 2 * (1 - particle.life));
    }

    _updateShockwaveSmoke(time, particle) {
        particle.life += .05 * time,
        particle.alpha = .7 * Tools.easing.custom(particle.life, "shockwave");
    }

    _updateShockwave(time, particle) {
        particle.life += .05 * time;
        var i = Tools.easing.custom(particle.life, "shockwave");
        particle.alpha = .4 * i,
        particle.type == particleTypeIdByName.SHOCKWAVE_OUTER ? particle.scale.both(4 * particle.life) : particle.scale.both(3 * particle.life);
    }

    _updateExplosionFlash(time, particle) {
        particle.life += .1 * time,
        particle.alpha = 1 - particle.life;
    }

    _updateExplosionFlashBig(time, particle) {
        particle.life += .04 * time,
        particle.alpha = 1 - particle.life;
    }

    _updateExplosionHotSmoke(time, particle) {
        particle.life += .035 * time,
        particle.alpha = 1 - particle.life,
        particle.scale.add(.05 * time),
        particle.speed.multiply(1 - .1 * time),
        particle.rotationSpeed *= 1 - .05 * time;
    }

    _updateExplosionSmoke(time, particle) {
        particle.life += .01 * time,
        particle.alpha = Tools.easing.custom(particle.life, "explosionSmoke"),
        particle.scale.add(.05 * time),
        particle.speed.multiply(1 - .05 * time),
        particle.rotationSpeed *= 1 - .05 * time;
    }

    _updateExplosionSpark(time, particle) {
        particle.life += .02 * time,
        particle.alpha = 2 * (1 - particle.life),
        particle.speed.multiply(1 - .05 * time),
        particle.rotationSpeed *= 1 - .05 * time;
    }

    _updateFragmentSmoke(time, particle) {
        particle.life += .02 * time,
        particle.scale.add(.075 * time * particle.data),
        particle.scale.ceil(2 * particle.data),
        particle.rotationSpeed *= 1 - .05 * time,
        particle.alpha = .3 * (1 - particle.life);
    }

    _updatePlaneDamage(time, particle) {
        particle.life += .02 * time,
        particle.alpha = 2 * (1 - particle.life),
        particle.speed.multiply(1 - .1 * time)
    }

    update(time) {
        this.updateEmitters(time);
        for (var r = this.first; -1 != r; ) {
            var particle = this.particles[r];
            var update = this.updateFuncMap[particle.type];
            if(update) {
                update(time, particle);
            }
            if (particle.life > 1)
                r = this.destroy(r);
            else {
                if (particle.pos.x += particle.speed.x * time,
                particle.pos.y += particle.speed.y * time,
                particle.rotation += particle.rotationSpeed * time,
                this.shadow) {
                    var o = Mobs.shadowCoords(particle.pos);
                    particle.sprite.position.x = o.x,
                    particle.sprite.position.y = o.y,
                    particle.sprite.scale.x = particle.scale.x / config.shadowScaling,
                    particle.sprite.scale.y = particle.scale.y / config.shadowScaling,
                    particle.sprite.alpha = Tools.clamp(2 * particle.alpha, 0, 1)
                } else
                    particle.sprite.position.x = particle.pos.x,
                    particle.sprite.position.y = particle.pos.y,
                    particle.sprite.scale.x = particle.scale.x,
                    particle.sprite.scale.y = particle.scale.y,
                    particle.sprite.alpha = Tools.clamp(particle.alpha, 0, 1);
                Math.abs(particle.rotation - particle.lastRotation) > .03 && (particle.sprite.rotation = particle.rotation,
                particle.lastRotation = particle.rotation),
                r = this.particles[r]._next
            }
        }
    }
}

ParticleContainer.prototype.updateFuncMap = {
    [particleTypeIdByName.MISSILE]: ParticleContainer.prototype._updateMissile,
    [particleTypeIdByName.MISSILE_FAT]: ParticleContainer.prototype._updateMissile,
    [particleTypeIdByName.MISSILE_SMALL]: ParticleContainer.prototype._updateMissile,
    [particleTypeIdByName.SHOCKWAVE_SMOKE]: ParticleContainer.prototype._updateShockwaveSmoke,
    [particleTypeIdByName.SHOCKWAVE_INNER]: ParticleContainer.prototype._updateShockwave,
    [particleTypeIdByName.SHOCKWAVE_OUTER]: ParticleContainer.prototype._updateShockwave,
    [particleTypeIdByName.EXPLOSION_FLASH]: ParticleContainer.prototype._updateExplosionFlash,
    [particleTypeIdByName.EXPLOSION_FLASH_BIG]: ParticleContainer.prototype._updateExplosionFlashBig,
    [particleTypeIdByName.EXPLOSION_HOT_SMOKE]: ParticleContainer.prototype._updateExplosionHotSmoke,
    [particleTypeIdByName.EXPLOSION_SMOKE]: ParticleContainer.prototype._updateExplosionSmoke,
    [particleTypeIdByName.EXPLOSION_SPARK]: ParticleContainer.prototype._updateExplosionSpark,
    [particleTypeIdByName.FRAGMENT_SMOKE]: ParticleContainer.prototype._updateFragmentSmoke,
    [particleTypeIdByName.PLANE_DAMAGE]: ParticleContainer.prototype._updatePlaneDamage
};






var imageUrlByName = {
    map_sea: "assets/map_sea.jpg",
    // map_sea_mask: "assets/map_sea_mask.jpg",
    map_forest: "assets/map_forest.jpg",
    map_rock: "assets/map_rock.jpg",
    // map_rock_mask: "assets/map_rock_mask.jpg",
    map_sand: "assets/map_sand.jpg",
    // map_sand_mask: "assets/map_sand_mask.jpg",
    mountains: "assets/mountains.png",
    aircraft: "assets/aircraft.png",
    shadows: "assets/shadows.png",
    particles: "assets/particles.png",
    flags: "assets/flagsbig.png?4",
    items: "assets/items.png?3",
    //gui: "assets/gui.png",
    gui: "assets/maps/vanilla/gui.png",
    vanilla_map_sea_mask: "assets/maps/vanilla/map_sea_mask.jpg",
    vanilla_map_rock_mask: "assets/maps/vanilla/map_rock_mask.jpg",
    vanilla_map_sand_mask: "assets/maps/vanilla/map_sand_mask.jpg",
};

var spriteByName = {
    spirit: ["aircraft", [4, 4, 512, 256]],
    tornado: ["aircraft", [524, 4, 256, 256]],
    raptor: ["aircraft", [788, 4, 256, 256]],
    prowler: ["aircraft", [1052, 4, 256, 256]],
    comanche: ["aircraft", [1316, 4, 128, 256]],
    comanche_rotor: ["aircraft", [1452, 4, 128, 128]],
    mountain2: ["mountains", [0, 512, 512, 512]],
    mountain1: ["mountains", [512, 512, 512, 512]],
    mountain4: ["mountains", [0, 0, 512, 512]],
    mountain3: ["mountains", [512, 0, 512, 512]],
    crate_shadow: ["shadows", [4, 140, 64, 64]],
    comanche_rotor_shadow: ["shadows", [76, 140, 64, 64]],
    smokeshadow_8: ["shadows", [148, 140, 32, 32]],
    smokeshadow_7: ["shadows", [188, 140, 32, 32]],
    smokeshadow_6: ["shadows", [228, 140, 32, 32]],
    smokeshadow_5: ["shadows", [268, 140, 32, 32]],
    smokeshadow_4: ["shadows", [308, 140, 32, 32]],
    smokeshadow_3: ["shadows", [348, 140, 32, 32]],
    smokeshadow_2: ["shadows", [388, 140, 32, 32]],
    smokeshadow_15: ["shadows", [428, 140, 32, 32]],
    smokeshadow_14: ["shadows", [468, 140, 32, 32]],
    smokeshadow_13: ["shadows", [508, 140, 32, 32]],
    smokeshadow_12: ["shadows", [548, 140, 32, 32]],
    smokeshadow_11: ["shadows", [588, 140, 32, 32]],
    smokeshadow_10: ["shadows", [628, 140, 32, 32]],
    smokeshadow_1: ["shadows", [668, 140, 32, 32]],
    smokeshadow_16: ["shadows", [708, 140, 32, 32]],
    afterburner_shadow: ["shadows", [748, 140, 32, 32]],
    spirit_shadow: ["shadows", [4, 4, 256, 128]],
    tornado_shadow: ["shadows", [268, 4, 128, 128]],
    screenshade: ["shadows", [404, 4, 128, 128]],
    raptor_shadow: ["shadows", [540, 4, 128, 128]],
    prowler_shadow: ["shadows", [676, 4, 128, 128]],
    comanche_shadow: ["shadows", [812, 4, 64, 128]],
    missile_shadow: ["shadows", [884, 4, 32, 128]],
    smokeshadow_9: ["shadows", [924, 76, 32, 32]],
    ctf_flag_shadow: ["shadows", [924, 4, 64, 64]],
    flash_1: ["particles", [0, 128, 120, 120]],
    glowsmall: ["particles", [120, 128, 64, 64]],
    smoke_9: ["particles", [184, 128, 32, 32]],
    smoke_8: ["particles", [216, 128, 32, 32]],
    smoke_7: ["particles", [248, 128, 32, 32]],
    smoke_6: ["particles", [280, 128, 32, 32]],
    smoke_5: ["particles", [312, 128, 32, 32]],
    smoke_4: ["particles", [344, 128, 32, 32]],
    smoke_3: ["particles", [376, 128, 32, 32]],
    smoke_2: ["particles", [408, 128, 32, 32]],
    smoke_16: ["particles", [440, 128, 32, 32]],
    smoke_15: ["particles", [472, 128, 32, 32]],
    smoke_14: ["particles", [504, 128, 32, 32]],
    smoke_13: ["particles", [536, 128, 32, 32]],
    smoke_12: ["particles", [568, 128, 32, 32]],
    smoke_11: ["particles", [600, 128, 32, 32]],
    smoke_10: ["particles", [632, 128, 32, 32]],
    smoke_1: ["particles", [664, 128, 32, 32]],
    shockwave: ["particles", [0, 0, 128, 128]],
    hotsmoke_4: ["particles", [128, 0, 120, 120]],
    hotsmoke_3: ["particles", [248, 0, 120, 120]],
    hotsmoke_2: ["particles", [368, 0, 120, 120]],
    hotsmoke_1: ["particles", [488, 0, 120, 120]],
    flash_4: ["particles", [608, 0, 120, 120]],
    flash_3: ["particles", [728, 0, 120, 120]],
    spark_4: ["particles", [848, 120, 8, 8]],
    spark_3: ["particles", [856, 120, 8, 8]],
    spark_2: ["particles", [864, 120, 8, 8]],
    spark_1: ["particles", [872, 120, 8, 8]],
    flash_2: ["particles", [848, 0, 120, 120]],
    crate_upgrade: ["items", [4, 268, 128, 128]],
    crate_magic: ["items", [4, 409, 128, 128]],
    crate_shield: ["items", [140, 268, 128, 128]],
    crate_rampage: ["items", [276, 268, 128, 128]],
    afterburner: ["items", [412, 268, 128, 128]],
    missile_fat: ["items", [548, 268, 64, 128]],
    missile_carrot: ["items", [694, 268, 64, 128]],
    missile: ["items", [620, 268, 32, 128]],
    doodad_field: ["items", [4, 4, 256, 256]],
    badge_bronze: ["items", [268, 140, 64, 64]],
    powerup_shield: ["items", [268, 4, 128, 128]],
    badge_gold: ["items", [404, 140, 64, 64]],
    powerup_rampage: ["items", [404, 4, 128, 128]],
    badge_silver: ["items", [540, 140, 64, 64]],
    powerup_circle: ["items", [540, 4, 128, 128]],
    glowdirectional: ["items", [676, 140, 64, 64]],
    ctf_flag_red: ["items", [676, 4, 128, 128]],
    glowsmall_copy: ["items", [812, 140, 64, 64]],
    missile_small: ["items", [884, 140, 16, 64]],
    levelborder: ["items", [908, 140, 32, 32]],
    ctf_flag_blue: ["items", [812, 4, 128, 128]],
    hud_shadow: ["gui", [4, 268, 80, 348]],
    hud_mask: ["gui", [92, 268, 80, 348]],
    hud: ["gui", [180, 268, 80, 348]],
    emote_bro: ["gui", [268, 548, 64, 64]],
    emote_clap: ["gui", [268, 476, 64, 64]],
    ui_minimap_box: ["gui", [268, 404, 64, 64]],
    emote_cry: ["gui", [340, 548, 64, 64]],
    emote_kappa: ["gui", [340, 476, 64, 64]],
    emote_tf: ["gui", [340, 404, 64, 64]],
    emote_lol: ["gui", [412, 548, 64, 64]],
    emote_pepe: ["gui", [412, 476, 64, 64]],
    ui_minimap_blue: ["gui", [484, 596, 16, 16]],
    ui_minimap_base_blue: ["gui", [484, 556, 32, 32]],
    ui_minimap_base_red: ["gui", [484, 516, 32, 32]],
    ui_minimap_flag_blue: ["gui", [484, 476, 32, 32]],
    emote_rage: ["gui", [412, 404, 64, 64]],
    ui_minimap_mob: ["gui", [484, 444, 16, 16]],
    ui_minimap_flag_red: ["gui", [484, 404, 32, 32]],
    ui_minimap: ["gui", [4, 4, 512, 256]],
    chatbubbleleft: ["gui", [274, 274, 16, 82]],
    chatbubblecenter: ["gui", [350, 274, 82, 82]],
    chatbubbleright: ["gui", [438, 274, 16, 82]],
    chatbubblepoint: ["gui", [297, 352, 36, 22]]
};

var flagByName = {
    flag_1: ["flags", [2, 962, 80, 60]],
    flag_2: ["flags", [2, 898, 80, 60]],
    flag_3: ["flags", [2, 834, 80, 60]],
    flag_4: ["flags", [2, 770, 80, 60]],
    flag_5: ["flags", [2, 706, 80, 60]],
    flag_6: ["flags", [2, 642, 80, 60]],
    flag_7: ["flags", [2, 578, 80, 60]],
    flag_8: ["flags", [2, 514, 80, 60]],
    flag_9: ["flags", [2, 450, 80, 60]],
    flag_10: ["flags", [2, 386, 80, 60]],
    flag_11: ["flags", [2, 322, 80, 60]],
    flag_12: ["flags", [2, 258, 80, 60]],
    flag_13: ["flags", [2, 194, 80, 60]],
    flag_14: ["flags", [2, 130, 80, 60]],
    flag_15: ["flags", [2, 66, 80, 60]],
    flag_16: ["flags", [86, 962, 80, 60]],
    flag_17: ["flags", [86, 898, 80, 60]],
    flag_18: ["flags", [86, 834, 80, 60]],
    flag_19: ["flags", [86, 770, 80, 60]],
    flag_20: ["flags", [86, 706, 80, 60]],
    flag_21: ["flags", [86, 642, 80, 60]],
    flag_22: ["flags", [86, 578, 80, 60]],
    flag_23: ["flags", [86, 514, 80, 60]],
    flag_24: ["flags", [86, 450, 80, 60]],
    flag_25: ["flags", [86, 386, 80, 60]],
    flag_26: ["flags", [86, 322, 80, 60]],
    flag_27: ["flags", [86, 258, 80, 60]],
    flag_28: ["flags", [86, 194, 80, 60]],
    flag_29: ["flags", [86, 130, 80, 60]],
    flag_30: ["flags", [170, 962, 80, 60]],
    flag_31: ["flags", [170, 898, 80, 60]],
    flag_32: ["flags", [170, 834, 80, 60]],
    flag_33: ["flags", [170, 770, 80, 60]],
    flag_34: ["flags", [170, 706, 80, 60]],
    flag_35: ["flags", [170, 642, 80, 60]],
    flag_36: ["flags", [170, 578, 80, 60]],
    flag_37: ["flags", [170, 514, 80, 60]],
    flag_38: ["flags", [170, 450, 80, 60]],
    flag_39: ["flags", [170, 386, 80, 60]],
    flag_40: ["flags", [170, 322, 80, 60]],
    flag_41: ["flags", [170, 258, 80, 60]],
    flag_42: ["flags", [170, 194, 80, 60]],
    flag_43: ["flags", [254, 962, 80, 60]],
    flag_44: ["flags", [254, 898, 80, 60]],
    flag_45: ["flags", [254, 834, 80, 60]],
    flag_46: ["flags", [254, 770, 80, 60]],
    flag_47: ["flags", [254, 706, 80, 60]],
    flag_48: ["flags", [254, 642, 80, 60]],
    flag_49: ["flags", [254, 578, 80, 60]],
    flag_50: ["flags", [254, 514, 80, 60]],
    flag_51: ["flags", [254, 450, 80, 60]],
    flag_52: ["flags", [254, 386, 80, 60]],
    flag_53: ["flags", [254, 322, 80, 60]],
    flag_54: ["flags", [338, 962, 80, 60]],
    flag_55: ["flags", [338, 898, 80, 60]],
    flag_56: ["flags", [338, 834, 80, 60]],
    flag_57: ["flags", [338, 770, 80, 60]],
    flag_58: ["flags", [338, 706, 80, 60]],
    flag_59: ["flags", [338, 642, 80, 60]],
    flag_60: ["flags", [338, 578, 80, 60]],
    flag_61: ["flags", [338, 514, 80, 60]],
    flag_62: ["flags", [338, 450, 80, 60]],
    flag_63: ["flags", [338, 386, 80, 60]],
    flag_64: ["flags", [422, 962, 80, 60]],
    flag_65: ["flags", [422, 898, 80, 60]],
    flag_66: ["flags", [422, 834, 80, 60]],
    flag_67: ["flags", [422, 770, 80, 60]],
    flag_68: ["flags", [422, 706, 80, 60]],
    flag_69: ["flags", [422, 642, 80, 60]],
    flag_70: ["flags", [422, 578, 80, 60]],
    flag_71: ["flags", [422, 514, 80, 60]],
    flag_72: ["flags", [422, 450, 80, 60]],
    flag_73: ["flags", [506, 962, 80, 60]],
    flag_74: ["flags", [506, 898, 80, 60]],
    flag_75: ["flags", [506, 834, 80, 60]],
    flag_76: ["flags", [506, 770, 80, 60]],
    flag_77: ["flags", [506, 706, 80, 60]],
    flag_78: ["flags", [506, 642, 80, 60]],
    flag_79: ["flags", [506, 578, 80, 60]],
    flag_80: ["flags", [590, 770, 80, 60]],
    flag_81: ["flags", [590, 706, 80, 60]],
    flag_82: ["flags", [590, 642, 80, 60]],
    flag_83: ["flags", [590, 578, 80, 60]],
    flag_84: ["flags", [506, 514, 80, 60]],
    flag_85: ["flags", [590, 514, 80, 60]],
    flag_86: ["flags", [506, 450, 80, 60]],
    flag_87: ["flags", [590, 450, 80, 60]],
    flag_88: ["flags", [422, 386, 80, 60]],
    flag_89: ["flags", [506, 386, 80, 60]],
    flag_90: ["flags", [590, 386, 80, 60]],
    flag_91: ["flags", [338, 322, 80, 60]],
    flag_92: ["flags", [422, 322, 80, 60]],
    flag_93: ["flags", [506, 322, 80, 60]],
    flag_94: ["flags", [590, 322, 80, 60]],
    flag_95: ["flags", [254, 258, 80, 60]],
    flag_96: ["flags", [338, 258, 80, 60]],
    flag_97: ["flags", [422, 258, 80, 60]],
    flag_98: ["flags", [506, 258, 80, 60]],
    flag_99: ["flags", [590, 258, 80, 60]],
    flag_100: ["flags", [254, 194, 80, 60]],
    flag_101: ["flags", [338, 194, 80, 60]],
    flag_102: ["flags", [422, 194, 80, 60]],
    flag_103: ["flags", [506, 194, 80, 60]],
    flag_104: ["flags", [590, 194, 80, 60]],
    flag_105: ["flags", [170, 130, 80, 60]],
    flag_106: ["flags", [254, 130, 80, 60]],
    flag_107: ["flags", [338, 130, 80, 60]],
    flag_108: ["flags", [422, 130, 80, 60]],
    flag_109: ["flags", [506, 130, 80, 60]],
    flag_110: ["flags", [590, 130, 80, 60]],
    flag_111: ["flags", [86, 66, 80, 60]],
    flag_112: ["flags", [170, 66, 80, 60]],
    flag_113: ["flags", [254, 66, 80, 60]],
    flag_114: ["flags", [338, 66, 80, 60]],
    flag_115: ["flags", [422, 66, 80, 60]],
    flag_116: ["flags", [506, 66, 80, 60]],
    flag_117: ["flags", [590, 66, 80, 60]],
    flag_118: ["flags", [2, 2, 80, 60]],
    flag_119: ["flags", [86, 2, 80, 60]],
    flag_120: ["flags", [170, 2, 80, 60]],
    flag_121: ["flags", [254, 2, 80, 60]],
    flag_122: ["flags", [338, 2, 80, 60]],
    flag_123: ["flags", [422, 2, 80, 60]],
    flag_124: ["flags", [506, 2, 80, 60]],
    flag_125: ["flags", [590, 2, 80, 60]]
};

var textureByName = {
    hudHealth_shadow: {
        texture: "hud_shadow",
        layer: "ui0",
        pivot: [330, 174],
        position: "screencenter",
        alpha: 0.2
    },
    hudHealth_mask: {
        texture: "hud_mask",
        layer: "hudHealth",
        pivot: [330, 174],
        position: "screencenter"
    },
    hudHealth: {
        texture: "hud",
        layer: "hudHealth",
        pivot: [330, 174],
        position: "screencenter"
    },
    hudEnergy_shadow: {
        texture: "hud_shadow",
        layer: "ui0",
        pivot: [330, 174],
        position: "screencenter",
        alpha: 0.2,
        rotation: Math.PI
    },
    hudEnergy_mask: {
        texture: "hud_mask",
        layer: "hudEnergy",
        pivot: [330, 174],
        position: "screencenter",
        rotation: Math.PI
    },
    hudEnergy: {
        texture: "hud",
        layer: "hudEnergy",
        pivot: [330, 174],
        position: "screencenter",
        tint: 3374821
    },
    minimap: {
        texture: "ui_minimap",
        layer: "ui0",
        anchor: [1, 1],
        alpha: 0.25
    },
    minimapBox: {
        texture: "ui_minimap_box",
        layer: "ui4",
        anchor: [0.5, 0.5],
        alpha: 0.6
    },
    minimapMob: {
        texture: "ui_minimap_mob",
        layer: "ui1",
        anchor: [0.5, 0.5],
        alpha: 0.5,
        scale: 0.8
    },
    minimapBlue: {
        texture: "ui_minimap_blue",
        layer: "ui1",
        anchor: [0.5, 0.5],
        alpha: 0.5,
        scale: 0.8
    },
    minimapFlagBlue: {
        texture: "ui_minimap_flag_blue",
        layer: "ui3",
        anchor: [0.5, 0.5],
        scale: 0.5
    },
    minimapFlagRed: {
        texture: "ui_minimap_flag_red",
        layer: "ui3",
        anchor: [0.5, 0.5],
        scale: 0.5
    },
    minimapBaseBlue: {
        texture: "ui_minimap_base_blue",
        layer: "ui2",
        anchor: [0.5, 0.5],
        scale: 0.5
    },
    minimapBaseRed: {
        texture: "ui_minimap_base_red",
        layer: "ui2",
        anchor: [0.5, 0.5],
        scale: 0.5
    },
    thrusterShadow: {
        texture: "afterburner_shadow",
        layer: "shadows",
        anchor: [0.5, 0.1]
    },
    missile: {
        texture: "missile",
        layer: "projectiles",
        anchor: [0.5, 0],
        scale: [0.2, 0.15]
    },
    missileFat: {
        texture: "missile_fat",
        layer: "projectiles",
        anchor: [0.5, 0],
        scale: [0.2, 0.2]
    },
    missileSmall: {
        texture: "missile_small",
        layer: "projectiles",
        anchor: [0.5, 0],
        scale: [0.2, 0.2]
    },
    missileCarrot: {
        texture: "missile_carrot",
        layer: "projectiles",
        anchor: [0.5, 0],
        scale: [0.3, 0.3]
    },
    missileShadow: {
        texture: "missile_shadow",
        layer: "shadows",
        anchor: [0.5, 0.25]
    },
    missileThruster: {
        texture: "afterburner",
        layer: "thrusters",
        anchor: [0.5, 0.1],
        scale: [0.15, 0.15]
    },
    thrusterGlowSmall: {
        texture: "glowsmall_copy",
        layer: "glows",
        anchor: [0.5, 0.5],
        blend: "ADD"
    },
    smokeGlow: {
        texture: "glowdirectional",
        layer: "glows",
        anchor: [0.5, 0.3],
        blend: "ADD"
    },
    crateShadow: {
        texture: "crate_shadow",
        layer: "shadows",
        anchor: [0.5, 0.5]
    },
    crateUpgrade: {
        texture: "crate_upgrade",
        layer: "crates",
        anchor: [0.5, 0.5]
    },
    crateMagic: {
        texture: "crate_magic",
        layer: "crates",
        anchor: [0.5, 0.5]
    },
    crateShield: {
        texture: "crate_shield",
        layer: "crates",
        anchor: [0.5, 0.5]
    },
    crateRampage: {
        texture: "crate_rampage",
        layer: "crates",
        anchor: [0.5, 0.5]
    },
    powerupCircle: {
        texture: "powerup_circle",
        layer: "powerups",
        anchor: [0.5, 0.5],
        blend: "ADD"
    },
    powerupShield: {
        texture: "powerup_shield",
        layer: "powerups",
        anchor: [0.5, 0.5],
        blend: "ADD"
    },
    powerupRampage: {
        texture: "powerup_rampage",
        layer: "powerups",
        anchor: [0.5, 0.5],
        blend: "ADD"
    },
    powerupRampage: {
        texture: "powerup_rampage",
        layer: "powerups",
        anchor: [0.5, 0.5],
        blend: "ADD"
    },
    ctfFlagRed: {
        texture: "ctf_flag_red",
        layer: "flags",
        anchor: [15 / 128, 119 / 128]
    },
    ctfFlagBlue: {
        texture: "ctf_flag_blue",
        layer: "flags",
        anchor: [15 / 128, 119 / 128]
    },
    ctfFlagShadow: {
        texture: "ctf_flag_shadow",
        layer: "shadows",
        anchor: [3 / 32, 23 / 32]
    },
    ship_raptor: {
        texture: "raptor",
        layer: "aircraft",
        anchor: [0.5, 0.6]
    },
    ship_shadow_raptor: {
        texture: "raptor_shadow",
        layer: "shadows",
        anchor: [0.5, 0.57]
    },
    shipRaptorThruster: {
        texture: "afterburner",
        layer: "thrusters",
        anchor: [0.5, 0.1],
        scale: [0.25, 0.25]
    },
    ship_spirit: {
        texture: "spirit",
        layer: "aircraft",
        anchor: [0.5, 0.5]
    },
    ship_shadow_spirit: {
        texture: "spirit_shadow",
        layer: "shadows",
        anchor: [0.5, 0.5]
    },
    shipSpiritThruster: {
        texture: "afterburner",
        layer: "thrusters",
        anchor: [0.5, 0.1],
        scale: [0.25, 0.25]
    },
    ship_mohawk: {
        texture: "comanche",
        layer: "aircraft",
        anchor: [0.5, 0.4]
    },
    ship_shadow_mohawk: {
        texture: "comanche_shadow",
        layer: "shadows",
        anchor: [0.5, 0.43]
    },
    shipComancheRotor: {
        texture: "comanche_rotor",
        layer: "aircraft",
        anchor: [0.5, 0.5],
        scale: [0.25, 0.25]
    },
    shipComancheRotorShadow: {
        texture: "comanche_rotor_shadow",
        layer: "shadows",
        anchor: [0.5, 0.5]
    },
    ship_tornado: {
        texture: "tornado",
        layer: "aircraft",
        anchor: [0.5, 0.65]
    },
    ship_shadow_tornado: {
        texture: "tornado_shadow",
        layer: "shadows",
        anchor: [0.5, 0.605]
    },
    ship_prowler: {
        texture: "prowler",
        layer: "aircraft",
        anchor: [0.5, 0.5]
    },
    ship_shadow_prowler: {
        texture: "prowler_shadow",
        layer: "shadows",
        anchor: [0.5, 0.5]
    },
    mountain1: {
        texture: "mountain1",
        layer: "doodads",
        anchor: [0.5, 0.5]
    },
    mountain2: {
        texture: "mountain2",
        layer: "doodads",
        anchor: [0.5, 0.5]
    },
    mountain3: {
        texture: "mountain3",
        layer: "doodads",
        anchor: [0.5, 0.5]
    },
    mountain4: {
        texture: "mountain4",
        layer: "doodads",
        anchor: [0.5, 0.5]
    },
    doodadField: {
        texture: "doodad_field",
        layer: "fields",
        anchor: [0.5, 0.5]
    }
}
