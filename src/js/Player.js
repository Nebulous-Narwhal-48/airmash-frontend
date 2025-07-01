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
        this.setupGraphics();
        if (0 == this.status) {
          Tools.decodeUpgrades(this, playerNewMsg.upgrades);
          this.updatePowerups();
        } else {
          this.hidden = true;
          if (this.me()) {
            UI.visibilityHUD(false);
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
      }

    setupGraphics(isPlaneTypeChange) {
        if (!config.ships[this.type]) return;
        var propOverrides = null;
        if(this.me()) {
            propOverrides = {
                layer: "aircraftme"
            };
        }
        this.sprites.powerup = Textures.init("powerupShield", {
            visible: false,
            alpha: .75
        });
        this.sprites.powerupCircle = Textures.init("powerupCircle", {
            visible: false,
            alpha: .75
        });
        

        const {name, graphics:{baseScale, thrusters, rotors}} = config.ships[this.type];
        this.state.baseScale = baseScale;
        this.state.nameplateDist = 60;
        this.sprites.sprite = Textures.init(`ship_${name}`, propOverrides);
        if (this.skin)
            this.changeSkin(this.skin.url, this.skin.hash);
        this.sprites.shadow = Textures.init(`ship_shadow_${name}`, {
            scale: baseScale * (2.4 / config.shadowScaling)
        });
        for (let i=0; i<thrusters.length; i++) {
            this.sprites[`thruster${i}`] = Textures.init("shipRaptorThruster");
            this.sprites[`thruster${i}Glow`] = Textures.init("thrusterGlowSmall");
            this.sprites[`thruster${i}Shadow`] = Textures.init("thrusterShadow");
        }
        for (let i=0; i<rotors.length; i++) {
            this.sprites[`rotor${i}`] = Textures.init("shipComancheRotor", propOverrides);
            this.sprites[`rotor${i}Shadow`] = Textures.init("shipComancheRotorShadow", {
                scale: 2 * baseScale * (2.4 / config.shadowScaling)
            });
        }
        
        if(! (this.reel || isPlaneTypeChange)) {
            this.setupNameplate();
            this.setupChatBubbles();
            if(this.level != null || this.bot) {
                this.setupLevelPlate();
            }
        }
        this.updateDebug();
    }

    reloadGraphics() {
        this.destroy();
        this.setupGraphics(true);
        this.sprites.powerup.visible = false;
        this.sprites.powerupCircle.visible = false;
    }

    updateDebug() {
        if (!window.DEVELOPMENT) return;
        if (!config.ships[this.type]) return;
        if(config.debug.collisions) {
            if (!this.col) {
                this.col = new PIXI.Graphics;
                for (var n of config.ships[this.type].collisions) {
                    this.col.beginFill(0xffffff, .2);
                    this.col.drawCircle(n[0], n[1], n[2]);
                    this.col.endFill();
                }
                game.graphics.layers.explosions.addChild(this.col);
            }
        } else {
            if (this.col) {
                game.graphics.layers.explosions.removeChild(this.col);
                this.col.destroy();
                this.col = null;
            }
        }
        const {graphics:{thrusters, rotors}} = config.ships[this.type];
        this.sprites.sprite.visible = !config.debug.hide_texture_player;
        this.sprites.shadow.visible = !config.debug.hide_texture_player;
        for (let i=0; i< thrusters.length; i++) {
            this.sprites[`thruster${i}`] && (this.sprites[`thruster${i}`].visible = !config.debug.hide_texture_thruster);
            this.sprites[`thruster${i}Glow`] && (this.sprites[`thruster${i}Glow`].visible = !config.debug.hide_texture_thruster);
            this.sprites[`thruster${i}Shadow`] && (this.sprites[`thruster${i}Shadow`].visible = !config.debug.hide_texture_thruster);    
        }
    }

    reteam(e) {
        this.team = e;
        if (GameType.CTF == game.gameType || game.server.config?.tdmMode || GameType.CONQUEST == game.gameType) {
            this.sprites.name.style = new PIXI.TextStyle(this.nameplateTextStyle());
            UI.changeMinimapTeam(this.id, this.team);
        } else {
            if (this.me()) {
                game.myTeam = this.team;
            }
        }
    }

    nameplateTextStyle() {
        if (GameType.CTF == game.gameType || game.server.config.tdmMode || GameType.CONQUEST == game.gameType)
            var e = 1 == this.team ? "#4076E2" : "#EA4242";
        else {
            if (this.in_my_team) {
                e = "#4076E2";
            } else if (this.in_team) {
                e = this.in_team;
            } else {
                e = this.team == game.myTeam ? "#FFFFFF" : "#FFEC52";
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

    setupNameplate() {
        var e = "";
        2 == game.gameType && (e = "  ■"),
        this.sprites.name = new PIXI.Text(this.name + e,this.nameplateTextStyle()),
        this.sprites.name.scale.set(.5, .5),
        this.sprites.flag = Textures.sprite("flag_" + this.flag),
        this.sprites.flag.scale.set(.4, .4),
        this.sprites.flag.anchor.set(.5, .5),
        this.sprites.badge = Textures.sprite("badge_gold"),
        this.sprites.badge.scale.set(.3),
        this.sprites.badge.visible = false,
        game.graphics.layers.playernames.addChild(this.sprites.badge),
        game.graphics.layers.playernames.addChild(this.sprites.flag),
        game.graphics.layers.playernames.addChild(this.sprites.name)
    }

    setupChatBubbles() {
        this.sprites.bubble = new PIXI.Container;
        this.sprites.bubbleLeft = Graphics.initSprite("chatbubbleleft", this.sprites.bubble, {
            scale: .5
        });
        this.sprites.bubbleRight = Graphics.initSprite("chatbubbleright", this.sprites.bubble, {
            scale: .5
        });
        this.sprites.bubbleCenter = Graphics.initSprite("chatbubblecenter", this.sprites.bubble, {
            scale: .5
        });
        this.sprites.bubblePoint = Graphics.initSprite("chatbubblepoint", this.sprites.bubble, {
            scale: .5
        });
        this.sprites.emote = Graphics.initSprite("emote_tf", this.sprites.bubble, {
            scale: .6,
            anchor: [.5, .5]
        });
        this.sprites.bubbleText = new PIXI.Text("a",{
            fontFamily: "MontserratWeb, Helvetica, sans-serif",
            fontSize: (12 * config.airmashRefugees.fontSizeMul) + "px",
            fill: "white"
        });
        this.sprites.bubble.addChild(this.sprites.bubbleText);
        this.sprites.bubble.visible = false;
        this.sprites.bubble.pivot.set(.5, 34);
        game.graphics.layers.bubbles.addChild(this.sprites.bubble);
    }

    visibilityUpdate(force) {
        if (!this.sprites.sprite) return;
        this.culled = !Graphics.inScreen(this.pos, 128);
        var isVisible = !(this.hidden || this.culled || this.timedout);

        if (force || this.render != isVisible) {
            this.sprites.sprite.visible = isVisible && !config.debug.hide_texture_player;
            this.sprites.shadow.visible = isVisible && !config.debug.hide_texture_player;
            this.sprites.flag.visible = isVisible;
            this.sprites.name.visible = isVisible;

            if(null != this.sprites.level) {
                this.sprites.level.visible = isVisible;
                this.sprites.levelBorder.visible = isVisible;
            }

            this.sprites.badge.visible = this.state.hasBadge && isVisible;
            this.sprites.powerup.visible = this.powerupActive && isVisible;
            this.sprites.powerupCircle.visible = this.powerupActive && isVisible;

            const {thrusters, rotors} = config.ships[this.type].graphics || {thrusters:[], rotors:[]};
            for (let i=0; i<thrusters.length; i++) {
                this.sprites[`thruster${i}`].visible = isVisible && !config.debug.hide_texture_thruster;
                this.sprites[`thruster${i}Glow`].visible = isVisible && !config.debug.hide_texture_thruster;
                this.sprites[`thruster${i}Shadow`].visible = isVisible && !config.debug.hide_texture_thruster;                
            }
            for (let i=0; i<rotors.length; i++) {
                this.sprites[`rotor${i}`].visible = isVisible;
                this.sprites[`rotor${i}Shadow`].visible = isVisible;
            }

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
        this.sprites.sprite.alpha = alpha;
        this.sprites.shadow.alpha = alpha;
        this.sprites.flag.alpha = alpha;
        this.sprites.name.alpha = alpha;
        this.sprites.badge.alpha = alpha;
        this.sprites.powerup.alpha = .75 * alpha;
        this.sprites.powerupCircle.alpha = .75 * alpha;

        if(null != this.sprites.level) {
            this.sprites.level.alpha = alpha;
            this.sprites.levelBorder.alpha = .4 * alpha;
        }

        if (config.ships[this.type]?.special === 5) {
            const {thrusters} = config.ships[this.type].graphics;
            for (let i=0; i<thrusters.length; i++) {
                this.sprites[`thruster${i}`].alpha = alpha;
                this.sprites[`thruster${i}Glow`].alpha = alpha;
            }
        }
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
                Particles.explosion(this.pos.clone(), Tools.rand(explosion.params[0], explosion.params[1]), Tools.randInt(explosion.params[2], explosion.params[3]));
                Graphics.shakeCamera(this.pos, this.me() ? 20 : 10),
                Sound.clearThruster(this.id),
                Sound.playerKill(this)
            }
        }
    }

    me() {
        return game.myID == this.id
    }

    destroy(maybeFullDestroy) {
        if (maybeFullDestroy && GameType.FFA == game.gameType) {
            // this will destroy the team if only one member remains
            this.reteam();
        }

        if (!this.sprites.sprite) return;
        
        var layer = this.me() ? game.graphics.layers.aircraftme : game.graphics.layers.aircraft;

        if (window.DEVELOPMENT && this.col) {
            game.graphics.layers.explosions.removeChild(this.col);
            this.col.destroy();
            this.col = null;
        }

        layer.removeChild(this.sprites.sprite);
        game.graphics.layers.shadows.removeChild(this.sprites.shadow);
        this.sprites.sprite.destroy();
        this.sprites.shadow.destroy();
        this.sprites.powerup.destroy();
        this.sprites.powerupCircle.destroy();

        for (let i=0; i<Infinity; i++) {
            if (!this.sprites[`thruster${i}`]) break;
            game.graphics.layers.thrusters.removeChild(this.sprites[`thruster${i}`]);
            game.graphics.layers.thrusters.removeChild(this.sprites[`thruster${i}Glow`]);
            game.graphics.layers.shadows.removeChild(this.sprites[`thruster${i}Shadow`]);
            this.sprites[`thruster${i}`]?.destroy();
            this.sprites[`thruster${i}Glow`]?.destroy();
            this.sprites[`thruster${i}Shadow`]?.destroy();
        }
        for (let i=0; i<Infinity; i++) {
            if (!this.sprites[`rotor${i}`]) break;
            layer.removeChild(this.sprites[`rotor${i}`]);
            this.sprites[`rotor${i}`]?.destroy();
            game.graphics.layers.shadows.removeChild(this.sprites[`rotor${i}Shadow`]);
            this.sprites[`rotor${i}Shadow`]?.destroy();
        }

        if(maybeFullDestroy && !this.reel) {
            game.graphics.layers.playernames.removeChild(this.sprites.badge, this.sprites.name, this.sprites.flag);
            if(null != this.sprites.level) {
                game.graphics.layers.playernames.removeChild(this.sprites.level, this.sprites.levelBorder);
                this.sprites.level.destroy();
                this.sprites.levelBorder.destroy();
            }
            game.graphics.layers.bubbles.removeChild(this.sprites.bubble);
            this.sprites.badge.destroy();
            this.sprites.name.destroy();
            this.sprites.flag.destroy();
            this.sprites.bubble.destroy({
                children: true
            });
        }
    }

    sayBubble(e) {
        this.state.bubbleTime = game.time,
        this.state.bubbleFade = 0,
        this.state.bubble || (this.state.bubble = true,
        this.state.bubbleProgress = 0,
        this.sprites.bubble.visible = this.render,
        this.sprites.bubble.alpha = 0,
        this.sprites.bubble.scale.set(0, 0)),
        this.sprites.bubble.cacheAsBitmap = false;
        var t = UI.isEmote(e.text, true);
        if (t) {
            this.sprites.bubbleText.visible = false,
            this.sprites.emote.texture = Textures.get("emote_" + t),
            this.sprites.emote.visible = true;
            var n = 26;
            this.sprites.emote.position.set(0, 0)
        } else {
            this.sprites.bubbleText.visible = true,
            this.sprites.emote.visible = false,
            this.sprites.bubbleText.text = e.text;
            n = this.sprites.bubbleText.width;
            this.sprites.bubbleText.position.set(-n / 2, -7)
        }
        this.sprites.bubbleLeft.position.set(-n / 2 - 16, -21),
        this.sprites.bubbleRight.position.set(n / 2 + 8, -21),
        this.sprites.bubbleCenter.position.set(-n / 2 - 9, -21),
        this.sprites.bubbleCenter.scale.set(n / 82 + 18 / 82, .5),
        this.sprites.bubblePoint.position.set(-9, 18),
        this.sprites.bubble.cacheAsBitmap = true,
        this.state.bubbleTextWidth = n
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
        this.setupLevelPlate();
    }

    setupLevelPlate() {
        let plateText = this.bot ? "bot" : this.level + "";
        null == this.sprites.level ? (this.sprites.level = new PIXI.Text(plateText, {
            fontFamily: "MontserratWeb, Helvetica, sans-serif",
            fontSize: (
                ((this.bot ? 24 : 28) * config.airmashRefugees.fontSizeMul) + "px"
            ),
            fill: "rgb(200, 200, 200)",
            dropShadow: true,
            dropShadowBlur: 6,
            dropShadowDistance: 0,
            padding: 4
        }),
        this.sprites.level.scale.set(.5, .5),
        this.sprites.levelBorder = Textures.sprite("levelborder"),
        this.sprites.levelBorder.alpha = .4,
        game.graphics.layers.playernames.addChild(this.sprites.levelBorder),
        game.graphics.layers.playernames.addChild(this.sprites.level)) : this.sprites.level.text = plateText,
        this.sprites.levelBorder.scale.set((this.sprites.level.width + 10) / 32, .65),
        this.sprites.level.visible = this.render,
        this.sprites.levelBorder.visible = this.render
    }

    powerup(e) {
        UI.addPowerup(e.type, e.duration)
    }

    resetPowerups() {
        this.powerupActive && (this.sprites.powerup.visible = false,
        this.sprites.powerupCircle.visible = false),
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
        this.powerups.shield && (this.sprites.powerup.texture = Textures.get("powerup_shield"),
        this.sprites.powerupCircle.tint = 16777215),
        e = true);
        this.powerups.rampage != this.powerupsShown.rampage && (this.powerupsShown.rampage = this.powerups.rampage,
        this.powerups.rampage && (this.sprites.powerup.texture = Textures.get("powerup_rampage"),
        this.sprites.powerupCircle.tint = 16712448),
        e = true);
        e && (this.powerupActive = this.powerups.shield || this.powerups.rampage,
        this.powerupActive ? (this.state.powerupFade = 0,
        this.state.powerupFadeState = 0,
        this.sprites.powerup.visible = true,
        this.sprites.powerupCircle.visible = true) : (this.powerupActive = true,
        this.state.powerupFade = 0,
        this.state.powerupFadeState = 1))
    }

    impact(e, t, n, r) {
        this.health = n,
        this.healthRegen = r,
        this.stealthed && this.unstealth(),
        200 != e && Mobs.explosion(t, e),
        this.me() && 0 == this.status && Graphics.shakeCamera(t, 8)
    }

    changeType(e) {
        this.type != e.type && (this.destroy(false),
        this.type = e.type,
        this.setupGraphics(true),
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
            UI.visibilityHUD(true);
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
        this.flag = e.flag,
        this.sprites.flag.texture = Textures.get("flag_" + e.flag)
    }

    changeBadge(e) {
        this.sprites.badge.texture = Textures.get(e)
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
        const player = this;
        player.skin = {url, hash};
        if (!config.ships[player.type] || !player.sprites.sprite) return;
        const dataURL = await Player.load_skin(player.type, url, hash);
        if (!dataURL)
            return;
    
        let layer = player.me() ? game.graphics.layers.aircraftme : game.graphics.layers.aircraft;
        layer.removeChild(player.sprites.sprite);
        
        const texture = new PIXI.Texture.fromImage(dataURL);
        let sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(...config.ships[player.type].graphics.anchor);
        layer.addChild(sprite);
        player.sprites.sprite = sprite;
    }

    updateNameplate() {
        if (!this.reel) {
            let nameFlagHalfWidth = (this.sprites.name.width + this.sprites.flag.width + 10) / 2;
            let nameplateX = this.pos.x - nameFlagHalfWidth + (this.state.hasBadge ? 12 : 0) - (this.sprites.level ? this.sprites.level.width / 2 + 8 : 0);
            let nameplateY = this.pos.y + this.state.nameplateDist * this.scale;
            this.sprites.flag.position.set(nameplateX + 15, nameplateY + 10);
            this.sprites.name.position.set(nameplateX + 40, nameplateY);
            if (this.sprites.level) {
                this.sprites.level.position.set(nameplateX + 2 * nameFlagHalfWidth + 13, nameplateY + (this.bot ? 3 : 2));
                this.sprites.levelBorder.position.set(nameplateX + 2 * nameFlagHalfWidth + 7.75, nameplateY - 0.5);
            }
            if (this.state.hasBadge) {
                this.sprites.badge.position.set(nameplateX - 28, nameplateY);
            }
        }
    }

    updateBubble() {
        this.sprites.bubble.visible = this.render,
        this.state.bubbleProgress += .015 * game.timeFactor,
        this.state.bubbleProgress >= 1 && (this.state.bubbleProgress = 1),
        game.time - this.state.bubbleTime > 4e3 ? (this.state.bubbleFade += .08 * game.timeFactor,
        this.state.bubbleFade >= 1 && (this.state.bubbleFade = 1),
        this.sprites.bubble.scale.set(1 + .2 * this.state.bubbleFade),
        this.sprites.bubble.alpha = 1 * (1 - this.state.bubbleFade),
        this.state.bubbleFade >= 1 && (this.state.bubble = false,
        this.sprites.bubble.visible = false)) : (this.sprites.bubble.scale.set(Tools.easing.outElastic(this.state.bubbleProgress, .5)),
        this.sprites.bubble.alpha = 1);
        var e = (this.state.bubbleTextWidth + game.screenX) % 2 == 0 ? .5 : 0,
            t = game.screenY % 2 == 0 ? 0 : .5,
            n = this.state.nameplateDist * this.scale;
        this.powerupActive && (n += 60),
        this.sprites.bubble.position.set(this.pos.x * game.scale + e, (this.pos.y - n) * game.scale + t)
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
            this.setupGraphics();

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
                    Particles.planeDamage(this);
                }
                if (!this.stealthed && this.health < .2) {
                    Particles.planeDamage(this);
                }
                if (this.boost) {
                    Particles.planeBoost(this, angleToDraw >= 0);
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
                            this.sprites.powerup.visible = false;
                            this.sprites.powerupCircle.visible = false;
                        }
                    }
                }
            }
        }
    }

    updateGraphics(e) {
        if (!this.sprites.sprite) return;

        var t = Tools.oscillator(0.025, 1e3, this.randomness) * this.scale,
            n = 1.5 * this.state.thrustLevel,
            r = this.rot,
            shadow_pos = Graphics.shadowCoords(this.pos);
        if (Graphics.transform(this.sprites.sprite, this.pos.x, this.pos.y, r, t * this.state.baseScale, t * this.state.baseScale),
        Graphics.transform(this.sprites.shadow, shadow_pos.x, shadow_pos.y, r, this.state.baseScale * (2.4 / config.shadowScaling) * this.scale, this.state.baseScale * (2.4 / config.shadowScaling) * this.scale),
        this.powerupActive) {
            var o = .35 * (0 == this.state.powerupFadeState ? 2 * (1 - this.state.powerupFade) + 1 : 1 - this.state.powerupFade) * Tools.oscillator(.075, 100, this.randomness),
                s = .75 * (0 == this.state.powerupFadeState ? Tools.clamp(2 * this.state.powerupFade, 0, 1) : Tools.clamp(1 - 1.3 * this.state.powerupFade, 0, 1)) * this.alpha;
            Graphics.transform(this.sprites.powerup, this.pos.x, this.pos.y - 80, 0, o, o, s),
            Graphics.transform(this.sprites.powerupCircle, this.pos.x, this.pos.y - 80, this.state.powerupAngle, 1.35 * o, 1.35 * o, s)
        }
        var a = Tools.oscillator(.1, .5, this.randomness),
            l = Math.abs(this.state.thrustLevel) < .01 ? 0 : this.state.thrustLevel / 2 + (this.state.thrustLevel > 0 ? .5 : -.5),
            u = Tools.clamp(2 * Math.abs(this.state.thrustLevel) - .1, 0, 1);

        //if (config.ships[this.type]) {  is always true if this.sprites.sprite
        {
            const {graphics:{thrusters, rotors}, special} = config.ships[this.type];
            thrusters.length > 1 && this.state.thrustLevel < 0 && (a *= .7);
            for (let i=0; i<thrusters.length; i++) {
                const {pos_angle, pos_radius, rot_factor, scale_x, scale_y, glow_pos_angle1, glow_pos_angle2, glow_pos_radius, glow_scale_x, glow_scale_y, glow_alpha_factor} = thrusters[i];
                const params = [pos_angle, pos_radius, rot_factor, scale_x, scale_y, glow_pos_angle1, glow_pos_angle2, glow_pos_radius, glow_scale_x, glow_scale_y, glow_alpha_factor];
                Graphics.transform(this.sprites[`thruster${i}`], 
                    this.pos.x + Math.sin(-r - params[0]) * (params[1] * t), 
                    this.pos.y + Math.cos(-r - params[0]) * (params[1] * t), 
                    r + params[2] * (this.state.thrustLevel > 0 ? this.state.thrustDir : 0), 
                    params[3] * a * l * this.scale, 
                    params[4] * a * l * this.scale, 
                    u * (special===5?this.alpha:1));
                Graphics.transform(this.sprites[`thruster${i}Shadow`],
                    shadow_pos.x + Math.sin(-r - params[0]) * (params[1] * t) / config.shadowScaling, 
                    shadow_pos.y + Math.cos(-r - params[0]) * (params[1] * t) / config.shadowScaling, 
                    r + params[2] * (this.state.thrustLevel > 0 ? this.state.thrustDir : 0), 
                    (params[3]+0.1) * a * l * this.scale * (4 / config.shadowScaling), 
                    params[4] * a * l * this.scale * (4 / config.shadowScaling), 
                    u * (special===5?this.alpha:1) / 2.5);
                Graphics.transform(this.sprites[`thruster${i}Glow`], 
                    this.pos.x + Math.sin(-r + params[5] - params[6] * this.state.thrustDir) * (params[7] * t), 
                    this.pos.y + Math.cos(-r + params[5] - params[6] * this.state.thrustDir) * (params[7] * t), 
                    null, 
                    params[8] * n * this.scale, 
                    params[9] * n * this.scale, 
                    params[10] * this.state.thrustLevel * (special===5?this.alpha:1));
            }

            for (let i=0; i<rotors.length; i++) {
                const {scale, alpha, shadow_scale} = rotors[i];
                const params = [scale, alpha, shadow_scale];
                Graphics.transform(this.sprites[`rotor${i}`], 
                    this.pos.x, 
                    this.pos.y, 
                    this.state.rotorDir, 
                    t * this.state.baseScale * params[0], 
                    t * this.state.baseScale * params[0], 
                    params[1]);
                Graphics.transform(this.sprites[`rotor${i}Shadow`], 
                    shadow_pos.x, 
                    shadow_pos.y, 
                    this.state.rotorDir, 
                    this.state.baseScale * (params[2] / config.shadowScaling) * this.scale * params[0], 
                    this.state.baseScale * (params[2] / config.shadowScaling) * this.scale * params[0]);
            }
        }
        
        this.updateNameplate(),
        this.state.bubble && this.updateBubble(),
        config.debug.collisions && this.col && (this.col.position.set(this.pos.x, this.pos.y),
        this.col.rotation = this.rot)
    }

    isSpectating() {        
        return this.spectate;
    }
}

export default Player;
