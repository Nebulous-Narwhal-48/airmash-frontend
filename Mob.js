import Vector from './Vector.js';

class Mob {
    constructor(msg, ownerId) {
        if(msg.type == MobType.PredatorMissile && window.forceCarrot) {
            msg.type = MobType.CarrotMissile;
        }
        this.id = msg.id;
        this.type = msg.type;
        this.pos = new Vector(msg.posX, msg.posY);
        this.spriteRot = 0;
        this.missile = MissileMobTypeSet[this.type];
        if (this.missile && msg.c !== Network.SERVERPACKET.MOB_UPDATE_STATIONARY) {
            this.speed = new Vector(msg.speedX, msg.speedY);
            this.accel = new Vector(msg.accelX, msg.accelY);
            this.maxSpeed = msg.maxSpeed;
            this.exhaust = config.mobs[this.type].exhaust;
            this.lastAccelX = 0;
            this.lastAccelY = 0;
            this.stationary = false;
            this.spriteRot = this.speed.angle() + Math.PI;
        } else {
            this.stationary = true;
        }
        this.sprites = {};
        this.state = {
            inactive : false,
            despawnTicker : 0,
            despawnType : 0,
            baseScale : 1,
            baseScaleShadow : 1,
            luminosity : 1
        };
        this.randomness = Tools.rand(0, 1e5);
        this.culled = false;
        this.visibility = true;
        this.alpha = 1.0;
        this.reducedFactor = false;
        this.forDeletion = false;
        this.spawnTime = game.time;
        this.lastPacket = game.timeNetwork;
        this.ownerId = ownerId;
        this.setupSprite();
    }

    setupSprite() {
        switch (this.type) {
        case MobType.Upgrade:
        case MobType.Shield:
        case MobType.Inferno:
        case MobType.MagicCrate:
            this.state.baseScale = .33;
            this.state.baseScaleShadow = 2.4 / config.shadowScaling * .33;
        }
        game.renderer.add_mob(this);
    }

    despawn(despawnType) {
        this.state.inactive = true;
        this.state.despawnTicker = 0;

        if(CrateMobTypeSet[this.type]) {
            this.state.despawnType = despawnType;
            if(despawnType == MobDespawnType.Collided &&
               this.type != MobType.Upgrade) {
                Sound.powerup(this.type, this.pos);
            }
            return;
        }

        game.renderer.despawn_mob(this);

        this.accel.x = 0,
        this.accel.y = 0,
        this.missile && Sound.updateThruster(1, this, false)
    }

    destroy(destroyMsg) {
        game.renderer.remove_mob(this);

        destroyMsg.c === Network.SERVERPACKET.MOB_DESPAWN_COORDS && (Mobs.explosion(this.pos, destroyMsg.type),
        this.missile && Sound.updateThruster(1, this, false))
    }

    network(msg, ownerId) {
        this.lastPacket = game.timeNetwork;
        if (msg.c === Network.SERVERPACKET.MOB_UPDATE) {
            this.reducedFactor = Tools.reducedFactor();
        }
        this.pos.x = msg.posX;
        this.pos.y = msg.posY;
        if (null != msg.speedX) {
            this.speed.x = msg.speedX;
            this.speed.y = msg.speedY;
        }
        if (null != msg.accelX) {
            this.accel.x = msg.accelX;
            this.accel.y = msg.accelY;
        }

        if (ownerId) {
            this.ownerId = ownerId;
            game.renderer.setTeamColourOnMissiles(this);
        }
    }

    visible(isVisible) {
        if (!(isVisible == this.visibility && isVisible != this.culled)) {
            game.renderer.mob_visibility(this, isVisible);

            this.visibility = isVisible;
        }
    }

    visibilityUpdate() {
        this.culled = !game.renderer.inScreen(this.pos, 128),
        this.visible(!this.culled)
    }

    update(e) {
        if (this.visibilityUpdate(),
        !(false !== this.reducedFactor && (e -= this.reducedFactor,
        this.reducedFactor = false,
        e <= 0))) {
            var t, n, r, i = e > .51 ? Math.round(e) : 1, o = e / i;
            for (t = 0; t < i; t++)
                if (this.stationary)
                    this.clientCalcs(o);
                else {
                    n = this.speed.x,
                    r = this.speed.y,
                    this.speed.x += this.accel.x * o,
                    this.speed.y += this.accel.y * o;
                    var s = this.speed.length();
                    s > this.maxSpeed && this.speed.multiply(this.maxSpeed / s),
                    this.state.inactive && this.speed.multiply(1 - .03 * o),
                    this.pos.x += o * n + .5 * (this.speed.x - n) * o,
                    this.pos.y += o * r + .5 * (this.speed.y - r) * o,
                    this.pos.x < -16384 && (this.pos.x += 32768),
                    this.pos.x > 16384 && (this.pos.x -= 32768),
                    this.pos.y < -8192 && (this.pos.y += 16384),
                    this.pos.y > 8192 && (this.pos.y -= 16384),
                    this.clientCalcs(o)
                }
            this.missile && !this.state.inactive && Sound.updateThruster(1, this, this.visibility)
        }
    }

    clientCalcs(e) {
        if (!this.forDeletion)
            switch (this.state.luminosity -= .075 * e,
            this.state.luminosity < 0 && (this.state.luminosity = 0),
            this.type) {
            case MobType.PredatorMissile:
            case MobType.GoliathMissile:
            case MobType.CarrotMissile:
            case MobType.MohawkMissile:
            case MobType.TornadoSingleMissile:
            case MobType.TornadoTripleMissile:
            case MobType.ProwlerMissile:
                var t = 1;
                if (this.state.inactive) {
                    if (this.state.despawnTicker += .01 * e,
                    this.state.despawnTicker > .75) {
                        var n = 1 - 4 * (this.state.despawnTicker - .75);
                        game.renderer.mob_alpha(this, n);
                        this.alpha = n;
                    }
                    if (this.state.despawnTicker > 1)
                        return void (this.forDeletion = true);
                    t = Tools.clamp(1 - this.state.despawnTicker, .3, 1)
                }
                if (!this.culled && t > .3) {
                    var tint;
                    if(this.type == MobType.CarrotMissile) {
                        // Green missile smoke for carrot.
                        tint = 0x009f00;
                    }
                    var r = this.speed.angle() + Math.PI;
                    r - this.spriteRot >= Math.PI ? this.spriteRot += 2 * Math.PI : this.spriteRot - r > Math.PI && (this.spriteRot -= 2 * Math.PI),
                    this.spriteRot = Tools.converge(this.spriteRot, r, .1 * e),
                    game.renderer.particles_missile_smoke(this, this.exhaust, t, tint)
                }
                break;
            case MobType.Upgrade:
            case MobType.Shield:
            case MobType.Inferno:
            case MobType.MagicCrate:
                if (this.state.inactive && (this.state.despawnTicker += .05 * e,
                this.state.despawnTicker > 1))
                    return void (this.forDeletion = true)
            }
    }

    updateGraphics(e) {
        game.renderer.update_mob(this, e);
    }
}

export default Mob;
