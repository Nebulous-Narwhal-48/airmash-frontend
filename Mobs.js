import Vector from './Vector.js';
import Mob from './Mob.js';

var mobs = {};
var doodads = [];//visible doodads
var someFlag = {};
let loadedDoodads = [];
let loadedGroundDoodads = [];
const radiusToScaleRatio = 120; //config.doodads uses scale, config.walls uses radius

Mobs.add = function (netmob, network, ownerId) {
    mobs[netmob.id] = new Mob(netmob, ownerId);
    if (network) {
        mobs[netmob.id].network(netmob);
    }
};

Mobs.update = function () {
    const visible_mobs = [], visible_mobs_count = {missiles:0, crates:0};
    var t;
    for (t in mobs) {
        const mob = mobs[t];
        mob.update(game.timeFactor);
        if (mob.forDeletion) {
            Mobs.destroy(mob);
        } else {
            mob.updateGraphics(game.timeFactor);
            if (mob.visibility) {
                if (window.MissileMobTypeSet[mob.type]) {
                    visible_mobs_count.missiles++;
                } else if (window.CrateMobTypeSet[mob.type])
                    visible_mobs_count.crates++;
                else
                    throw `assert ${mob.type}`;
                visible_mobs.push(mob);
            }
        }
    }
    return {visible_mobs, visible_mobs_count};
};

Mobs.network = function (netmob, ownerId) {
    var mob = mobs[netmob.id];
    if (mob == null) {
        Mobs.add(netmob, true, ownerId)
    }
    else {
        mob.network(netmob, ownerId);
    }
};

Mobs.despawn = function (despawnMsg) {
    var mob = mobs[despawnMsg.id];
    null != mob && mob.despawn(despawnMsg.type)
};

Mobs.destroy = function (t) {
    var n = mobs[t.id];
    null != n && (n.destroy(t),
        delete mobs[t.id])
};

Mobs.explosion = function (pos, mobType) {
    switch (mobType) {
        case MobType.PredatorMissile:
        case MobType.TornadoSingleMissile:
        case MobType.TornadoTripleMissile:
        case MobType.ProwlerMissile:
            game.renderer.particles_explosion(pos, Tools.rand(1, 1.2));
            break;
        case MobType.GoliathMissile:
            game.renderer.particles_explosion(pos, Tools.rand(1.3, 1.6));
            break;
        case MobType.MohawkMissile:
        case MobType.CarrotMissile:
            game.renderer.particles_explosion(pos, Tools.rand(.8, 1))
    }
    Sound.mobExplosion(pos, mobType)
};

Mobs.count = function () {
    let count = 0;
    let culledCount = 0;
    for (var mob in mobs) {
        count++;
        if (mobs[mob].culled) {
            culledCount++;
        }
    }
    return [count - culledCount, count]
};

Mobs.mobs = function () { // SPATIE
    return mobs;
};

Mobs.wipe = function () {
    for (var t in mobs)
        mobs[t].destroy({}),
            delete mobs[t]
};

Mobs.countDoodads = function () {
    return [doodads.length, loadedDoodads.length]
};

Mobs.setupDoodads = function () {
    Mobs.removeDoodads();
    //loadedDoodads = JSON.parse(JSON.stringify(config.doodads.concat(config.groundDoodads)));
    loadedDoodads = JSON.parse(JSON.stringify(config.doodads));
    for (let id = 0; id < loadedDoodads.length; id++) {
        Mobs.addDoodad(loadedDoodads[id], id);
    }
    Tools.initBuckets(loadedDoodads);
    
    loadedGroundDoodads = JSON.parse(JSON.stringify(config.groundDoodads));
    for (let id = 0; id < loadedGroundDoodads.length; id++) {
        Mobs.addDoodad(loadedGroundDoodads[id], id, true);
    }
    //TODO: add ground doodads to buckets
};

Mobs.addDoodad = function (doodad, id=null, visible=false) {
    var isInteger = Number.isInteger(doodad[2]);
    doodad[7] = visible;
    const texture = game.renderer.add_doodad(doodad);
    doodad[8] = texture;
    doodad[9] = isInteger ? 0 : 1;
    if (id === null) {
        loadedDoodads.push(doodad);
        Tools.initBuckets(loadedDoodads);
    }
};

Mobs.getClosestDoodad = function (e) {
    for (var n, r, i = 2, o = 0; o < doodads.length; o++)
        0 == (r = doodads[o])[5] && Tools.distFastCheckFloat(e.x, e.y, r[0], r[1], 256 * r[3]) && (n = Tools.distance(e.x, e.y, r[0], r[1]) / (256 * r[3])) < i && (i = n);
    return Tools.clamp(3.333 * (i - .5), .2, 1)
};

Mobs.getDoodadAtCoord = function(x, y, doodad_type) {
    const loaded = doodad_type == 'groundDoodad' ? loadedGroundDoodads : loadedDoodads;
    for (let i=0; i<loaded.length; i++) {
        if (!loaded[i]) continue;
        const [center_x, center_y, , scale] = loaded[i];
        const radius = scale * radiusToScaleRatio;
        const _x = x - center_x, _y = y - center_y;
        if (Math.sqrt(_x*_x + _y*_y) < radius) {
            return [i, loaded[i], loaded[i][9]/*is_not_mountain*/];
        }
    }
};

Mobs.updateDoodads = function () {
    for (var e, r = Tools.getBucketBounds(game.renderer.cameraState.center, 512 + game.halfScreenX / game.scale, 512 + game.halfScreenY / game.scale), i = r[0]; i <= r[1]; i++) {
        for (var o = r[2]; o <= r[3]; o++) {
            for (var s = 0; s < game.buckets[i][o][0].length; s++) {
                const doodadId = game.buckets[i][o][0][s];
                e = loadedDoodads[doodadId];
                const [x, y, textureNameOrId, scale, rotation,,,,sprite, is_not_mountain] = e;
                if (/*game.state == Network.STATE.LOGIN && !is_not_mountain ||*/ game.renderer.inScreen(new Vector(x, y), 256 * scale + config.overdraw)) {
                    if (!e[7]) {
                        game.renderer.doodad_visibility(e, true);//sprite.visible = true;
                        e[7] = true;

                        if (!someFlag[doodadId]) {
                            someFlag[doodadId] = true;
                            doodads.push([x, y, textureNameOrId, scale, doodadId, is_not_mountain, rotation, , sprite]);
                        }
                    }
                }
            }
        }
    }
    for (let l = doodads.length - 1; l >= 0; l--) {
        const doodadId = doodads[l][4];
        const e = loadedDoodads[doodadId];
        if (!game.renderer.inScreen(new Vector(e[0], e[1]), 256 * e[3] + config.overdraw)) {
            if (e[7]) {
                game.renderer.doodad_visibility(e, false);//e[8].visible = false;
                e[7] = false;
                doodads.splice(l, 1);
                delete someFlag[doodadId];
            }
        }
    }

    return doodads;
};

Mobs.removeDoodads = function(remove_only_mountains, remove_only_id) {
    for (let loaded of [loadedDoodads, loadedGroundDoodads]) {
        for (let id = 0; id < loaded.length; id++) {
            if (!loaded[id]) continue;
            if (typeof remove_only_id != "undefined" && id != remove_only_id) continue;
            let [,,textureNameOrId,,,,,,sprite, is_not_mountain] = loaded[id];
            if (remove_only_mountains === true && is_not_mountain) continue;
            if (remove_only_mountains === false && !is_not_mountain) continue;
            game.renderer.remove_doodad(loaded[id]);
            loaded[id] = null;
        }
    }

    for (let l = doodads.length - 1; l >= 0; l--) {
        const doodadId = doodads[l][4];
        if (!loadedDoodads[doodadId]) {
            doodads.splice(l, 1);
            delete someFlag[doodadId];
        }
    }

    Tools.initBuckets(loadedDoodads);
};

Mobs.shadowCoords = function(e) {
    var t = Mobs.getClosestDoodad(e);
    return new Vector((e.x + config.shadowOffsetX * t) / config.shadowScaling,(e.y + config.shadowOffsetY * t) / config.shadowScaling)
};