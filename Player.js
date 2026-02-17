import Vector from './Vector.js';

class Player {
    constructor(playerNewMsg, isFromLoginPacket) {
        this.id = playerNewMsg.id;
        this.status = playerNewMsg.status;
        this.spectate = false;
        this.level = null == playerNewMsg.level || 0 == playerNewMsg.level ? null : playerNewMsg.level;
        this.reel = 1 == playerNewMsg.reel;
        this.name = playerNewMsg.name;
        this.type = playerNewMsg.type;
        this.team = playerNewMsg.team;
        this.pos = new Vector(playerNewMsg.posX, playerNewMsg.posY);
        this.lowResPos = new Vector(playerNewMsg.posX, playerNewMsg.posY);
        this.speed = Vector.zero();
        this.speedupgrade = 0;
        this.rot = playerNewMsg.rot;
        this.flag = playerNewMsg.flag;
        this.speedLength = 0;
        this.sprites = {};
        if (game.renderer.constructor.name !== 'PIXIRenderer') {
            this.sprites.sprite = 1;
            this.sprites.powerup = 1;
            this.sprites.badge = {};
        }
        this.randomness = Tools.rand(0, 1e5);
        this.keystate = {};
        this.lastKilled = 0;
        this.health = 1;
        this.energy = 1;
        this.healthRegen = 1;
        this.energyRegen = 1;
        this.boost = false;
        this.strafe = false;
        this.flagspeed = false;
        this.stealthed = false;
        this.alpha = 1;
        this.scale = 1;
        this.powerups = {
          shield : false,
          rampage : false
        };
        this.powerupsShown = {
          shield : false,
          rampage : false
        };
        this.powerupActive = false;
        this.render = true;
        this.hidden = false;
        this.culled = false;
        this.timedout = false;
        this.reducedFactor = false;
        this.lastPacket = game.timeNetwork;
        this.state = {
          thrustLevel : 0,
          thrustDir : 0,
          rotorDir: 0,
          bubble : false,
          bubbleProgress : 0,
          bubbleFade : 0,
          bubbleTime : 0,
          bubbleTextWidth : 0,
          hasBadge : false,
          badge : 0,
          stealthLevel : 0,
          scaleLevel : 1,
          powerupAngle : 0,
          powerupFade : 0,
          powerupFadeState : 0,
          lastBounceSound : 0
        };
        this.bot = playerNewMsg.isBot;
        if (this.bot) {
            this.name = Tools.stripBotsNamePrefix(this.name);
        }
        this.name = Tools.mungeNonAscii(this.name, this.id);
        game.renderer.add_player(this, false);
        if (0 == this.status) {
          Tools.decodeUpgrades(this, playerNewMsg.upgrades);
          this.updatePowerups();
        } else {
          this.hidden = true;
          if (this.me()) {
            game.renderer.visibilityHUD(false);
          }
        }
        if (this.reel) {
          this._prevPos = null;
          this._offset = null;
        } else {
          this.visibilityUpdate();
        }
        if (!isFromLoginPacket && this.render || this.me()) {
          this.scale = 0;
          this.state.scaleLevel = 0;
        }
        if (this.me()) {
          game.myType = playerNewMsg.type;
          UI.aircraftSelected(playerNewMsg.type);
        }
        let count = 0; for (const char of this.name) { if (count >= 20) break; count++; }
        this.name_length = count;
    }

    reloadGraphics() {
        const isReload = !!this.sprites.sprite;

        game.renderer.remove_player(this, false);

        game.renderer.add_player(this, isReload);
        if (isReload)
            game.renderer.powerup_visibility(this, false);
    }

    reteam(e) {
        this.team = e;
        if (GameType.CTF == game.gameType || game.server.config?.tdmMode || GameType.CONQUEST == game.gameType) {
            game.renderer.update_nameplate(this);
            game.renderer.changeMinimapTeam(this.id, this.team);
        } else {
            if (this.me()) {
                game.myTeam = this.team;
            }
        }
    }

    visibilityUpdate(force) {
        if (!this.sprites.sprite) return;
        this.culled = !game.renderer.inScreen(this.pos, 128);
        var isVisible = !(this.hidden || this.culled || this.timedout);

        if (force || this.render != isVisible) {
            game.renderer.player_visibility(this, isVisible);

            this.render = isVisible;
            if(! isVisible) {
                Sound.clearThruster(this.id);
            }
        }
    }

    stealth(eventStealthMsg) {
        this.lastPacket = game.timeNetwork;
        this.energy = eventStealthMsg.energy;
        this.energyRegen = eventStealthMsg.energyRegen;

        if(eventStealthMsg.state) {
            this.stealthed = true;
            this.state.stealthLevel = 0;
            if(this.team != game.myTeam) {
                if(this.keystate.LEFT) {
                    delete this.keystate.LEFT;
                }
                if(this.keystate.RIGHT) {
                    delete this.keystate.RIGHT;
                }
            }
        } else {
            this.unstealth();
        }
    }

    unstealth() {
        this.stealthed = false;
        this.state.stealthLevel = 0;
        this.opacity(1);
    }

    opacity(alpha) {
        this.alpha = alpha;
        game.renderer.player_opacity(this, alpha);
    }

    kill(ev) {
        this.status = 1;
        this.spectate = !!ev.spectate;
        this.keystate = {};
        this.pos.x = ev.posX;
        this.pos.y = ev.posY;
        this.speed = Vector.zero();
        if (this.me()) { 
            UI.resetPowerups();
        }
        this.resetPowerups();
        this.hidden = true;
        this.visibilityUpdate();
        if (this.stealthed) {
            this.unstealth();
        }

        if (!this.spectate) {
            this.lastKilled = performance.now();

            if (!this.culled) {
                const {explosion} = config.ships[this.type].graphics;
                game.renderer.particles_explosion(this.pos.clone(), Tools.rand(explosion.params[0], explosion.params[1]), Tools.randInt(explosion.params[2], explosion.params[3]));
                game.renderer.shakeCamera(this.pos, this.me() ? 20 : 10),
                Sound.clearThruster(this.id),
                Sound.playerKill(this)
            }
        }
    }

    me() {
        return game.myID == this.id
    }

    destroy() {
        if (GameType.FFA == game.gameType) {
            // this will destroy the team if only one member remains
            this.reteam();
        }

        game.renderer.remove_player(this, true);
    }

    sayBubble(e) {
        this.state.bubbleTime = game.time,
        this.state.bubbleFade = 0;
        if (!this.state.bubble) {
            this.state.bubble = true;
            this.state.bubbleProgress = 0;
            var n = game.renderer.player_saybubble(this, e, true);
        } else {
            var n = game.renderer.player_saybubble(this, e, false);
        }
        this.state.bubbleTextWidth = n;
    }

    networkKey(msgTypeId, updateMsg) {
        this.lastPacket = game.timeNetwork;
        if (1 == this.status) {
            this.revive();
        }
        if (null != updateMsg.posX) {
            this.reducedFactor = Tools.reducedFactor();
            this.pos.x = updateMsg.posX;
            this.pos.y = updateMsg.posY;
            this.rot = updateMsg.rot;
            this.speed.x = updateMsg.speedX;
            this.speed.y = updateMsg.speedY;
        }
        var n = this.stealthed;
        if (null != updateMsg.keystate) {
            Tools.decodeKeystate(this, updateMsg.keystate);
        }
        if (null != updateMsg.upgrades) {
            Tools.decodeUpgrades(this, updateMsg.upgrades);
            this.updatePowerups();
        }
        if (null != updateMsg.energy) {
            this.energy = updateMsg.energy;
            this.energyRegen = updateMsg.energyRegen;
        }
        if (null != updateMsg.boost) {
            this.boost = updateMsg.boost;
        }
        if (this.team != game.myTeam && (this.stealthed || n && !this.stealthed)) {
            this.unstealth();
        }
        if (!(this.me() || !n || this.stealthed)) {
            this.unstealth();
        }
        if (updateMsg.c == Network.SERVERPACKET.EVENT_BOUNCE && game.time - this.state.lastBounceSound > 300 && config.ships[this.type]) {
            this.state.lastBounceSound = game.time;
            Sound.playerImpact(this.pos, this.type, this.speed.length() / config.ships[this.type].maxSpeed);
        }
    }

    updateLevel(packet) {
        if (this.me()) { 
            if (packet.type == 1) {
                Games.showLevelUp(packet.level);
            }
            UI.updateMyLevel(packet.level);
        }
        this.level = packet.level;
        game.renderer.setupLevelPlate(this);
    }

    powerup(e) {
        UI.addPowerup(e.type, e.duration)
    }

    resetPowerups() {
        this.powerupActive && (game.renderer.powerup_visibility(this, false)),
        this.powerups.shield = false,
        this.powerupsShown.shield = false,
        this.powerups.rampage = false,
        this.powerupsShown.rampage = false,
        this.powerupActive = false,
        this.state.powerupFade = 0,
        this.state.powerupFadeState = 0
    }

    updatePowerups() {
        if (!this.sprites.powerup) return;
        var e = false;
        this.powerups.shield != this.powerupsShown.shield && (this.powerupsShown.shield = this.powerups.shield,
        this.powerups.shield && (game.renderer.powerup(this, "powerup_shield", 16777215)),
        e = true);
        this.powerups.rampage != this.powerupsShown.rampage && (this.powerupsShown.rampage = this.powerups.rampage,
        this.powerups.rampage && (game.renderer.powerup(this, "powerup_rampage", 16712448)),
        e = true);
        e && (this.powerupActive = this.powerups.shield || this.powerups.rampage,
        this.powerupActive ? (this.state.powerupFade = 0,
        this.state.powerupFadeState = 0,
        game.renderer.powerup_visibility(this, true)) : (this.powerupActive = true,
        this.state.powerupFade = 0,
        this.state.powerupFadeState = 1))
    }

    impact(e, t, n, r) {
        this.health = n,
        this.healthRegen = r,
        this.stealthed && this.unstealth(),
        200 != e && Mobs.explosion(t, e),
        this.me() && 0 == this.status && game.renderer.shakeCamera(t, 8)
    }

    changeType(e) {
        this.type != e.type && (game.renderer.remove_player(this, false),
        this.type = e.type,
        game.renderer.add_player(this, true),
        this.visibilityUpdate(true))
    }

    respawn(e) {
        this.lastPacket = game.timeNetwork,
        this.status = 0,
        this.spectate = false,
        this.keystate = {},
        this.pos.x = e.posX,
        this.pos.y = e.posY,
        this.rot = e.rot,
        this.speed.x = 0,
        this.speed.y = 0,
        this.health = 1,
        this.energy = 1,
        this.healthRegen = 1,
        this.energyRegen = 1,
        this.boost = false,
        this.strafe = false,
        this.flagspeed = false,
        this.state.thrustLevel = 0,
        this.state.thrustDir = 0,
        this.state.rotorDir = 0,
        this.hidden = false,
        this.timedout = false,
        this.visibilityUpdate();
        if (this.me()) { 
            UI.resetPowerups(); 
        }
        Tools.decodeUpgrades(this, e.upgrades);
        this.updatePowerups();
        if (this.render || this.me()) { 
            this.scale = 0;
            this.state.scaleLevel = 0;
        }
        
        if (this.stealthed)  {
            this.unstealth();
        }
        
        if (this.me()) {
            game.myType = this.type;
            game.spectatingID = null;
            UI.aircraftSelected(this.type);
            game.renderer.visibilityHUD(true);
            UI.hideSpectator();
        }
        this.updateGraphics(1);
        Sound.playerRespawn(this);
        UI.updateGameInfo();
    }

    revive() {
        this.status = 0;
        this.spectate = false;
        this.boost = false;
        this.strafe = false;
        this.flagspeed = false;
        this.hidden = false;
        this.health = 1;
        this.energy = 1;
        this.healthRegen = 1;
        this.energyRegen = 1;
        if (this.stealthed) {
            this.unstealth();
        }
        UI.updateGameInfo();
    }

    changeFlag(e) {
        this.flag = e.flag;
        game.renderer.player_flag(this, e);
    }

    changeBadge(e) {
        game.renderer.badge(this, e);
    }

    static async fetch_skin(url) {
        try {
            console.log('fetching skin', url);
            // uses free-tier cloudflare worker to bypass CORS (please do not abuse it)
            const buffer = await fetch(`https://curly-hall-3ffc.yenel84660.workers.dev?url=${encodeURIComponent(url)}`).then(res=>res.arrayBuffer());
            const base64String = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
            const dataURL = "data:image/png;base64," + base64String;

            let {w, h} = await new Promise( (resolve, reject) => {
                const img = new Image();
                img.onload = function() {
                    resolve({w: img.width, h: img.height});
                };
                img.onerror = reject;
                img.src = dataURL;
            });

            const hashBuffer = await window.crypto.subtle.digest("SHA-1", buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");

            return { dataURL, w, h, hashHex, byteLength: buffer.byteLength };

        } catch (e) {
            console.error(e);
            return {};
        }
    }

    static async load_skin(aircraft, url, hash) {
        // const sizes = {
        //     [PlaneType.Predator]: {w: 256, h: 256},
        //     [PlaneType.Goliath]: {w: 512, h: 256},
        //     [PlaneType.Mohawk]: {w: 128, h: 256},
        //     [PlaneType.Tornado]: {w: 256, h: 256},
        //     [PlaneType.Prowler]: {w: 256, h: 256},
        // };
        const size = config.ships[aircraft].graphics.size;

        const cache_key = url;
        let cache = await caches.open('skin_cache');
        let res = await cache.match(cache_key);
        if (res) {
            const {dataURL, w, h} = await res.json();

            if (w !== size.w || h !== size.h) {
                return;
            }

            return dataURL;
        }
        if (!res) {
            const { dataURL, w, h, hashHex, byteLength } = await this.fetch_skin(url);

            if (!dataURL)
                return;

            // check hash
            if (hashHex != hash) {
                console.error(`server hash:${hash} != client hash ${hashHex}`);
                return;
            }

            if (byteLength > (config.skins.MAX_IMG_BYTES[w]||0)) {
                console.error(`Image too big: ${byteLength} > ${config.skins.MAX_IMG_BYTES[w]}`);
                return;
            }

            await cache.put(cache_key, new Response(JSON.stringify({dataURL, w, h})));

            if (w !== size.w || h !== size.h) {
                return;
            }

            return dataURL;
        }
    }

    async changeSkin(url, hash) {
        return game.renderer.changeSkin(this, url, hash);
    }

    detectTimeout() {
        if (!this.me()) {
            var e = this.timedout;
            this.timedout = !game.lagging && game.timeNetwork - this.lastPacket > 3e3,
            this.timedout && !e && (this.boost = false,
            this.strafe = false,
            this.flagspeed = false,
            this.speed = Vector.zero(),
            this.keystate = {},
            this.resetPowerups())
        }
    }

    leaveHorizon() {
        this.me() || this.timedout || (this.lastPacket = -1e4,
        this.timedout = true,
        this.boost = false,
        this.strafe = false,
        this.flagspeed = false,
        this.speed = Vector.zero(),
        this.keystate = {},
        this.resetPowerups())
    }

    update(timeFrac) {
        if(this.reel) {
            this.clientCalcs(timeFrac);
            return;
        }

        this.detectTimeout();
        this.visibilityUpdate();

        if(! this.render) {
            this.health += timeFrac * this.healthRegen;
            if(this.health >= 1) {
                this.health = 1;
            }
            return;
        }

        if (!config.ships[this.type]) 
            return;
        else if (!this.sprites.sprite) 
            game.renderer.add_player(this, false);

        if (!(false !== this.reducedFactor && (timeFrac = timeFrac - this.reducedFactor, this.reducedFactor = false, timeFrac <= 0))) {
            var roundedFrames = timeFrac > .51 ? Math.round(timeFrac) : 1;
            var perLoopEffect = timeFrac / roundedFrames;
            var twoPi = 2 * Math.PI;
            var boostMul = this.boost ? 1.5 : 1;
            for (var i = 0; i < roundedFrames; i++) {
                this.energy += perLoopEffect * this.energyRegen;
                if (this.energy >= 1) {
                    this.energy = 1;
                }
            
                this.health += perLoopEffect * this.healthRegen;
                if (this.health >= 1) {
                    this.health = 1;
                }

                var speedDeltaAngle = -999;
                if (this.strafe) {
                    if (this.keystate.LEFT) {
                        speedDeltaAngle = this.rot - .5 * Math.PI;
                    }
                    if (this.keystate.RIGHT) {
                        speedDeltaAngle = this.rot + .5 * Math.PI;
                    }
                } else {
                    if (this.keystate.LEFT) {
                        this.rot += -perLoopEffect * config.ships[this.type].turnFactor;
                    }
                    if (this.keystate.RIGHT) {
                        this.rot += perLoopEffect * config.ships[this.type].turnFactor;
                    }
                }

                var prevSpeedX = this.speed.x;
                var prevSpeedY = this.speed.y;

                if (this.keystate.UP) {
                    if (-999 == speedDeltaAngle) {
                        speedDeltaAngle = this.rot;
                    } else {
                        speedDeltaAngle = speedDeltaAngle + Math.PI * (this.keystate.RIGHT ? -.25 : .25);
                    }
                } else {
                    if (this.keystate.DOWN) {
                        if (-999 == speedDeltaAngle) {
                            speedDeltaAngle = this.rot + Math.PI;
                        } else {
                            speedDeltaAngle = speedDeltaAngle + Math.PI * (this.keystate.RIGHT ? .25 : -.25);
                        }
                    }
                }
                if (-999 !== speedDeltaAngle) {
                    this.speed.x += Math.sin(speedDeltaAngle) * config.ships[this.type].accelFactor * perLoopEffect * boostMul;
                    this.speed.y -= Math.cos(speedDeltaAngle) * config.ships[this.type].accelFactor * perLoopEffect * boostMul;
                }
                var curSpeed = this.speed.length();
                var maxSpeed = config.ships[this.type].maxSpeed * boostMul * config.upgrades.speed.factor[this.speedupgrade];
                var minSpeed = config.ships[this.type].minSpeed;
                if (this.powerups.rampage) {
                    maxSpeed = maxSpeed * .75;
                }
                if (this.flagspeed) {
                    maxSpeed = 5;
                }
                if (curSpeed > maxSpeed) {
                    this.speed.multiply(maxSpeed / curSpeed);
                } else {
                    if (this.speed.x > minSpeed || this.speed.x < -minSpeed || this.speed.y > minSpeed || this.speed.y < -minSpeed) {
                        this.speed.x *= 1 - config.ships[this.type].brakeFactor * perLoopEffect;
                        this.speed.y *= 1 - config.ships[this.type].brakeFactor * perLoopEffect;
                    } else {
                        this.speed.x = 0;
                        this.speed.y = 0;
                    }
                }
                this.pos.x += perLoopEffect * prevSpeedX + .5 * (this.speed.x - prevSpeedX) * perLoopEffect * perLoopEffect;
                this.pos.y += perLoopEffect * prevSpeedY + .5 * (this.speed.y - prevSpeedY) * perLoopEffect * perLoopEffect;
                this.clientCalcs(perLoopEffect);
            }

            this.rot = (this.rot % twoPi + twoPi) % twoPi;
            if (-1 != game.gameType) {
                if (this.pos.x < game.server.config.playerBounds.MIN_X) {
                    this.pos.x = game.server.config.playerBounds.MIN_X;
                }
                if (this.pos.x > game.server.config.playerBounds.MAX_X) {
                    this.pos.x = game.server.config.playerBounds.MAX_X;
                }
                if (this.pos.y < game.server.config.playerBounds.MIN_Y) {
                    this.pos.y = game.server.config.playerBounds.MIN_Y;
                }
                if (this.pos.y > game.server.config.playerBounds.MAX_Y) {
                    this.pos.y = game.server.config.playerBounds.MAX_Y;
                }
            } else {
                if (this.pos.x < -16384) {
                    this.pos.x += 32768;
                }
                if (this.pos.x > 16384) {
                    this.pos.x -= 32768;
                }
                if (this.pos.y < -8192) {
                    this.pos.y += 16384;
                }
                if (this.pos.y > 8192) {
                    this.pos.y -= 16384;
                }
            }
            Sound.updateThruster(0, this);
        }
    }

    clientCalcs(timeFrac) {
        const {graphics:{thrusters, rotors}, special} = config.ships[this.type] || {graphics:{thrusters:[], rotors:[]}, special:0};
        if (thrusters.length) {
            var scrollviewTransform = false;
            var angleToDraw = false;
            var t = this.boost ? 1.5 : 1;
            if (false !== (scrollviewTransform = this.keystate.LEFT ? .3 : this.keystate.RIGHT ? -.3 : 0)) {
                this.state.thrustDir = Tools.converge(this.state.thrustDir, scrollviewTransform, .1 * timeFrac);
            }
            if (false !== (angleToDraw = this.keystate.UP ? 1 : this.keystate.DOWN ? -1 : 0)) {
                this.state.thrustLevel = Tools.converge(this.state.thrustLevel, angleToDraw * t, .2 * timeFrac);
            }

        } 
        if (rotors.length) {
            this.state.rotorDir += (.2 + this.speed.length() / 50) * timeFrac;
        }

        if (!this.culled) {
            if (this.render) {
                if (!this.stealthed && this.health < .4) {
                    game.renderer.particles_plane_damage(this);
                }
                if (!this.stealthed && this.health < .2) {
                    game.renderer.particles_plane_damage(this);
                }
                if (this.boost) {
                    game.renderer.particles_plane_boost(this, angleToDraw >= 0);
                }
                if (special === 5 && this.stealthed) {
                //if (PlaneType.Prowler == this.type && this.stealthed) {
                    this.state.stealthLevel += .03 * timeFrac;
                    this.state.stealthLevel = Tools.clamp(this.state.stealthLevel, 0, this.team == game.myTeam ? .5 : 1);
                    this.opacity(1 - this.state.stealthLevel);
                }
                this.state.scaleLevel += .005 * timeFrac;
                if (this.state.scaleLevel >= 1) {
                    this.state.scaleLevel = 1;
                    this.scale = 1;
                } else {
                    this.scale = Tools.easing.outElastic(this.state.scaleLevel, .5);
                }
                if (this.powerupActive) {
                    this.state.powerupAngle += .075 * timeFrac;
                    if (0 == this.state.powerupFadeState) {
                        this.state.powerupFade += .05 * timeFrac;
                        if (this.state.powerupFade >= 1) {
                            this.state.powerupFade = 1;
                        }
                    } else {
                        this.state.powerupFade += .05 * timeFrac;
                        if (this.state.powerupFade >= 1) {
                            this.powerupActive = false;
                            game.renderer.powerup_visibility(this, false);
                        }
                    }
                }
            }
        }
    }

    updateGraphics(e) {
        const {state} = this;
        if (state.bubble) {
            state.bubbleProgress += .015 * game.timeFactor;
            state.bubbleProgress >= 1 && (state.bubbleProgress = 1);
            if (game.time - state.bubbleTime > 4e3) {
                state.bubbleFade += .08 * game.timeFactor
                state.bubbleFade >= 1 && (state.bubbleFade = 1);
            }
        }
        game.renderer.update_player(this);
        if (state.bubble) {
            if (game.time - state.bubbleTime > 4e3) {
                state.bubbleFade >= 1 && (state.bubble = false);
            }
        }
    }

    isSpectating() {
        return this.spectate;
    }
}

export default Player;
