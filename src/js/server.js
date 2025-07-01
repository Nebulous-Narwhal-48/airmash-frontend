
import { getHitboxCache, isPlayerCollide, isProjectileCollide, isRepelCollide, Collisions, Circle, Polygon } from "./collisions.js";

let KEY_NAMES, KEY_CODES, ServerPacket, mapBounds, playerBounds, MAPS, COLLISIONS_MAP_COORDS, SHIPS_SPECS, manifest;
const shipHitboxesCache = {}, projectileHitboxesCache = {}, powerupHitboxCache = {};

addEventListener('message', (e) => {
    if (e.data.init) {
        console.log('init', e.data);

        if (e.data.setParentMapId) {
          manifest.parentMapId = e.data.setParentMapId;
          server.players.forEach(({ws})=>ws.callback({data:{
            c: ServerPacket.SERVER_CUSTOM,
            type: 203,
            data: JSON.stringify({ setParentMapId: manifest.parentMapId }),
          }}));
          return;
        }

        KEY_NAMES = e.data.KEYLOOKUP || KEY_NAMES;
        KEY_CODES = e.data.KeyCodes || KEY_CODES;
        ServerPacket = e.data.ServerPacket || ServerPacket;

        setBounds(e.data.mapBounds);
        
        manifest = e.data.config.manifest;
        manifest.mapId ||= 'vanilla';
        MAPS = {[manifest.mapId]:{mountain_objects:e.data.config.walls}};
        
        if (true) {
          SHIPS_SPECS = e.data.config.ships;
          for (let i=1; i<SHIPS_SPECS.length; i++) {
            if (SHIPS_SPECS[i])
              shipHitboxesCache[i] = getHitboxCache(SHIPS_SPECS[i].collisions);
          }
          for (const missileType of Object.values(PROJECTILES_SHAPES)) {
            projectileHitboxesCache[missileType] = getHitboxCache(PROJECTILES_COLLISIONS[missileType]);
          }
          for (const powerupType in POWERUPS_COLLISIONS) {
            powerupHitboxCache[powerupType] = getHitboxCache(POWERUPS_COLLISIONS[powerupType]);
          }
        }
        if (true && server.players.length) {
          server.players.forEach(({ws, planetype})=>server.respawn(ws, SHIPS_SPECS[planetype]?planetype:1));
        }
        if (true) {
          server.command(null, "server", `map ${manifest.mapId}`);
          //setTimeout(()=>server.command(null, "server", "editor place_box 9 10 -100"), 2000)
        }

    } else if (e.data.method) {
        const {id, method, args} = e.data;
        server[method]({
          id, 
          callback: (obj)=>postMessage({id, ...obj}),
          close_callback: ()=>postMessage({id}),
        }, ...args);
    }
});

function setBounds(bounds) {
  mapBounds = bounds || mapBounds;
  if (!mapBounds) {
    mapBounds = {MIN_X: -16384, MIN_Y: -8192, MAX_X: 16384, MAX_Y: 8192};
  }
  mapBounds.MIN_X = Math.max(-16384, mapBounds.MIN_X);
  mapBounds.MIN_Y = Math.max(-8192, mapBounds.MIN_Y);
  mapBounds.MAX_X = Math.min(16384, mapBounds.MAX_X);
  mapBounds.MAX_Y = Math.min(8192, mapBounds.MAX_Y);
  playerBounds = {
    MIN_X: mapBounds.MIN_X + 32,
    MIN_Y: mapBounds.MIN_Y + 32,
    MAX_X: mapBounds.MAX_X - 32,
    MAX_Y: mapBounds.MAX_Y - 32,
  };
  COLLISIONS_MAP_COORDS = {
    MIN_X: mapBounds.MIN_X + MAP_SIZE.HALF_WIDTH,
    MIN_Y: mapBounds.MIN_Y + MAP_SIZE.HALF_HEIGHT,
    MAX_X: mapBounds.MAX_X + MAP_SIZE.HALF_WIDTH,
    MAX_Y: mapBounds.MAX_Y + MAP_SIZE.HALF_HEIGHT,
  };
}

const encodeUpgrades = (speed, shield, inferno) => {
    return (speed & 7) | (shield << 3) | (inferno << 4);
};
  
const encodeKeystate = (
    keystate,
    boost,
    strafe,
    stealthed,
    flagspeed
  ) => {
    const down = keystate.DOWN === true ? 1 : 0;
  
    return (
      0 |
      ((keystate.UP === true ? 1 : 0) << 0) |
      ((keystate.UP === true ? 0 : down) << 1) |
      ((keystate.LEFT === true ? 1 : 0) << 2) |
      ((keystate.RIGHT === true ? 1 : 0) << 3) |
      ((boost === true ? 1 : 0) << 4) |
      ((strafe === true ? 1 : 0) << 5) |
      ((stealthed === true ? 1 : 0) << 6) |
      ((flagspeed === true ? 1 : 0) << 7)
    );
};

const getRandomInt = (min, max) => {
  const intMin = Math.ceil(min);
  return Math.floor(Math.random() * (Math.floor(max) - intMin + 1)) + intMin;
};

const PI_X2 = 2 * Math.PI;
const MS_PER_SEC = 1e3;

const PLAYERS_ALIVE_STATUSES = {
  ALIVE: 0,
  DEAD: 1,
  SPECTATE: 1,
  DEFAULT: 0,
};

const PLAYERS_DEATH_INACTIVITY_MS = 3 * MS_PER_SEC;
const PLAYERS_RESPAWN_INACTIVITY_MS = 2 * MS_PER_SEC;

const PLAYERS_ENERGY = {
  MIN: 0,
  MAX: 1,
  DEFAULT: 1,
};

const PLAYERS_HEALTH = {
  MIN: 0,
  MAX: 1,
  DEFAULT: 1,
};

const SPECIAL_ABILITIES = {
    BOOST: 1,
    REPEL: 2,
    STRAFE: 3,
    FIRE: 4,
    STEALTH: 5,
};

const SHIPS_FIRE_MODES = {
    FIRE: 'fire',
    INFERNO: 'infernoFire',
};

const SHIPS_FIRE_TYPES = {
    DEFAULT: 'default',
    SPECIAL: 'special',
};

const MOB_TYPES = {
    PLAYER: 0,
    PREDATOR_MISSILE: 1,
    GOLIATH_MISSILE: 2,
    COPTER_MISSILE: 3,
    TORNADO_MISSILE: 5,
    TORNADO_SMALL_MISSILE: 6,
    PROWLER_MISSILE: 7,
    UPGRADE: 4,
    SHIELD: 8,
    INFERNO: 9,
    FIREWALL: 200
};

const PROJECTILES_SHAPES = {
    REGULAR: 1,
    FAT: 2,
    SMALL: 3,
};

const PROJECTILES_COLLISIONS = {
  [PROJECTILES_SHAPES.REGULAR]: [
    [0, 3, 3],
    [0, 9, 3],
    [0, 15, 3],
  ],
  [PROJECTILES_SHAPES.FAT]: [
    [0, 4, 4],
    [0, 12, 4],
    [0, 20, 4],
  ],
  [PROJECTILES_SHAPES.SMALL]: [
    [0, 2, 2],
    [0, 6, 2],
    [0, 10, 2],
  ],
};

const PROJECTILES_SPECS = {
    [MOB_TYPES.PREDATOR_MISSILE]: {
      maxSpeed: 9,
      baseSpeed: 4.05,
  
      speedFactor: 0.3,
      infernoSpeedFactor: 1,
  
      accel: 0.105,
  
      /**
       * Basic damage for speed in range [baseSpeed, maxSpeed].
       */
      damage: 0.4,
      infernoDamageFactor: 1,
  
      distance: 1104,
  
      shape: PROJECTILES_SHAPES.REGULAR,
  
      repelEnergy: 197,
    },
  
    [MOB_TYPES.GOLIATH_MISSILE]: {
      maxSpeed: 6,
      baseSpeed: 2.1,
  
      speedFactor: 0.3,
      infernoSpeedFactor: 1,
  
      accel: 0.0375,
  
      damage: 1.2,
      infernoDamageFactor: 1,
  
      distance: 1076,
  
      shape: PROJECTILES_SHAPES.FAT,
  
      repelEnergy: 260,
    },
  
    [MOB_TYPES.COPTER_MISSILE]: {
      maxSpeed: 9,
      baseSpeed: 5.7,
  
      speedFactor: 0.3,
      infernoSpeedFactor: 1,
  
      accel: 0.14,
  
      damage: 0.2,
      infernoDamageFactor: 1,
  
      distance: 1161,
  
      shape: PROJECTILES_SHAPES.SMALL,
  
      repelEnergy: 155,
    },
  
    [MOB_TYPES.TORNADO_MISSILE]: {
      maxSpeed: 7,
      baseSpeed: 3.5,
  
      speedFactor: 0.3,
      infernoSpeedFactor: 1,
  
      accel: 0.0875,
  
      damage: 0.42,
      infernoDamageFactor: 1,
  
      distance: 997,
  
      shape: PROJECTILES_SHAPES.REGULAR,
  
      repelEnergy: 186,
    },
  
    [MOB_TYPES.TORNADO_SMALL_MISSILE]: {
      maxSpeed: 7,
      baseSpeed: 3.5,
  
      speedFactor: 0.3,
      infernoSpeedFactor: 1,
  
      accel: 0.0875,
  
      damage: 0.3,
      infernoDamageFactor: 1,
  
      distance: 581,
  
      shape: PROJECTILES_SHAPES.REGULAR,
  
      repelEnergy: 145,
    },
  
    [MOB_TYPES.PROWLER_MISSILE]: {
      maxSpeed: 7,
      baseSpeed: 2.8,
  
      speedFactor: 0.3,
      infernoSpeedFactor: 1,
  
      accel: 0.07,
  
      damage: 0.45,
      infernoDamageFactor: 1,
  
      distance: 819,
  
      shape: PROJECTILES_SHAPES.REGULAR,
  
      repelEnergy: 168,
    },
};

const POWERUPS_COLLISIONS = {
  [MOB_TYPES.UPGRADE]: [[0, 0, 24]],
  [MOB_TYPES.INFERNO]: [[0, 0, 24]],
  [MOB_TYPES.SHIELD]: [[0, 0, 24]],
};
const POWERUPS_DEFAULT_DURATION_MS = 10 * MS_PER_SEC;

const REPEL_COLLISIONS = [[0, 0, 226]];
const REPEL_PLAYER_MIN_DISTANCE = 88;
const REPEL_PLAYER_MAX_DISTANCE = 180;
const REPEL_PROJECTILE_MIN_DISTANCE = 150;
const REPEL_PROJECTILE_MAX_DISTANCE = 220;
const REPEL_DOUBLE_DAMAGE_RADIUS = 90;

/**
 * At what distance after repel double damage persists.
 */
export const REPEL_DOUBLE_DAMAGE_DISTANCE_ACTIVE = 50;

const UPGRADES_SPECS = {
    SPEED: {
      cost: [0, 1, 1, 1, 1, 1],
      factor: [1, 1.05, 1.1, 1.15, 1.2, 1.25],
    },
    DEFENSE: {
      cost: [0, 1, 1, 1, 1, 1],
      factor: [1, 1.05, 1.1, 1.15, 1.2, 1.25],
    },
    ENERGY: {
      cost: [0, 1, 1, 1, 1, 1],
      factor: [1, 1.05, 1.1, 1.15, 1.2, 1.25],
    },
    MISSILE: {
      cost: [0, 1, 1, 1, 1, 1],
      factor: [1, 1.05, 1.1, 1.15, 1.2, 1.25],
    },
};

const MOB_DESPAWN_TYPES = {
    EXPIRED: 0,
    PICKUP: 1
};

const MAP_SIZE = {
  WIDTH: 32768,
  HEIGHT: 16384,

  HALF_WIDTH: 32768 / 2,
  HALF_HEIGHT: 16384 / 2,
};

const COLLISIONS_OBJECT_TYPES = {
  FLAGZONE: 1,
  FLAG: 2,
  SHIELD: 3,
  PROJECTILE: 4,
  INFERNO: 5,
  UPGRADE: 6,
  MOUNTAIN: 7,
  REPEL: 8,
  PLAYER: 9,
  VIEWPORT: 10,
  FIREWALL: 11,
};

const SERVER_BOUNCE_DELAY_MS = Math.ceil((1000 / 60) * 2);
const SERVER_BOUNCE_MIN_SPEED = 1;

const MAX_UINT16 = (1 << 16) - 1;
const SERVER_MIN_SERVICE_MOB_ID = 64;
const SERVER_MIN_MOUNTAIN_MOB_ID = 128;
const SERVER_MIN_MOB_ID = 1024;
const SERVER_MAX_MOB_ID = MAX_UINT16 - 128;

const SERVER_MAX_VIEWPORT_RATIO = 5;

const PLAYERS_BROADCAST_UPDATE_INTERVAL_MS = 2.9 * MS_PER_SEC
const CONNECTIONS_PACKET_ACK_TIMEOUT_MS = 10 * MS_PER_SEC;
const CONNECTIONS_PACKET_PING_INTERVAL_MS = 5 * MS_PER_SEC;

const GameType = {
  FFA: 1,
  CTF: 2,
  BTR: 3,
  CONQUEST: 5,
  EDITOR: 6,
};
const viewport_enabled = false;

class Server {
    counter = 1
    skippedFrames = 0
    startTime = 0
    now = null
    players = []
    projectiles = new Set()
    boxes = []
    storage = {
        nextMobId: SERVER_MIN_MOB_ID,
        nextMountainMobId: SERVER_MIN_MOUNTAIN_MOB_ID,
        mobIdList: new Set(),
        projectileIdList: new Set(),
        mobList: new Map(),
        broadcast: new Map(),
    }
    detector = new Collisions();
    start_mountain_id = 0
    end_mountain_id = 0
    game_mode_id = GameType.EDITOR

    #addCollisionBody(body) {
      //console.log('addCollisionBody', body)
      this.detector.insert(body);
    }

    #removeCollisionBody(body) {
      this.detector.remove(body);
    }

    #detectCollisions() {
      this.detector.update();

      /**
       * Update viewports (on player's screen objects) and fill
       * broadcast lists.
       */  
      const addViewer = (storage, mobId, viewer) => {
        if (storage.has(mobId)) {
          storage.get(mobId).add(viewer);
        } else {
          storage.set(mobId, new Set([viewer]));
        }
      };
      let projectiles = this.projectiles;
      if (viewport_enabled) {
        projectiles = new Set();
        const broadcast = new Map();
        for (const player of this.players) {
          const viewport = player.viewport;
          viewport.leaved = new Set(viewport.current);
          viewport.current.clear();

          /**
           * Player always sees itself.
           */
          addViewer(broadcast, playerId, viewport.connectionId);

          /**
           * Potential collisions.
           * Only players, projectiles and boxes can get into this list.
           */
          const mobs = viewport.body.viewportPotentials();

          for (let index = 0; index < mobs.length; index += 1) {
            viewport.current.add(mobs[index]);

            /**
             * Mark the player as a viewer of the mob.
             */
            addViewer(broadcast, mobs[index], player);

            /**
             * Collect projectile ids. It will need later
             * to not to check each projectile.
             */
            // if (mobs[index].isProjectile) {
            //   projectiles.add(mobs[index].id);
            // }   
            
            if (viewport.leaved.has(mobs[index])) {
              // A mob is still visible, remove it from leaved.
              viewport.leaved.delete(mobs[index]);
            } else {
              // mob entered the viewport
              if (mobs[index].isBox) {
                throw "todo";
              }
              if (mobs[index].isProjectile) {
                //this.delay(BROADCAST_MOB_UPDATE, mobs[index].id, playerId);
                // this.emit(
                //   CONNECTIONS_SEND_PACKETS,
                //   {
                //     c: SERVER_PACKETS.MOB_UPDATE,
                //     clock: this.helpers.clock(),
                //     id: projectileId,
                //     type: projectile.mobtype.current,
                //     posX: projectile.position.x,
                //     posY: projectile.position.y,
                //     speedX: projectile.velocity.x,
                //     speedY: projectile.velocity.y,
                //     accelX: projectile.acceleration.x,
                //     accelY: projectile.acceleration.y,
                //     maxSpeed: projectile.velocity.max,
                //     ownerId: projectile.owner.current,
                //   } as ServerPackets.MobUpdate,
                //   recipients
                // );       
                throw "todo";
                const server_msg = {
                  c: ServerPacket.EVENT_BOUNCE,
                  clock: performance.now()*100,

                };
                player.ws.callback({data:server_msg});                       
              } else {
                //this.delay(BROADCAST_PLAYER_UPDATE, mobs[index].id, playerId);
                this.#broadcastPlayerUpdate(mobs[index], player);

                // if (this.storage.playerIdSayBroadcastList.has(mobs[index].id)) {
                //   this.emit(BROADCAST_CHAT_SAY_REPEAT, mobs[index].id, playerId);
                // }
              }
            }
          }

          /**
           * Now in `viewport.leaved` are all the mobs, which were visible
           * to the player on the previous tick, but not on this tick.
           */
          if (viewport.leaved.size !== 0) {
            this.delay(RESPONSE_EVENT_LEAVE_HORIZON, viewport.connectionId, viewport.leaved);
          }
        }
        this.storage.broadcast = broadcast;
      } else {
        const broadcast = new Map();
        for (const player of this.players) {
          broadcast.set(player, [...this.players]);
        }
        for (const projectile of this.projectiles) {
          broadcast.set(projectile, [...this.players]);
        }
        for (const box of this.boxes) {
          broadcast.set(box, [...this.players]);
        }
        this.storage.broadcast = broadcast;
      }

      
      /**
       * Despawn outdated boxes.
       */
      //...
      
      /**
       * Broadcast boxes update events.
       */
      //...

      //this.emitDelayed();
      
      /**
       * Players collisions.
       */
      {
        const delayed_score_update = [];
        const delayed_box_picked = [];
        for (const player of this.players) {
          if (player.status != PLAYERS_ALIVE_STATUSES.ALIVE)
            continue;

          /**
           * Handle repel special.
           */
          if (player.planestate.repel) {
            const repel = player.repel;
            const collisions = repel.hitbox.body.repelPotentials();
            const repelProjectiles = [];
            const repelPlayers = [];
  
            for (let ci = 0; ci < collisions.length; ci += 1) {
              const id = collisions[ci].id;
              const mob = collisions[ci].type === COLLISIONS_OBJECT_TYPES.PLAYER ? id : this.storage.mobList.get(id);
  
              if (isRepelCollide(repel, mob)) {
                if (collisions[ci].type === COLLISIONS_OBJECT_TYPES.PLAYER) {
                  repelPlayers.push(mob);
                } else {
                  repelProjectiles.push(mob);
                }
              }
            }

            // this.emit(PLAYERS_REPEL_MOBS, player, repelPlayers, repelProjectiles);
            // this.delay(BROADCAST_EVENT_REPEL, player.id.current, repelPlayers, repelProjectiles);
            this.#repelMobs(player, repelPlayers, repelProjectiles);

            const players = repelPlayers.map(x=>({
              id: x.id,
              posX: x.position.x,
              posY: x.position.y,
              rot: x.rotation.current,
              speedX: x.velocity.x,
              speedY: x.velocity.y,
              energy: x.energy.current,
              energyRegen: x.energy.regen,
              playerHealth: x.health.current,
              playerHealthRegen: x.health.regen,              
            }));
            const projectiles = repelProjectiles.map(x=>({
              id: x.id,
              type: x.mobtype,
              posX: x.position.x,
              posY: x.position.y,
              speedX: x.velocity.x,
              speedY: x.velocity.y,
              accelX: x.acceleration.x,
              accelY: x.acceleration.y,
              maxSpeed: x.velocity.max,   
            }));
            const server_msg = {
              c: ServerPacket.EVENT_REPEL,
              clock: performance.now()*100,
              id: player.id,
              posX: player.position.x,
              posY: player.position.y,
              rot: player.rotation.current,
              speedX: player.velocity.x,
              speedY: player.velocity.y,
              energy: player.energy.current,
              energyRegen: player.energy.regen,
              players,
              mobs: projectiles,      
            };
            this.storage.broadcast.get(player).forEach(({ws})=>ws.callback({data:server_msg}));
          }


          /**
           * Handle player collisions.
           */
          const collisions = player.hitbox.body.playerPotentials();
          for (let ci = 0; ci < collisions.length; ci += 1) {
            const id = collisions[ci].id;
            const type = collisions[ci].type;
            const mob = collisions[ci].isBox ? collisions[ci].id : this.storage.mobList.get(id);
            if (isPlayerCollide(player, mob)) {
              /**
               * CTF flag capture zones.
               */    
              //...    
              
              /**
               * CTF flags.
               */
              //...

              /**
               * Mountains.
               */
              if (
                type === COLLISIONS_OBJECT_TYPES.MOUNTAIN &&
                player.times.lastBounce < this.now - SERVER_BOUNCE_DELAY_MS
              ) {
                const hitbox = collisions[ci];

                //this.emit(PLAYERS_BOUNCE, player.id.current, hitbox.x, hitbox.y, hitbox.radius);
                this.#bouncePlayer(player, hitbox.x, hitbox.y, hitbox.radius);
                //this.delay(BROADCAST_EVENT_BOUNCE, player.id.current);
                player.delayed.BROADCAST_EVENT_BOUNCE = true;
                continue;
              }
              
              /**
               * Boxes. (powerup,upgrade)
               */
              if (collisions[ci].isBox && !collisions[ci].picked) {
                collisions[ci].picked = true;
                delayed_box_picked.push([collisions[ci], player]);
              }

              /**
               * Projectiles.
               */

              if (collisions[ci].isProjectile && projectiles.has(mob)) {
                if (player.health.current === PLAYERS_HEALTH.MIN) {
                  break;
                }
                projectiles.delete(mob);

                //this.emit(PLAYERS_HIT, player.id.current, id);
                //this.delay(BROADCAST_PLAYER_HIT, id, [player.id.current]);
                //this.delay(PROJECTILES_DELETE, id);
                this.#hitPlayer(player, mob);
                player.delayed.BROADCAST_PLAYER_HIT = mob;
                this.#deleteProjectile(mob);

                if (player.health.current === PLAYERS_HEALTH.MIN) {
                  //this.emit(PLAYERS_KILL, player.id.current, id);
                  this.#killPlayer(player, mob);
                  // this.storage.playerIdSayBroadcastList.delete(victimId); //say (\s)
                  // if (isUpgradesLost) {
                  //   this.delay(RESPONSE_PLAYER_UPGRADE, victimId, UPGRADES_ACTION_TYPE.LOST);
                  // }
                  // this.delay(BROADCAST_PLAYER_KILL, victimId, killerId, victim.position.x, victim.position.y);
                  // this.delay(PLAYERS_KILLED, victimId, killerId, projectileId);
                  // this.delay(PLAYERS_ALIVE_UPDATE);
                  player.delayed.BROADCAST_PLAYER_KILL = mob.owner;

                  // if (!player.delayed.RESPONSE_SCORE_UPDATE) {
                  //   player.delayed.RESPONSE_SCORE_UPDATE = true;
                  //   this.delay(RESPONSE_SCORE_UPDATE, player.id.current);
                  // }
                  player.delayed.RESPONSE_SCORE_UPDATE = true;
  
                  // const projectile = mob;
                  // if (this.storage.playerList.has(projectile.owner.current)) {
                  //   const enemy = this.storage.playerList.get(projectile.owner.current);
  
                  //   if (!enemy.delayed.RESPONSE_SCORE_UPDATE) {
                  //     enemy.delayed.RESPONSE_SCORE_UPDATE = true;
                  //     this.delay(RESPONSE_SCORE_UPDATE, projectile.owner.current);
                  //   }
                  // }
                  const enemy = mob.owner;
                  if (!enemy.delayed.RESPONSE_SCORE_UPDATE) {
                    enemy.delayed.RESPONSE_SCORE_UPDATE = true;
                    delayed_score_update.push(enemy);
                  }

                  if (!viewport_enabled) {
                    // this.delay(RESPONSE_EVENT_LEAVE_HORIZON, viewport.connectionId, viewport.leaved);
                    this.players.forEach(x=>{
                      if (x.ws != player.ws) {
                        x.ws.callback({data:{
                          c: ServerPacket.EVENT_LEAVE_HORIZON,
                          id: player.id,
                          type: 0, //LEAVE_HORIZON_TYPES.PLAYER
                        }});
                      }
                    });
                  }

                  break;
                }
              }
            }
          }

          if (player.delayed.BROADCAST_PLAYER_HIT) {
            //todo: coalesce projectile hitting multiple players
            const projectile = player.delayed.BROADCAST_PLAYER_HIT;
            const server_msg = {
              c: ServerPacket.PLAYER_HIT,
              id: projectile.id,
              type: projectile.mobtype,
              posX: projectile.position.x,
              posY: projectile.position.y,
              owner: projectile.owner.id,
              players: [{
                id: player.id,
                health: player.health.current,
                healthRegen: SHIPS_SPECS[player.planetype].healthRegen,
              }]
            };
            this.storage.broadcast.get(projectile).forEach(({ws})=>ws.callback({data:server_msg}));
            player.delayed.BROADCAST_PLAYER_HIT = null;
          }

          if (player.delayed.BROADCAST_PLAYER_KILL) {
            const killer = player.delayed.BROADCAST_PLAYER_KILL;
            this.players.forEach(({ws})=>ws.callback({data:{
              c: ServerPacket.PLAYER_KILL,
              id: player.id,
              killer: killer.id,
              posX: player.position.x,
              posY: player.position.y,
            }}));
            player.delayed.BROADCAST_PLAYER_KILL = null;
          }

          if (player.delayed.RESPONSE_SCORE_UPDATE) {
            this.#sendScoreUpdate(player);
            player.delayed.RESPONSE_SCORE_UPDATE = false;
          }

          if (player.delayed.BROADCAST_EVENT_BOUNCE) {
            player.delayed.BROADCAST_EVENT_BOUNCE = false;
            const server_msg = {
              c: ServerPacket.EVENT_BOUNCE,
              clock: performance.now()*100,
              id: player.id,
              keystate: encodeKeystate(
                player.keystate,
                player.planestate.boost,
                player.planestate.strafe,
                player.planestate.stealthed,
                player.planestate.flagspeed
              ),
              posX: player.position.x,
              posY: player.position.y,
              rot: player.rotation.current,
              speedX: player.velocity.x,
              speedY: player.velocity.y,
            };
            this.storage.broadcast.get(player).filter(x=>{
              return x==player || !player.planestate.stealthed || (player.planestate.stealthed && x.team==player.team);
            }).forEach(({ws})=>ws.callback({data:server_msg})); 
          }
        }

        //this.emitDelayed();
        for (const [body, player] of delayed_box_picked) {
          this.#removeCollisionBody(body);
          // this.emit(BROADCAST_MOB_DESPAWN, mobId, MOB_DESPAWN_TYPES.PICKUP, pickupPlayerId);
          // this.emit(BROADCAST_MOB_DESPAWN, mobId, MOB_DESPAWN_TYPES.EXPIRED, pickupPlayerId);
          const mob = body.id;
          player.ws.callback({data:{
            c: ServerPacket.MOB_DESPAWN,
            id: mob.id,
            type: 1,//PICKUP
          }});
          this.storage.broadcast.get(mob).filter(x=>x!=player).forEach(({ws})=>ws.callback({data:{
            c: ServerPacket.MOB_DESPAWN,
            id: mob.id,
            type: 0,//EXPIRED
          }}));

          if (body.type === COLLISIONS_OBJECT_TYPES.SHIELD || body.type === COLLISIONS_OBJECT_TYPES.INFERNO) {
            player.shield.current = false;
            player.shield.endTime = 0;
            player.inferno.current = false;
            player.inferno.endTime = 0;
            if (body.type === COLLISIONS_OBJECT_TYPES.SHIELD) {
              player.shield.current = true;
              player.shield.endTime = Date.now() + POWERUPS_DEFAULT_DURATION_MS;
            } else {
              player.inferno.current = true;
              player.inferno.endTime = Date.now() + POWERUPS_DEFAULT_DURATION_MS;
            }
            // this.emit(RESPONSE_PLAYER_POWERUP, playerConnectionId, type, duration);
            // this.emit(BROADCAST_PLAYER_UPDATE, playerId);
            player.ws.callback({data:{
              c: ServerPacket.PLAYER_POWERUP,
              type: COLLISIONS_OBJECT_TYPES.SHIELD ? 1 : 2,
              duration: POWERUPS_DEFAULT_DURATION_MS
            }});
            this.#broadcastPlayerUpdate(player);
          }

          this.boxes.splice(this.boxes.indexOf(mob), 1);
        }
        for (const player of delayed_score_update) {
          this.#sendScoreUpdate(player);
          player.delayed.RESPONSE_SCORE_UPDATE = false;
        }
      }

      /**
       * Actually all the projectiles should be checked,
       * but with a large scale factor limit (like default 5500)
       * it doesn't matter.
       *
       * If you use a small SF limit, you need to change this code,
       * otherwise you will get projectiles sometimes fly through mountains.
       */      
      {
        for (const projectile of projectiles) {
          const collisions = projectile.hitbox.body.projectilePotentials();
          for (let ci = 0; ci < collisions.length; ci += 1) {
            const mountain = this.storage.mobList.get(collisions[ci].id);
            if (isProjectileCollide(projectile, mountain)) {
              // this.emit(BROADCAST_MOB_DESPAWN_COORDS, projectileId);
              // this.emit(PROJECTILES_DELETE, projectileId);
              const server_msg = {
                c: ServerPacket.MOB_DESPAWN_COORDS,
                id: projectile.id,
                type: projectile.mobtype,
                posX: projectile.position.x,
                posY: projectile.position.y,
              };
              this.storage.broadcast.get(projectile).forEach(({ws})=>ws.callback({data:server_msg}));

              this.#deleteProjectile(projectile);
              break;
            }
          }
        }
      }
    }

    #killPlayer(player, projectile) {
      const victim = player;
      const killTime = Date.now();
      
      /**
       * Kill assists processing.
       */
      //...

      /**
       * Update killer stats.
       */
      //...

      /**
       * Update aggressors stats.
       */
      //...

      /**
       * Tracking victim deaths and score.
       */
      victim.status = PLAYERS_ALIVE_STATUSES.DEAD;
      victim.times.lastDeath = killTime;
      //...

      /**
       * Victim upgrades reset.
       * 50% to save an extra upgrade.
       */     
      //... 

      /**
       * Drop an upgrade.
       *
       * The chance to drop increases with victim upgrades amount.
       * The maximum increase at a value greater than 99.
       */
      //...

      /**
       * CTF stats & event.
       */
      //...

      /**
       * Delay respawn.
       */
      // moved to #updatePlayers

      /**
       * Move player hitbox outside of the map.
       */  
      victim.hitbox.body.x = COLLISIONS_MAP_COORDS.MAX_X + 1000;
      victim.hitbox.body.y = COLLISIONS_MAP_COORDS.MAX_Y + 1000;  
    }

    #hitPlayer(player, projectile) {
      // if (!this.storage.gameEntity.match.isActive) {
      //   return;
      // }
      const now = Date.now();
      const victim = player;
      let damage;
      let aggressorId = 0;

      // if (victim.planestate.stealthed) {
      //   victim.planestate.stealthed = false;
      //   victim.times.lastStealth = now;

      //   this.delay(BROADCAST_EVENT_STEALTH, victim.id.current);
      //   this.delay(BROADCAST_PLAYER_UPDATE, victim.id.current);
      // }

      if (projectile.id === 0) {
        /**
         * Projectile zero is the BTR firewall
         */
        //damage = firewallDamage;
      } else {
        // if (victim.shield.current) {
        //   return;
        // }

        // aggressorId = projectile.owner.current;
        // victim.times.lastHit = now;
        // victim.damage.hitsReceived += 1;
        damage = PROJECTILES_SPECS[projectile.mobtype].damage;

        /**
         * Extra damage by repel.
         */
        // if (projectile.damage.double) {
        //   damage *= 2;
        // }

        /**
         * Tracking projectile owner damage.
         */
        // if (this.helpers.isPlayerConnected(projectile.owner.current)) {
        //   const owner = this.storage.playerList.get(projectile.owner.current);
        //   const trackingDamage = Math.round(
        //     PROJECTILES_SPECS[projectile.mobtype.current].damage * 100
        //   );

        //   owner.damage.current += trackingDamage;
        //   owner.damage.hits += 1;

        //   if (this.storage.botIdList.has(victimId)) {
        //     owner.damage.bots += trackingDamage;
        //     owner.damage.hitsToBots += 1;
        //   }

        //   if (this.storage.botIdList.has(projectile.owner.current)) {
        //     victim.damage.hitsByBots += 1;
        //   }
        // }
      }

      /**
       * Health value refers to Goliath health 1 (max among the airplanes).
       * Goliath = 1 / 1 = 1;
       * Predator = 1 / 2 = 0.5;
       * etc.
       */
      const fullAirplaneHealth = (1 / SHIPS_SPECS[victim.planetype].damageFactor) *
        UPGRADES_SPECS.DEFENSE.factor[victim.upgrades.defense];

      victim.health.current = fullAirplaneHealth * victim.health.current - damage;

      // if (this.config.killAssists) {
      //   victim.damage.takenTraking.push(aggressorId, damage / fullAirplaneHealth);
  
      //   /**
      //    * Limit records.
      //    */
      //   if (victim.damage.takenTraking.length > 30) {
      //     victim.damage.takenTraking.splice(0, 2);
      //   }
      // }
  
      if (victim.health.current <= PLAYERS_HEALTH.MIN) {
        // if (this.config.killAssists) {
        //   /**
        //    * Subtract extra damage from the last record.
        //    */
        //   victim.damage.takenTraking[victim.damage.takenTraking.length - 1] +=
        //     victim.health.current / fullAirplaneHealth;
        // }
  
        /**
         * Player is dead.
         */
        victim.health.current = PLAYERS_HEALTH.MIN;
      } else {
        /**
         * % of the full health.
         */
        victim.health.current /= fullAirplaneHealth;
      }
    }
    
    #bouncePlayer(player, mountainX, mountainY) {
      const diffX = player.position.x + MAP_SIZE.HALF_WIDTH - mountainX;
      const diffY = player.position.y + MAP_SIZE.HALF_HEIGHT - mountainY;
      const angle = Math.atan2(diffY, diffX);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const now = Date.now();
      const timeDiff = now - player.times.lastBounce;
  
      player.times.lastBounce = now;
  
      {
        const velX = player.velocity.x;
        const velY = player.velocity.y;
        const bounceAngle = -Math.atan2(velY, velX);
        const bounceAngleSin = Math.sin(bounceAngle);
        const bounceAngleCos = Math.cos(bounceAngle);
  
        player.velocity.x = velX * bounceAngleCos - velY * bounceAngleSin;
        player.velocity.y = velX * bounceAngleSin + velY * bounceAngleCos;
      }
  
      const mul = SERVER_BOUNCE_DELAY_MS / (timeDiff === 0 ? SERVER_BOUNCE_DELAY_MS : timeDiff) / 3;
  
      if (Math.hypot(player.velocity.x, player.velocity.y) < SERVER_BOUNCE_MIN_SPEED) {
        player.velocity.x =
          (SERVER_BOUNCE_MIN_SPEED + mul) * cos - sin * (SERVER_BOUNCE_MIN_SPEED + mul);
        player.velocity.y =
          (SERVER_BOUNCE_MIN_SPEED + mul) * sin + cos * (SERVER_BOUNCE_MIN_SPEED + mul);
        player.velocity.isMin = false;
      } else {
        const velX = player.velocity.x;
        const velY = player.velocity.y;
  
        player.velocity.x = velX * cos - velY * sin + sin * mul;
        player.velocity.y = velX * sin + velY * cos - cos * mul;
      }     
    }

    #repelMobs(player, players, projectiles) {
      const now = Date.now();

      /**
       * Repel players.
       */
      for (let index = 0; index < players.length; index += 1) {
        const victim = players[index];
        const distance = Math.hypot(
          victim.position.x - player.position.x,
          victim.position.y - player.position.y
        );
        const { maxSpeed, repelEnergy } = SHIPS_SPECS[victim.planetype];
        let repelFactor = 1;
  
        if (distance > REPEL_PLAYER_MAX_DISTANCE) {
          repelFactor = 0;
        } else if (distance <= REPEL_PLAYER_MIN_DISTANCE) {
          repelFactor = 1;
        } else {
          const repelAirplaneEnergy = 2.48 * distance * distance - 884 * distance + 80482;
          repelFactor = repelAirplaneEnergy / repelEnergy;
  
          if (repelFactor > 1) {
            repelFactor = 1;
          }
        }
  
        if (repelFactor === 0) {
          continue;
        }
  
        victim._repel = true;
        victim.delayed.BROADCAST_PLAYER_UPDATE = true;
  
        const diffX = victim.position.x - player.position.x;
        const diffY = victim.position.y - player.position.y;
        const angle = Math.atan2(diffY, diffX);
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        const speed = maxSpeed * repelFactor;
  
        victim.velocity.x = speed * cos;
        victim.velocity.y = speed * sin;
  
        if (victim.planestate.stealthed) {
          throw "todo";
          // victim.planestate.stealthed = false;
          // victim.times.lastStealth = now;
  
          // this.delay(BROADCAST_EVENT_STEALTH, victim.id.current);
          // this.delay(BROADCAST_PLAYER_UPDATE, victim.id.current);
        }
      }

      /**
       * Repel projectiles.
       */
      for (let index = 0; index < projectiles.length; index += 1) {
        const projectile = projectiles[index];
        projectile.repel_total ??= 0;

        const distanceToRepel = Math.hypot(
          projectile.position.x - player.position.x,
          projectile.position.y - player.position.y
        );
        const { baseSpeed, repelEnergy, shape, distance } = PROJECTILES_SPECS[projectile.mobtype];
        const hitboxCache = projectileHitboxesCache[shape][projectile.rotation.low];
        let repelFactor = 1;
        let doubleDamage = false;

        if (distanceToRepel > REPEL_PROJECTILE_MAX_DISTANCE) {
          repelFactor = 0;
        } else if (distanceToRepel <= REPEL_PROJECTILE_MIN_DISTANCE) {
          repelFactor = 1;
  
          if (distanceToRepel < REPEL_DOUBLE_DAMAGE_RADIUS) {
            doubleDamage = true;
          }
        } else {
          const repelProjectileEnergy = 0.0479 * distanceToRepel * distanceToRepel - 18.84 * distanceToRepel + 2007;
          repelFactor = repelProjectileEnergy / repelEnergy;
        }
        if (repelFactor === 0 || projectile.repel_total > 1) {
          continue;
        }

        const diffX = projectile.position.x - player.position.x;
        const diffY = projectile.position.y - player.position.y;
        const angle = Math.atan2(diffY, diffX);
        const rot = (Math.atan2(diffY, diffX) + Math.PI / 2 + PI_X2) % PI_X2;
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        const speed = baseSpeed * repelFactor;
        const accelX = projectile.acceleration.x;
        const accelY = projectile.acceleration.y;
        const accelValue = Math.hypot(accelX, accelY);

        projectile._repel = true;
        projectile._repel_total += 1;
        projectile.owner = player;
        projectile.team = player.team;
        projectile.velocity.x = speed * cos;
        projectile.velocity.y = speed * sin;
        projectile.acceleration.x = accelValue * cos;
        projectile.acceleration.y = accelValue * sin;
        projectile.rotation.current = rot;
        projectile.hitbox.x = ~~projectile.position.x + MAP_SIZE.HALF_WIDTH + hitboxCache.x;
        projectile.hitbox.y = ~~projectile.position.y + MAP_SIZE.HALF_HEIGHT + hitboxCache.y;
        projectile.hitbox.body.team = player.team;

        if (
          projectile.hitbox.width !== hitboxCache.width ||
          projectile.hitbox.height !== hitboxCache.height
        ) {
          projectile.hitbox.width = hitboxCache.width;
          projectile.hitbox.height = hitboxCache.height;
  
          projectile.hitbox.body.setPoints([
            [hitboxCache.x, hitboxCache.y],
            [-hitboxCache.x, hitboxCache.y],
            [-hitboxCache.x, -hitboxCache.y],
            [hitboxCache.x, -hitboxCache.y],
          ]);
        }

        if (distance - projectile.distance.current < 200) {
          projectile.distance.current = distance - 200;
        }
        // if (doubleDamage) {
        //   projectile.damage.double = true;
        //   projectile.damage.doubleEnd = projectile.distance.current + REPEL_DOUBLE_DAMAGE_DISTANCE_ACTIVE;
        // }
      }
    }

    #loadMountains(mountains) {
      for (const [x, y, radius] of mountains) {
        const id = this.#createMountainMobId();
        if (!this.start_mountain_id)
          this.start_mountain_id = id;
        this.end_mountain_id = id;

        const mountain = {
          id,
          position: {x, y},
          rotation: {
              _current:0, sin: 0, cos: 1, low: 0,
              get current() { return this._current; }, 
              set current(v) { 
                  this._current = v;
                  this.low = ~~(v * 1000) / 1000;
                  this.sin = Math.sin(v);
                  this.cos = Math.cos(v);
              }
          },          
          hitcircles: [[0, 0, radius]],
          hitbox: {
            x: x + MAP_SIZE.HALF_WIDTH - radius,
            y: y + MAP_SIZE.HALF_HEIGHT - radius,
            width: radius * 2,
            height: radius * 2,
          }
        };
        const body = new Circle(mountain.hitbox.x + radius, mountain.hitbox.y + radius, radius);
        body.id = mountain.id;
        body.type = COLLISIONS_OBJECT_TYPES.MOUNTAIN;
        body.isCollideWithProjectile = true;
        body.isCollideWithPlayer = true;
        mountain.hitbox.body = body;
        this.#addCollisionBody(body);
        this.storage.mobList.set(mountain.id, mountain);
      }
    }

    #unloadMountains() {
      if (!this.start_mountain_id)
        return;
      for (let id=this.start_mountain_id; id<=this.end_mountain_id; id++) {
        const mountain = this.storage.mobList.get(id);
        this.#removeCollisionBody(mountain.hitbox.body);
        this.storage.mobList.delete(id);
      }
      this.#resetMountainMobIds();
      this.start_id = null;
      this.end_id = null;
    }

    #updatePlayerHorizon(player, horizonX, horizonY) {
      const maxArea = (5500 * 5500)/16; //todo: dynamic (see viewport.ts initServerScaleFactorLimit/onUpdateServerScaleFactor)
      let x = horizonX;
      let y = horizonY;
  
      if (horizonX / horizonY > SERVER_MAX_VIEWPORT_RATIO) {
        x = horizonY * SERVER_MAX_VIEWPORT_RATIO;
      } else if (horizonY / horizonX > SERVER_MAX_VIEWPORT_RATIO) {
        y = horizonX * SERVER_MAX_VIEWPORT_RATIO;
      }
  
      const area = x * y;
  
      if (area > maxArea) {
        const factor = Math.sqrt(maxArea / area);
  
        x *= factor;
        y *= factor;
      }
  
      x = Math.round(x);
      y = Math.round(y);
  
      if (player.viewport) {
        //this.emit(VIEWPORTS_UPDATE_HORIZON, playerId, x, y);
        const viewport = player.viewport;

        viewport.horizonX = x;
        viewport.horizonY = y;
    
        viewport.body.setPoints([
          [-x, -y],
          [x, -y],
          [x, y],
          [-x, y],
        ]);
    
        // this.emit(COLLISIONS_REMOVE_OBJECT, viewport.hitbox);
        // this.emit(COLLISIONS_ADD_OBJECT, viewport.hitbox);
        this.#removeCollisionBody(viewport.body);
        this.#addCollisionBody(viewport.body);
    
        this.#updateViewportPosition(
          player,
          viewport.body.x - MAP_SIZE.HALF_WIDTH,
          viewport.body.y - MAP_SIZE.HALF_HEIGHT
        );
      } else {
        // this.emit(
        //   VIEWPORTS_CREATE,
        //   playerId,
        //   connectionId,
        //   player.position.x,
        //   player.position.y,
        //   player.horizon.validX,
        //   player.horizon.validY
        // );
        const viewport = {
          id: player.id,
          //connectionId,
          body: null,
          subs: new Set(),
          current: new Set(),
          leaved: new Set(),
          horizonX: x,
          horizonY: y,
        };
    
        // TL, TR, BR, BL.
        viewport.hitbox = new Polygon(player.position.x + MAP_SIZE.HALF_WIDTH, player.position.y + MAP_SIZE.HALF_HEIGHT, [
          [-x, -y],
          [x, -y],
          [x, y],
          [-x, y],
        ]);
        viewport.body.id = player.id;
        viewport.body.type = COLLISIONS_OBJECT_TYPES.VIEWPORT;
    
        // this.emit(COLLISIONS_ADD_OBJECT, viewport.hitbox);
        // this.viewports.set(playerId, viewport);
        this.#addCollisionBody(viewport.body);
        player.viewport = viewport;
      }
    }

    #updateViewportPosition(player, x, y) {
      const viewport = player.viewport;

      viewport.body.x = x + MAP_SIZE.HALF_WIDTH;
      viewport.body.y = y + MAP_SIZE.HALF_HEIGHT;
  
      if (viewport.body.x < COLLISIONS_MAP_COORDS.MIN_X + viewport.horizonX) {
        viewport.body.x = COLLISIONS_MAP_COORDS.MIN_X + viewport.horizonX;
      }
  
      if (viewport.body.y < COLLISIONS_MAP_COORDS.MIN_Y + viewport.horizonY) {
        viewport.body.y = COLLISIONS_MAP_COORDS.MIN_Y + viewport.horizonY;
      }
  
      if (viewport.body.x > COLLISIONS_MAP_COORDS.MAX_X - viewport.horizonX) {
        viewport.body.x = COLLISIONS_MAP_COORDS.MAX_X - viewport.horizonX;
      }
  
      if (viewport.body.y > COLLISIONS_MAP_COORDS.MAX_Y - viewport.horizonY) {
        viewport.body.y = COLLISIONS_MAP_COORDS.MAX_Y - viewport.horizonY;
      }
  
      //TODO (needed for spectate)
      if (viewport.subs.size !== 0) {
        return
        this.updateSubs(viewport, x, y);
        // const owner = this.players.get(viewport.hitbox.id);
        // const subsIterator = viewport.subs.values();
        // let playerId: PlayerId = subsIterator.next().value;
    
        // while (playerId !== undefined) {
        //   const player = this.players.get(playerId);
    
        //   if (
        //     owner.planestate.stealthed &&
        //     (!this.config.visibleTeamProwlers || owner.team.current !== player.team.current)
        //   ) {
        //     playerId = subsIterator.next().value;
    
        //     continue;
        //   }
    
        //   const subViewport = this.viewports.get(playerId);
    
        //   subViewport.hitbox.x = x + MAP_SIZE.HALF_WIDTH;
        //   subViewport.hitbox.y = y + MAP_SIZE.HALF_HEIGHT;
    
        //   if (subViewport.hitbox.x < COLLISIONS_MAP_COORDS.MIN_X + subViewport.horizonX) {
        //     subViewport.hitbox.x = COLLISIONS_MAP_COORDS.MIN_X + subViewport.horizonX;
        //   }
    
        //   if (subViewport.hitbox.y < COLLISIONS_MAP_COORDS.MIN_Y + subViewport.horizonY) {
        //     subViewport.hitbox.y = COLLISIONS_MAP_COORDS.MIN_Y + subViewport.horizonY;
        //   }
    
        //   if (subViewport.hitbox.x > COLLISIONS_MAP_COORDS.MAX_X - subViewport.horizonX) {
        //     subViewport.hitbox.x = COLLISIONS_MAP_COORDS.MAX_X - subViewport.horizonX;
        //   }
    
        //   if (subViewport.hitbox.y > COLLISIONS_MAP_COORDS.MAX_Y - subViewport.horizonY) {
        //     subViewport.hitbox.y = COLLISIONS_MAP_COORDS.MAX_Y - subViewport.horizonY;
        //   }
    
        //   playerId = subsIterator.next().value;
        // }
      }
    }

    #createMobId(playerName = '') {
        let mobId = this.storage.nextMobId;
        this.storage.nextMobId += 1;
    
        // if (playerName.length > 0 && this.storage.playerHistoryNameToIdList.has(playerName)) {
        //   mobId = this.storage.playerHistoryNameToIdList.get(playerName).id;
        // }
    
        while (this.storage.mobIdList.has(mobId)) {
          mobId = this.storage.nextMobId;
          this.storage.nextMobId += 1;
        }
    
        this.storage.mobIdList.add(mobId);
    
        // if (playerName.length > 0) {
        //   this.storage.playerHistoryNameToIdList.set(playerName, {
        //     id: mobId,
        //     expired: Date.now(),
        //   });
        // }
    
        if (this.storage.nextMobId >= SERVER_MAX_MOB_ID) {
          this.storage.nextMobId = SERVER_MIN_MOB_ID;
        }
        if (this.storage.mobIdList.size >= SERVER_MAX_MOB_ID - SERVER_MIN_MOB_ID) {
          throw 'Critical amount of mobs.';
        }
    
        return mobId;
    }

    #createMountainMobId() {
      const id = this.storage.nextMountainMobId;

      this.storage.nextMountainMobId += 1;
  
      if (this.storage.nextMountainMobId >= SERVER_MIN_MOB_ID) {
        throw 'Mountain mob ID is out of range!';
      }
  
      return id;
    }

    #resetMountainMobIds() {
      this.storage.nextMountainMobId = SERVER_MIN_MOUNTAIN_MOB_ID;
    }

    #deleteProjectile(projectile) {
      this.#removeCollisionBody(projectile.hitbox.body);
      this.storage.projectileIdList.delete(projectile.id);
      this.storage.mobList.delete(projectile.id);
      this.storage.mobIdList.delete(projectile.id);
      this.projectiles.delete(projectile);
    }

    #updateProjectiles(frameFactor) {
        const skippedFrames = Math.round(frameFactor);
        const lastFrameCompensationFactor = frameFactor - Math.floor(frameFactor) + 1;
    
        const projectilesToDespawn = [];
    
        {
          const projectilesIterator = this.storage.projectileIdList.values();
          let projectileId = projectilesIterator.next().value;
    
          while (projectileId !== undefined) {
            const projectile = this.storage.mobList.get(projectileId);
            const PROJECTILE_PARAMS = PROJECTILES_SPECS[projectile.mobtype];
    
            for (let frameIndex = 1; frameIndex <= skippedFrames; frameIndex += 1) {
              let compensationFactor = 1;
              if (frameIndex === skippedFrames) {
                compensationFactor = lastFrameCompensationFactor;
              }
    
              const prevSpeedX = projectile.velocity.x;
              const prevSpeedY = projectile.velocity.y;
    
              projectile.velocity.x += projectile.acceleration.x * compensationFactor;
              projectile.velocity.y += projectile.acceleration.y * compensationFactor;
              projectile._repel = false;
    
              const speed = Math.hypot(projectile.velocity.x, projectile.velocity.y);
    
              if (speed > projectile.velocity.max) {
                projectile.velocity.x *= projectile.velocity.max / speed;
                projectile.velocity.y *= projectile.velocity.max / speed;
                projectile.velocity.length = projectile.velocity.max;
              } else {
                projectile.velocity.length = speed;
              }
    
              projectile.position.x +=
                (prevSpeedX + 0.5 * (projectile.velocity.x - prevSpeedX)) * compensationFactor;
              projectile.position.y +=
                (prevSpeedY + 0.5 * (projectile.velocity.y - prevSpeedY)) * compensationFactor;
    
              projectile.distance.current += Math.hypot(projectile.velocity.x, projectile.velocity.y);
    
            //   if (
            //     projectile.damage.double &&
            //     projectile.damage.doubleEnd <= projectile.distance.current
            //   ) {
            //     projectile.damage.double = false;
            //   }
    
              if (
                projectile.distance.current >= PROJECTILE_PARAMS.distance ||
                projectile.position.x < mapBounds.MIN_X ||
                projectile.position.x > mapBounds.MAX_X ||
                projectile.position.y < mapBounds.MIN_Y ||
                projectile.position.y > mapBounds.MAX_Y
              ) {
                projectilesToDespawn.push(projectile);
              } else {
                /**
                 * Actually rotation never changes, it doesn't need to get hitbox from cache.
                 * TODO: cache it.
                 */
                const hitboxCache =
                  projectileHitboxesCache[PROJECTILE_PARAMS.shape][
                    projectile.rotation.low
                  ];
    
                projectile.hitbox.x = ~~projectile.position.x + MAP_SIZE.HALF_WIDTH + hitboxCache.x;
                projectile.hitbox.y = ~~projectile.position.y + MAP_SIZE.HALF_HEIGHT + hitboxCache.y;
    
                projectile.hitbox.body.x = projectile.hitbox.x - hitboxCache.x;
                projectile.hitbox.body.y = projectile.hitbox.y - hitboxCache.y;
              }
            }
    
            projectileId = projectilesIterator.next().value;
          }
        }
    
        /**
         * Despawn projectiles.
         */
        for (let index = 0; index < projectilesToDespawn.length; index += 1) {
          //this.despawnProjectile(projectilesToDespawn[index]);
            const projectile = projectilesToDespawn[index];
            this.#deleteProjectile(projectile);

            //this.delay(BROADCAST_MOB_DESPAWN, id, MOB_DESPAWN_TYPES.EXPIRED);
            const server_msg = {
                c: ServerPacket.MOB_DESPAWN,
                id: projectile.id,
                type: MOB_DESPAWN_TYPES.EXPIRED,
            };
            this.storage.broadcast.get(projectile).forEach(({ws})=>ws.callback({data:server_msg}));
        }
    }

    #updatePlayers(frameFactor) {
        this.now = Date.now();
        const skippedFrames = Math.round(frameFactor);
        const lastFrameCompensationFactor = frameFactor - Math.floor(frameFactor) + 1;

        const delayed = [];
        loop: for (let player of this.players) {
            for (let frameIndex = 1; frameIndex <= skippedFrames; frameIndex += 1) {
                let compensationFactor = 1;
                if (frameIndex === skippedFrames) {
                  compensationFactor = lastFrameCompensationFactor;
                }

                const SHIP_SPECS = SHIPS_SPECS[player.planetype];

                player._repel = false;

                // fire
                if (player.keystate.FIRE ||
                    (player.keystate.SPECIAL && SHIP_SPECS.special === SPECIAL_ABILITIES.FIRE)
                ) {
                    player.planestate.fire = true;
                } else {
                    player.planestate.fire = false;
                }

                /**
                 * Periodic PLAYER_UPDATE broadcast.
                 */
                if (player.times.lastUpdatePacket < this.now - PLAYERS_BROADCAST_UPDATE_INTERVAL_MS) {
                  player.delayed.BROADCAST_PLAYER_UPDATE = true;
                }

                // ack check
                if (player.times.lastAck < this.now - CONNECTIONS_PACKET_ACK_TIMEOUT_MS && frameIndex === 1) {
                  delayed.push(player);
                  continue loop;
                }

                // ping
                if (player.times.lastPing < this.now - CONNECTIONS_PACKET_PING_INTERVAL_MS && frameIndex === 1) {
                  this.#sendPing(player);
                }

                // kill respawn
                if (player.status === PLAYERS_ALIVE_STATUSES.DEAD && player.times.lastDeath < this.now - PLAYERS_DEATH_INACTIVITY_MS /*&& this.config.server.typeId !== GAME_TYPES.BTR*/) {
                  this.respawn(player.ws, null);
                  continue loop;
                }                
          
                /**
                 * Shield expire check.
                 */
                if (player.shield.current && player.shield.endTime <= this.now) {
                  player.shield.current = false;
                  player.delayed.BROADCAST_PLAYER_UPDATE = true;
                }

                /**
                 * Inferno expire check.
                 */
                if (player.inferno.current && player.inferno.endTime <= this.now) {
                  player.inferno.current = false;
                  player.delayed.BROADCAST_PLAYER_UPDATE = true;
                }

                player.energy.regen = SHIP_SPECS.energyRegen * UPGRADES_SPECS.ENERGY.factor[player.upgrades.energy];

                let boostFactor = player.planestate.boost ? SHIP_SPECS.boostFactor : 1;
                let isUpdateHitbox = false;
                let isUpdateViewport = false;
                let energyDiff = player.energy.regen * compensationFactor;

                /**
                 * Special handle.
                 */
                if (SHIP_SPECS.special === SPECIAL_ABILITIES.BOOST) {
                    const isBoost = !!(player.keystate.SPECIAL &&
                        (player.keystate.UP || player.keystate.DOWN) &&
                        player.energy.current >= Math.abs(SHIP_SPECS.specialEnergyRegen)
                        );
        
                    /**
                     * Boost state changed.
                     */
                    if (isBoost !== player.planestate.boost) {
                        player.planestate.boost = isBoost;
            
                        // Energy is out.
                        if (!isBoost) {
                            player.keystate.SPECIAL = false;
                            boostFactor = 1;
                        }
            
                        player.delayed.BROADCAST_EVENT_BOOST = true;
                    }
            
                    if (isBoost) {
                        player.energy.regen = SHIP_SPECS.specialEnergyRegen;
                        energyDiff = SHIP_SPECS.specialEnergyRegen * compensationFactor;
                    }
                    
                } else if (SHIP_SPECS.special === SPECIAL_ABILITIES.REPEL) {
                  player.planestate.repel = player.keystate.SPECIAL && player.energy.current >= SHIP_SPECS.specialEnergy && player.times.lastRepel < this.now - SHIP_SPECS.specialDelay;
      
                  if (player.planestate.repel) {
                    energyDiff = -SHIP_SPECS.specialEnergy;
                    player.times.lastRepel = this.now;
                  }
                } else if (SHIP_SPECS.special === SPECIAL_ABILITIES.STRAFE) {
                    player.planestate.strafe = player.keystate.SPECIAL;
                } else if (SHIP_SPECS.special === SPECIAL_ABILITIES.STEALTH && player.keystate.SPECIAL) {
                  // if (player.planestate.stealthed) {
                  //   player.planestate.stealthed = false;
                  //   player.keystate.SPECIAL = false;
                  //   player.delayed.BROADCAST_EVENT_STEALTH = true;
                  //   player.delayed.BROADCAST_PLAYER_UPDATE = true;
                  //   player.times.lastStealth = this.now;
                  // } else if (
                  //   player.energy.current >= SHIP_SPECS.specialEnergy &&
                  //   player.times.lastHit < this.now - SHIP_SPECS.specialDelay &&
                  //   player.times.lastStealth < this.now - SHIP_SPECS.specialDelay
                  // ) {
                  //   player.planestate.stealthed = true;
                  //   energyDiff = -SHIP_SPECS.specialEnergy;
                  //   player.times.lastStealth = this.now;
                  //   player.delayed.BROADCAST_EVENT_STEALTH = true;
                  //   player.keystate.SPECIAL = false;        
                  //   // if (player.planestate.flagspeed) {
                  //   //   this.emit(CTF_PLAYER_DROP_FLAG, player.id.current);
                  //   // }
                  // }
                }

                /**
                 * Energy update.
                 */  
                if (player.energy.current !== PLAYERS_ENERGY.MAX || energyDiff < 0) {
                  player.energy.current += energyDiff;
                }
        
                if (player.energy.current > PLAYERS_ENERGY.MAX) {
                  player.energy.current = PLAYERS_ENERGY.MAX;
                  player.delayed.BROADCAST_PLAYER_UPDATE = true;
                }
        
                if (player.energy.current < PLAYERS_ENERGY.MIN) {
                  player.energy.current = PLAYERS_ENERGY.MIN;
                  player.delayed.BROADCAST_PLAYER_UPDATE = true;
                }            

                /**
                 * Health update.
                 */  
                if (player.health.current !== PLAYERS_HEALTH.MAX) {
                  player.health.regen = SHIP_SPECS.healthRegen;
                  player.health.current += compensationFactor * SHIP_SPECS.healthRegen;
                }
        
                if (player.health.current > PLAYERS_HEALTH.MAX) {
                  // if (this.config.killAssists) {
                  //   player.damage.takenTraking = [];
                  // }
                  player.health.regen = 0;
                  player.health.current = PLAYERS_HEALTH.MAX;
                  player.delayed.BROADCAST_PLAYER_UPDATE = true;
                }                             

                /**
                 * Airplane movement direction.
                 */                    
                let isMoving = player.velocity.x !== 0 || player.velocity.y !== 0;
                let flightDirection = -999;

                if (player.planestate.strafe) {
                    /**
                     * Copter strafe.
                     */
                    if (player.keystate.LEFT) {
                      isMoving = true;
                      flightDirection = player.rotation.current - 0.5 * Math.PI;
                    }
          
                    if (player.keystate.RIGHT) {
                      isMoving = true;
                      flightDirection = player.rotation.current + 0.5 * Math.PI;
                    }
                } else if (player.keystate.LEFT || player.keystate.RIGHT) {
                    isUpdateHitbox = true;
          
                    if (player.keystate.LEFT) {
                      player.rotation.current -= compensationFactor * SHIP_SPECS.turnFactor;
                    }
          
                    if (player.keystate.RIGHT) {
                      player.rotation.current += compensationFactor * SHIP_SPECS.turnFactor;
                    }
          
                    player.rotation.current = ((player.rotation.current % PI_X2) + PI_X2) % PI_X2;
                }

                if (player.keystate.UP) {
                    isMoving = true;
          
                    if (flightDirection === -999) {
                      flightDirection = player.rotation.current;
                    } else {
                      flightDirection += Math.PI * (player.keystate.RIGHT ? -0.25 : 0.25);
                    }
                } else if (player.keystate.DOWN) {
                    isMoving = true;
          
                    if (flightDirection === -999) {
                      flightDirection = player.rotation.current + Math.PI;
                    } else {
                      flightDirection += Math.PI * (player.keystate.RIGHT ? 0.25 : -0.25);
                    }
                }

                /**
                 * Velocity update.
                 */
                let velocityValue = 0;
                if (isMoving) {
                    isUpdateHitbox = true;
                    isUpdateViewport = true;
          
                    const startSpeedX = player.velocity.x;
                    const startSpeedY = player.velocity.y;
          
                    if (flightDirection !== -999) {
                      player.velocity.x +=
                        Math.sin(flightDirection) * SHIP_SPECS.accelFactor * boostFactor * compensationFactor;
                      player.velocity.y -=
                        Math.cos(flightDirection) * SHIP_SPECS.accelFactor * boostFactor * compensationFactor;
                    }

                    velocityValue = Math.hypot(player.velocity.x, player.velocity.y);

                    let maxVelocity =
                    SHIP_SPECS.maxSpeed * boostFactor * 1;//UPGRADES_SPECS.SPEED.factor[player.upgrades.speed];
        
                    if (player.inferno.current) {
                        maxVelocity *= SHIP_SPECS.infernoFactor;
                    }
            
                    // if (player.planestate.flagspeed) {
                    //     maxVelocity = SHIP_SPECS.flagSpeed;
                    //     player.captures.time += 17;
                    // }
            
                    if (velocityValue > maxVelocity) {
                        player.velocity.x *= maxVelocity / velocityValue;
                        player.velocity.y *= maxVelocity / velocityValue;
            
                        /**
                         * Max velocity achieved.
                         */
                        if (!player.velocity.isMax) {
                        player.velocity.isMax = true;
                        player.velocity.isMin = false;
                        player.delayed.BROADCAST_PLAYER_UPDATE = true;
                        }
                    } else if (
                        player.velocity.x > SHIP_SPECS.minSpeed ||
                        player.velocity.x < -SHIP_SPECS.minSpeed ||
                        player.velocity.y > SHIP_SPECS.minSpeed ||
                        player.velocity.y < -SHIP_SPECS.minSpeed
                    ) {
                        player.velocity.x *= 1 - SHIP_SPECS.brakeFactor * compensationFactor;
                        player.velocity.y *= 1 - SHIP_SPECS.brakeFactor * compensationFactor;
            
                        player.velocity.isMax = false;
                        player.velocity.isMin = false;
                    } else {
                        player.velocity.x = 0;
                        player.velocity.y = 0;
            
                        /**
                         * Min velocity achieved.
                         */
                        if (!player.velocity.isMin && (startSpeedX !== 0 || startSpeedY !== 0)) {
                        player.velocity.isMin = true;
                        player.velocity.isMax = false;
                        player.delayed.BROADCAST_PLAYER_UPDATE = true;
                        }
                    }

                    /**
                     * Update player position.
                     */
                    player.position.x +=
                    compensationFactor * startSpeedX +
                    0.5 * (player.velocity.x - startSpeedX) * compensationFactor * compensationFactor;
                    player.position.y +=
                    compensationFactor * startSpeedY +
                    0.5 * (player.velocity.y - startSpeedY) * compensationFactor * compensationFactor;
                }

                /**
                 * Validate coords.
                 */
                if (player.position.x < playerBounds.MIN_X) {
                  player.position.x = playerBounds.MIN_X;
                }
        
                if (player.position.x > playerBounds.MAX_X) {
                  player.position.x = playerBounds.MAX_X;
                }
        
                if (player.position.y < playerBounds.MIN_Y) {
                  player.position.y = playerBounds.MIN_Y;
                }
        
                if (player.position.y > playerBounds.MAX_Y) {
                  player.position.y = playerBounds.MAX_Y;
                }

                /**
                 * Update hitbox.
                 */
                if (isUpdateHitbox) {
                  const hitboxCache = shipHitboxesCache[player.planetype][player.rotation.low];
        
                  player.hitbox.x = ~~player.position.x + MAP_SIZE.HALF_WIDTH + hitboxCache.x;
                  player.hitbox.y = ~~player.position.y + MAP_SIZE.HALF_HEIGHT + hitboxCache.y;
        
                  player.hitbox.body.x = player.hitbox.x - hitboxCache.x;
                  player.hitbox.body.y = player.hitbox.y - hitboxCache.y;
        
                  if (
                    player.hitbox.width !== hitboxCache.width ||
                    player.hitbox.height !== hitboxCache.height
                  ) {
                    player.hitbox.width = hitboxCache.width;
                    player.hitbox.height = hitboxCache.height;
        
                    player.hitbox.body.setPoints([
                      [hitboxCache.x, hitboxCache.y],
                      [-hitboxCache.x, hitboxCache.y],
                      [-hitboxCache.x, -hitboxCache.y],
                      [hitboxCache.x, -hitboxCache.y],
                    ]);
                  }
                }

                /**
                 * Update repel if active.
                 */
                if (SHIP_SPECS.special === SPECIAL_ABILITIES.REPEL && player.planestate.repel) {
                  //this.emit(PLAYERS_REPEL_UPDATE, player.id.current, player.position.x, player.position.y);
                  const radius = REPEL_COLLISIONS[0][2];
                  const repel = player.repel;
              
                  repel.position.x = player.position.x;
                  repel.position.y = player.position.y;
                  repel.hitbox.x = ~~player.position.x + MAP_SIZE.HALF_WIDTH - radius;
                  repel.hitbox.y = ~~player.position.y + MAP_SIZE.HALF_HEIGHT - radius;
                  repel.hitbox.body.x = repel.hitbox.x + radius;
                  repel.hitbox.body.y = repel.hitbox.y + radius;
                }
                        
                /**
                 * Update viewport.
                 */
                if (isUpdateViewport && viewport_enabled) {
                  this.#updateViewportPosition(player, ~~player.position.x, ~~player.position.y);
                }             

                /**
                 * Fire projectiles.
                 */
                if (player.planestate.fire) {
                    const fireMode = player.inferno.current ? SHIPS_FIRE_MODES.INFERNO : SHIPS_FIRE_MODES.FIRE;
                    let { fireEnergy } = SHIP_SPECS;
                    let fireType = SHIPS_FIRE_TYPES.DEFAULT;
        
                    if (!player.keystate.FIRE) {//tornado
                        fireType = SHIPS_FIRE_TYPES.SPECIAL;
                        fireEnergy = SHIP_SPECS.specialEnergy;
                    }

                    if (player.energy.current >= fireEnergy &&
                        player.times.lastFire < this.now - SHIP_SPECS.fireDelay
                      ) {
                        // if (player.planestate.stealthed) {
                        //     player.planestate.stealthed = false;
                        //     player.times.lastStealth = this.now;
                        //     player.delayed.BROADCAST_EVENT_STEALTH = true;
                        //     this.delay(BROADCAST_PLAYER_UPDATE, player.id.current);
                        // }

                        const FIRE_TEMPLATE = SHIP_SPECS[fireMode][fireType];
                        const projectiles = [];

                        player.times.lastFire = this.now;
                        player.energy.current -= fireEnergy;

                        /**
                         * Angle between player velocity vector and player rotation vector.
                         */
                        const dirVelAngle =
                            Math.atan2(player.rotation.cos, player.rotation.sin) -
                            Math.atan2(
                                (-1 * player.velocity.y) / velocityValue,
                                player.velocity.x / velocityValue
                            );

                        for (let index = 0; index < FIRE_TEMPLATE.length; index += 1) {
                            const PROJECTILE_FIRE_TEMPLATE = FIRE_TEMPLATE[index];
                            const PROJECTILE_SPECS = PROJECTILES_SPECS[PROJECTILE_FIRE_TEMPLATE.type];
                            const mobId = this.#createMobId();
                            const projectileRot = (((player.rotation.current + PROJECTILE_FIRE_TEMPLATE.rot) % PI_X2) + PI_X2) % PI_X2;
                            const offsetSign =
                            player.delayed.FIRE_ALTERNATE_MISSILE && !player.inferno.current ? -1 : 1;
                            const projectileRotSin = Math.sin(projectileRot);
                            const projectileRotCos = Math.cos(projectileRot);
                            const upgradeFactor = UPGRADES_SPECS.MISSILE.factor[player.upgrades.missile];
                            const speedFactor = player.inferno.current ? PROJECTILE_SPECS.infernoSpeedFactor : PROJECTILE_SPECS.speedFactor;
                            const accelX = projectileRotSin * PROJECTILE_SPECS.accel * upgradeFactor;
                            const accelY = -projectileRotCos * PROJECTILE_SPECS.accel * upgradeFactor;
                            let posX = player.position.x + PROJECTILE_FIRE_TEMPLATE.y * player.rotation.sin;
                            let posY = player.position.y - PROJECTILE_FIRE_TEMPLATE.y * player.rotation.cos;
                            if (PROJECTILE_FIRE_TEMPLATE.x !== 0) {
                                posX += offsetSign * PROJECTILE_FIRE_TEMPLATE.x * player.rotation.cos;
                                posY += offsetSign * PROJECTILE_FIRE_TEMPLATE.x * player.rotation.sin;
                            }
                            /**
                             * Zero, if player fly in backward direction.
                             */
                            const dropVelocity = Math.abs(dirVelAngle) < Math.PI / 2 ? velocityValue : 0;
                            const projectile = {
                                id: mobId,
                                owner: player,
                                team: player.team,
                                mobtype: PROJECTILE_FIRE_TEMPLATE.type,
                                position: {x:posX, y:posY},
                                velocity: {
                                    x: projectileRotSin * (dropVelocity + (PROJECTILE_SPECS.baseSpeed + speedFactor) * upgradeFactor),
                                    y: -projectileRotCos * (dropVelocity + (PROJECTILE_SPECS.baseSpeed + speedFactor) * upgradeFactor),
                                    max: PROJECTILE_SPECS.maxSpeed * upgradeFactor,
                                    length: 0,
                                },
                                rotation: {
                                  _current:0, sin: 0, cos: 1, low: 0,
                                  get current() { return this._current; }, 
                                },
                                acceleration: {x: accelX, y:accelY},
                                distance: { current: 0 },
                                damage: {current:0, double:0, doubleEnd:0, /*...*/},
                                hitcircles: [...PROJECTILES_COLLISIONS[PROJECTILE_SPECS.shape]],
                            };
                            projectile.velocity.length = dropVelocity + (PROJECTILE_SPECS.baseSpeed + speedFactor) * upgradeFactor;

                            this.storage.mobList.set(mobId, projectile);
                            this.storage.projectileIdList.add(mobId);
                            this.projectiles.add(projectile);
                            projectiles.push(projectile);

                            /**
                             * Hitbox init.
                             */
                            const hitboxCache = projectileHitboxesCache[PROJECTILE_SPECS.shape][projectile.rotation.low];
                            projectile.hitbox = {
                              width: hitboxCache.width,
                              height: hitboxCache.height,
                              x: ~~projectile.position.x + MAP_SIZE.HALF_WIDTH + hitboxCache.x,
                              y: ~~projectile.position.y + MAP_SIZE.HALF_HEIGHT + hitboxCache.y,
                            };
                            // TL, TR, BR, BL.
                            const body = new Polygon(
                              projectile.hitbox.x - hitboxCache.x,
                              projectile.hitbox.y - hitboxCache.y,
                              [
                                [hitboxCache.x, hitboxCache.y],
                                [-hitboxCache.x, hitboxCache.y],
                                [-hitboxCache.x, -hitboxCache.y],
                                [hitboxCache.x, -hitboxCache.y],
                              ]
                            ); 
                            body.id = projectile.id;
                            body.type = COLLISIONS_OBJECT_TYPES.PROJECTILE;
                            body.isCollideWithViewport = true;
                            body.isCollideWithRepel = true;
                            body.isCollideWithPlayer = true;
                            body.isProjectile = true;
                            body.team = player.team;
                            projectile.hitbox.body = body;
                            this.#addCollisionBody(projectile.hitbox.body);

                            /**
                               * Copter alternate fire update.
                               */
                            if (PROJECTILE_FIRE_TEMPLATE.alt) {
                                player.delayed.FIRE_ALTERNATE_MISSILE = !player.delayed.FIRE_ALTERNATE_MISSILE;
                            }                            
                        }

                        /**
                         * Add projectile to each player viewport, who will get the fire message.
                         * Otherwise there will be phantom projectiles.
                         */
                        if (viewport_enabled) {
                          //...
                        }

                        //this.delay(BROADCAST_PLAYER_FIRE, player.id.current, projectileIds);
                        player.delayed.BROADCAST_PLAYER_FIRE = projectiles;
                    }
                }
            }

            if (player.delayed.BROADCAST_PLAYER_FIRE) {
              const projectiles = player.delayed.BROADCAST_PLAYER_FIRE;
              player.delayed.BROADCAST_PLAYER_FIRE = null;
              const server_msg = {
                c: ServerPacket.PLAYER_FIRE,
                clock: performance.now()*100,
                id: player.id,
                energy: player.energy.current,
                energyRegen: player.energy.regen,
                projectiles: projectiles.map(x=>({
                    id: x.id,
                    type: x.mobtype,
                    posX: x.position.x,
                    posY: x.position.y,
                    speedX: x.velocity.x,
                    speedY: x.velocity.y,
                    accelX: x.acceleration.x,
                    accelY: x.acceleration.y,
                    maxSpeed: x.velocity.max,
                })),
              };
              this.storage.broadcast.get(player).forEach(({ws})=>ws.callback({data:server_msg}));
            }

            if (player.delayed.BROADCAST_EVENT_BOOST) {
                player.delayed.BROADCAST_EVENT_BOOST = false;

                const server_msg = {
                    c: ServerPacket.EVENT_BOOST,
                    clock: performance.now()*100,
                    id: player.id,
                    boost: player.planestate.boost,
                    posX: player.position.x,
                    posY: player.position.y,
                    rot: player.rotation.current,
                    speedX: player.velocity.x,
                    speedY: player.velocity.y,
                    energy: player.energy.current,
                    energyRegen: player.energy.regen,
                };
                this.storage.broadcast.get(player).forEach(({ws})=>ws.callback({data:server_msg}));
            }

            if (player.delayed.BROADCAST_PLAYER_UPDATE) {
                player.delayed.BROADCAST_PLAYER_UPDATE = false;
                this.#broadcastPlayerUpdate(player);
            }
        }

        for (const player of delayed) {
          this.close(player.ws);
        }
    }

    #sendScoreUpdate(player) {
      let earnings = 0;
      let totalkills = player.kills.current;
      let totaldeaths = player.deaths.current;
  
      // if (has(player, 'user')) {
      //   const user = this.storage.users.list.get(player.user.id);
  
      //   ({ earnings, totalkills, totaldeaths } = user.lifetimestats);
  
      //   const newLevel = convertEarningsToLevel(earnings);
  
      //   if (newLevel !== player.level.current) {
      //     const updateType =
      //       newLevel > player.level.current && !informPlayerLevel
      //         ? PLAYER_LEVEL_UPDATE_TYPES.LEVELUP
      //         : PLAYER_LEVEL_UPDATE_TYPES.INFORM;
  
      //     player.level.current = newLevel;
      //     this.emit(BROADCAST_PLAYER_LEVEL, player.id.current, updateType);
      //   }
      // }
  
      const server_msg = {
        c: ServerPacket.SCORE_UPDATE,
        id: player.id,
        score: player.score,
        earnings,
        upgrades: player.upgrades.amount,
        totalkills,
        totaldeaths,
      };
      player.ws.callback({data:server_msg});
    }

    #broadcastPlayerUpdate(player, recipient) {
      if (!viewport_enabled && player.status == PLAYERS_ALIVE_STATUSES.DEAD)
        return;
      const recipients = recipient ? [recipient] : this.storage.broadcast.get(player);
      // if (!recipients) {
      //   // can happen if requestAnimationFrame throttled
      //   console.warn('recipients null', player);
      //   return;
      // }
      const server_msg = {
        c: ServerPacket.PLAYER_UPDATE,
        clock: performance.now()*100,
        id: player.id,
        keystate: encodeKeystate(
            player.keystate,
            player.planestate.boost,
            player.planestate.strafe,
            player.planestate.stealthed,
            player.planestate.flagspeed
        ),
        upgrades: encodeUpgrades(
            player.upgrades.speed,
            ~~player.shield.current,
            ~~player.inferno.current
        ),
        posX: player.position.x,
        posY: player.position.y,
        rot: player.rotation.current,
        speedX: player.velocity.x,
        speedY: player.velocity.y,
      };
      recipients.filter(x=>{
        return x==player || !player.planestate.stealthed || (player.planestate.stealthed && x.team==player.team);
      }).forEach(({ws})=>ws.callback({data:server_msg}));
      
      if (!recipient)
        player.times.lastUpdatePacket = Date.now();
    }

    #sendPing(player) {
      player.ping.num = getRandomInt(1000, 99999);
      player.ping.clock = performance.now()*100;
      player.ws.callback({data:{
        c: ServerPacket.PING,
        clock: player.ping.clock,
        num: player.ping.num,
      }});
      player.times.lastPing = Date.now();
    }

    loop(timestamp) {
        requestAnimationFrame((x)=>this.loop(x));
        
        const intervalMs = 1000 / 60;
        if (this.startTime === 0)
            this.startTime = timestamp;
        const diffTime = timestamp - this.startTime;
        if (diffTime < intervalMs*this.counter) {

        } else {
            if (diffTime < intervalMs * (this.counter + 1)) {
                this.now = Date.now();
                const frameFactor = this.skippedFrames + diffTime / (intervalMs * this.counter);
                this.#updateProjectiles(frameFactor);
                this.#updatePlayers(frameFactor);
                this.#detectCollisions();
                this.skippedFrames = 0;
            } else {
                console.log('skipped frame');
                this.skippedFrames++;
                if (this.skippedFrames > 50) {
                  console.log('skipped frame (1)');
                    this.startTime = 0;
                    this.counter = 0;
                    this.skippedFrames = 0;
                    this.players.forEach(x=>{
                      x.times.lastAck = Date.now();
                      x.times.lastUpdatePacket = Date.now();
                    });
                }
            }
            this.counter++;
        }
    }

    login(ws, {name}) {
        const planetype = 1;
        const horizon = {x:6000, y:6000};
        const id = this.#createMobId();
        const player = {
            id,
            name,
            bot: false,
            team: id,
            flag: 11,
            status: PLAYERS_ALIVE_STATUSES.ALIVE,
            planetype,
            planestate: {boost:false, strafe:false, stealthed:false, repel:false, fire:false, bounce:false},
            position: {x:0, y:0},
            velocity: {x:0, y:0, isMin:true, isMax:false},
            rotation: {
                _current:0, sin: 0, cos: 1, low: 0,
                get current() { return this._current; }, 
                set current(v) { 
                    this._current = v;
                    this.low = ~~(v * 1000) / 1000;
                    this.sin = Math.sin(v);
                    this.cos = Math.cos(v);
                }
            },
            keystate: {},
            energy: {current:1, regen:0},
            health: {current:1, regen:0},
            shield: {current:false, endTime:0},
            inferno: {current: false, endTime:0},
            upgrades: {missile:0, energy:0, defense:0, speed:0, amount:0},
            kills: {current:0},
            deaths: {current:0},
            score: 0,
            hitcircles: [...SHIPS_SPECS[planetype].collisions],
            times: {lastDeath: 0, lastFire:0, lastRepel:0, lastBounce:0, lastUpdatePacket:Date.now(), lastAck:Date.now(), lastPing:Date.now()},
            viewport: null,
            ping: {},
            delayed:{},
            ws,
        };
      
        const hitboxCache = shipHitboxesCache[player.planetype][player.rotation.low];
        const hitbox = {
          width: hitboxCache.width,
          height: hitboxCache.height,
          x: ~~player.position.x + MAP_SIZE.HALF_WIDTH + hitboxCache.x,
          y: ~~player.position.y + MAP_SIZE.HALF_HEIGHT + hitboxCache.y,
        };
        const body = new Polygon(hitbox.x - hitboxCache.x, hitbox.y - hitboxCache.y, [
          [hitboxCache.x, hitboxCache.y],
          [-hitboxCache.x, hitboxCache.y],
          [-hitboxCache.x, -hitboxCache.y],
          [hitboxCache.x, -hitboxCache.y],
        ]);
        body.id = player;//.id;
        body.team = player.team;
        body.type = COLLISIONS_OBJECT_TYPES.PLAYER;
        body.isCollideWithViewport = true;
        body.isCollideWithRepel = true;
        player.hitbox = hitbox;
        player.hitbox.body = body;
        this.#addCollisionBody(body);

        /**
         * Viewport init.
         */
        if (viewport_enabled)
          this.#updatePlayerHorizon(player, horizon.x, horizon.y);

        this.players.push(player);

        const server_msg = {
            c: ServerPacket.LOGIN,
            success: true,
            id: player.id,
            team: player.team,
            clock: performance.now()*100, // server sends nanoseconds/10000; client divides by 100 to obtain milliseconds; performance.now returns fractional milliseconds
            token: '49b2d1793d1d2e68',
            type: this.game_mode_id,
            room: 'ab-ffa',
            players: this.players.map(x=>({
                id: x.id,
                team: x.team,
                status: x.status,
                level: 0,
                name: x.name,
                type: x.planetype,
                posX: x.position.x, 
                posY: x.position.y, 
                rot:x.rotation.current,
                flag: x.flag,
                upgrades: 0//x.upgrades,
            })),
            //     //upgrades: 8 //{powerups: {shield: true, rampage: false}, speedupgrade: 0} (Tools.decodeUpgrades)
            serverConfiguration: JSON.stringify({
                "sf":5500,
                "botsNamePrefix":"",
                playerBounds,
                mapBounds,
                mapId: manifest.mapId,
                parentMapId: manifest.parentMapId,
                mapVersion: manifest.mapVersion,
                ships: manifest.ships,
            }),
            bots: [ /*{ id: 1033 }*/ ]
          };
        ws.callback({data:server_msg});

        // PING
        this.#sendPing(player);

        // BROADCAST_PLAYER_NEW
        this.players.forEach(x=>{
          if (x.ws != ws) {
            x.ws.callback({data:{
              c: ServerPacket.PLAYER_NEW,
              id: player.id,
              status: player.status,
              name: player.name,
              type: player.planetype,
              team: player.team,
              posX: player.position.x,
              posY: player.position.y,
              rot: player.rotation.current,
              flag: player.flag,
              upgrades: 0,
              // upgrades: encodeUpgrades(
              //   player.upgrades.speed,
              //   ~~player.shield.current,
              //   ~~player.inferno.current
              // ),
              isBot: player.bot,
            }});
          }
        });
    }

    close(ws) {
      const player = this.players.find(x=>x.ws.id==ws.id);
      console.log('close', player);
      if (!player)
        return;//close backup connection?
      this.players = this.players.filter(x=>x!=player);
      this.storage.mobIdList.delete(player.id);

      // PLAYERS_REMOVE
      if (player.repel)
        this.#removeCollisionBody(player.repel.hitbox.body);
      this.#removeCollisionBody(player.hitbox.body);
      // if (this.storage.viewportList.has(player.spectate.current)) {
      //   const viewport = this.storage.viewportList.get(player.spectate.current);

      //   viewport.subs.delete(player.id.current);
      // }      
      if (player.viewport)
        this.#removeCollisionBody(player.viewport.body);

      //this.emit(BROADCAST_PLAYER_LEAVE, playerId);
      this.players.forEach(({ws})=>ws.callback({data:{
        c: ServerPacket.PLAYER_LEAVE,
        id: player.id,
      }}));

      //this.emit(PLAYERS_REMOVED, playerId);

      // close
      player.ws.close_callback();
    }

    ack(ws) {
      const player = this.players.find(x=>x.ws.id==ws.id);
      // if (player) {
        player.times.lastAck = Date.now();
      //}
    }

    pong(ws, msg) {
      const player = this.players.find(x=>x.ws.id==ws.id);
      if (msg.num !== player.ping.num) {
        return;
      }
      const clock = performance.now()*100;
      const ping = Math.ceil((clock - player.ping.clock) / 100);
      player.ws.callback({data:{
        c: ServerPacket.PING_RESULT,
        ping,
        playerstotal: this.players.length,
        playersgame: this.players.length,
      }});
      player.ping.num = null;
    }

    key(ws, msg) {
        const player = this.players.find(x=>x.ws.id==ws.id);

        // key.ts
        // if (
        //   player.keystate.seq < msg.seq &&
        //   player.alivestatus.current === PLAYERS_ALIVE_STATUSES.ALIVE &&
        //   this.validKeyCodes.has(msg.key)
        // ) {        
        player.keystate[KEY_NAMES[msg.key]] = msg.state;
        player.keystate.seq = msg.seq;

        // if (msg.state) {
        //     player.keystate.presses.total += 1;
        //     player.keystate.presses[KEY_NAMES[msg.key]] += 1;
        // }

        if (
            msg.key !== KEY_CODES.SPECIAL ||
            (msg.key === KEY_CODES.SPECIAL && SHIPS_SPECS[player.planetype].special === SPECIAL_ABILITIES.STRAFE)
        ) {
            player.delayed.BROADCAST_PLAYER_UPDATE = true;
        }  
    }

    #setShipType(player, shipType) {
      player.planetype = shipType;
      player.hitcircles = [...SHIPS_SPECS[shipType].collisions];
      player.energy.regen = SHIPS_SPECS[shipType].energyRegen * UPGRADES_SPECS.ENERGY.factor[player.upgrades.energy];
  
      if (SHIPS_SPECS[shipType].special === SPECIAL_ABILITIES.REPEL) {
        if (!player.repel) {
          //   this.emit(PLAYERS_REPEL_ADD, player);
          const radius = REPEL_COLLISIONS[0][2];
          const repel = {
            hitbox: {
              x: ~~player.position.x + MAP_SIZE.HALF_WIDTH - radius,
              y: ~~player.position.y + MAP_SIZE.HALF_HEIGHT - radius,
              width: radius * 2,
              height: radius * 2,
              type: COLLISIONS_OBJECT_TYPES.REPEL,
              team: player.team,
            },
            hitcircles: [...REPEL_COLLISIONS],
            position: {...player.position},
            rotation: {
              _current:0, sin: 0, cos: 1, low: 0,
              get current() { return this._current; }, 
            },
          };
          repel.hitbox.body = new Circle(repel.hitbox.x + radius, repel.hitbox.y + radius, radius);
          repel.hitbox.body.id = player;
          player.repel = repel;
          this.#addCollisionBody(repel.hitbox.body);
        }
        
      } else {
        //if (SHIPS_SPECS[previousType].special === SPECIAL_ABILITIES.REPEL) {
        if (player.repel) {
          //   this.emit(PLAYERS_REPEL_DELETE, player);
          this.#removeCollisionBody(player.repel.hitbox.body);
          player.repel = null;
        }
      }
    }

    respawn(ws, ship_type) {
        const player = this.players.find(x=>x.ws.id==ws.id);

        // todo: PLAYERS_RESPAWN_INACTIVITY_MS, flagspeed
        //...

        const shipType = ship_type !== null ? ship_type : player.planetype;
        const isNewShipType = shipType !== player.planetype;

        // PLAYERS_SET_SHIP_TYPE
        this.#setShipType(player, shipType);

        //this.emit(PLAYERS_ASSIGN_SPAWN_POSITION, player);

        // player.shield.current = true;
        // player.shield.endTime = now + PLAYERS_SPAWN_SHIELD_DURATION_MS;
        player.status = PLAYERS_ALIVE_STATUSES.ALIVE;
        player.energy.current = PLAYERS_ENERGY.DEFAULT;
        player.health.current = PLAYERS_HEALTH.DEFAULT;

        player.position.x = 0;
        player.position.y = 0;
        player.velocity.x = 0;
        player.velocity.y = 0;
        player.velocity.isMin = true;
        player.velocity.isMax = false;
        player.rotation.current = 0;

        player.keystate.UP = false;
        player.keystate.DOWN = false;
        player.keystate.LEFT = false;
        player.keystate.RIGHT = false;
        player.keystate.SPECIAL = false;
        player.keystate.STRAFE = false;
        player.keystate.FIRE = false;

        player.planestate.boost = false;
        player.planestate.strafe = false;
        player.planestate.repel = false;
        player.planestate.fire = false;
        player.planestate.stealthed = false;
        player.planestate.flagspeed = false;

        player.inferno.current = false;
        player.inferno.endTime = 0;
  
        const hitbox = shipHitboxesCache[shipType][player.rotation.low];
  
        player.hitbox.width = hitbox.width;
        player.hitbox.height = hitbox.height;
        player.hitbox.x = ~~player.position.x + MAP_SIZE.HALF_WIDTH + hitbox.x;
        player.hitbox.y = ~~player.position.y + MAP_SIZE.HALF_HEIGHT + hitbox.y;
        player.hitbox.body.x = player.hitbox.x - hitbox.x;
        player.hitbox.body.y = player.hitbox.y - hitbox.y;
  
        player.hitbox.body.setPoints([
          [hitbox.x, hitbox.y],
          [-hitbox.x, hitbox.y],
          [-hitbox.x, -hitbox.y],
          [hitbox.x, -hitbox.y],
        ]);
  
        // this.emit(
        //   VIEWPORTS_UPDATE_POSITION,
        //   player.id.current,
        //   ~~player.position.x,
        //   ~~player.position.y
        // );
        if (viewport_enabled)
          this.#updateViewportPosition(player, ~~player.position.x, ~~player.position.y);
  
        // if (player.delayed.RESPAWN) {
        //   this.emit(PLAYERS_UPGRADES_RESET, player.id.current);
        // }

        if (isNewShipType) {
            // this.emit(RESPONSE_SPECTATE_KILL, connection.id, player.id.current);
            // this.emit(BROADCAST_PLAYER_TYPE, player.id.current, shipType);
            this.players.forEach(({ws})=>ws.callback({data:{
                c: ServerPacket.PLAYER_TYPE,
                id: player.id,
                type: player.planetype,
            }}));
        }

        // this.emit(BROADCAST_PLAYER_RESPAWN, player.id.current);
        this.players.forEach(({ws})=>ws.callback({data:{
            c: ServerPacket.PLAYER_RESPAWN,
            id: player.id,
            posX: player.position.x,
            posY: player.position.y,
            rot: player.rotation.current,
            upgrades: 0
        }}));
        
        //...
    }

    get admin() {
      return this.players[0];
    }

    command(ws, cmd, data) {
      if (false) {
      } else if (cmd == 'editor') {
        //if (this.game_mode_id != GameModes.EDITOR) return;
        const [command, ...params] = data.split(" ");

        if (command == 'map') {
          const [subcmd] = params;
          if (subcmd == 'delete_mountain' || subcmd == 'place_mountain') {
            const asset = 0;
            manifest.mapVersion[asset]++;
            if (subcmd == 'delete_mountain') {
              var [,id] = params.map(x=>parseInt(x));
              MAPS[manifest.mapId].mountain_objects.splice(id, 1);
            } else {
              var [,x,y,scale] = params.map(x=>parseInt(x));
              MAPS[manifest.mapId].mountain_objects.push([x, y, scale]);
            }
            this.#unloadMountains();
            this.#loadMountains(MAPS[manifest.mapId].mountain_objects);
            this.players.forEach(({ws})=>ws.callback({data:{
              c: ServerPacket.SERVER_CUSTOM,
              type: 204,
              data: JSON.stringify({command, params:{subcmd, id, x, y, scale, mapId: manifest.mapId, parentMapId: manifest.parentMapId, mapVersion: manifest.mapVersion, asset, player_id:this.admin.id}}),
            }}));
          } else if (subcmd == 'paint') {
            const [,x,y,,radius,gradient,step] = params.map(x=>parseInt(x));
            const [,,,paint_type] = params;
            const asset = paint_type.includes('sea') ? 4 : paint_type.includes('sand') ? 5 : 6;//todo remove hardcoded
            manifest.mapVersion[asset]++;
            this.players.forEach(({ws})=>ws.callback({data:{
              c: ServerPacket.SERVER_CUSTOM,
              type: 204,
              data: JSON.stringify({command, params:{subcmd, x, y, paint_type, brush:{radius,gradient,step}, mapId: manifest.mapId, parentMapId: manifest.parentMapId, mapVersion: manifest.mapVersion, asset, player_id:this.admin.id}}),
            }}));
          } else if (subcmd == 'delete_polygon' || subcmd == 'add_polygon') {
            const asset = 0;
            manifest.mapVersion[asset]++;
            manifest.mapVersion[7]++;//todo remove hardcoded
            if (subcmd == 'delete_polygon') {
              var [,polygon] = params.map(x=>parseInt(x));
            } else {
              var [,points] = params;
              points = JSON.parse(points);
            }
            this.players.forEach(({ws})=>ws.callback({data:{
              c: ServerPacket.SERVER_CUSTOM,
              type: 204,
              data: JSON.stringify({command, params:{subcmd, polygon, points, mapId: manifest.mapId, parentMapId: manifest.parentMapId, mapVersion: manifest.mapVersion, asset, player_id:this.admin.id}}),
            }}));
          }

        } else if (command == 'clone_ship') {
          let [type, name, ...displayName] = params;
          type = parseInt(type);
          displayName = displayName.join(' ');
          if (!SHIPS_SPECS[type])
            return;
          const SHIP_SPECS = {...SHIPS_SPECS[type], name, displayName};
          SHIPS_SPECS.push(SHIP_SPECS);
          manifest.ships.push([0, 0, 0]);
          const new_type = SHIPS_SPECS.length - 1;
          shipHitboxesCache[new_type] = getHitboxCache(SHIPS_SPECS[new_type].collisions);

          this.players.forEach(({ws})=>ws.callback({data:{
            c: ServerPacket.SERVER_CUSTOM,
            type: 204,
            data: JSON.stringify({command,params:{new_type, type, name, displayName, player_id:this.admin.id}}),
          }}));
        } else if (command == 'del_ship') {
          let [type] = params.map(x=>parseInt(x));

          if (SHIPS_SPECS.filter(x=>x).length <= 1)
            return;

          SHIPS_SPECS[type] = null;
          manifest.ships[type] = null;
          shipHitboxesCache[type] = null;
          this.players.forEach(({ws, planetype})=>{
            if (planetype == type)
              server.respawn(ws, SHIPS_SPECS[1]?1:2);
          });

          this.players.forEach(({ws})=>ws.callback({data:{
            c: ServerPacket.SERVER_CUSTOM,
            type: 204,
            data: JSON.stringify({command,params:{type, player_id:this.admin.id}}),
          }}));   
        } else if (command == 'edit_ship') {
          const [subcmd] = params;
          if (subcmd == 'texture') {
            const [, type, version, anchor_x, anchor_y] = params.map(x=>parseFloat(x));
            if (version > manifest.ships[type][1]) {
              manifest.ships[type][1] = version;
              manifest.ships[type][2] = version;

              manifest.ships[type][0]++;
            
              this.players.forEach(({ws})=>ws.callback({data:{
                c: ServerPacket.SERVER_CUSTOM,
                type: 204,
                data: JSON.stringify({command, params:{subcmd, type, anchor:[anchor_x, anchor_y], ships: manifest.ships, player_id:this.admin.id}}),
              }}));  
            }
          } else if (subcmd == 'prop') {
            let [, type, prop_type, k, v] = params;
            type = parseInt(type);
            let is_valid = false;
            if (prop_type == 'float') {
              v = parseFloat(v);
              is_valid = !isNaN(v);
            } else if (prop_type == 'json') {
              try {
                v = JSON.parse(v);
                is_valid = true;
              } catch {}
            }
            if (is_valid) {
              manifest.ships[type][0]++;
              // k = 'prop1.prop2' -> SHIPS_SPECS[type][prop1][prop2] = v
              let target = SHIPS_SPECS[type];
              let path = k.split('.');
              path.slice(0,-1).forEach(x=>target=target[x]);
              target[path.at(-1)] = v;

              if (k == 'collisions') {
                shipHitboxesCache[type] = getHitboxCache(SHIPS_SPECS[type].collisions);
                this.players.filter(x=>x.planetype==type).forEach(x=>x.hitcircles = [...SHIPS_SPECS[type].collisions]);
              }

              this.players.forEach(({ws})=>ws.callback({data:{
                c: ServerPacket.SERVER_CUSTOM,
                type: 204,
                data: JSON.stringify({command, params:{subcmd, type, k, v, ships: manifest.ships, player_id:this.admin.id}}),
              }}));
            }
          }

        } else if (command == 'bounds') {
          //...

        } else if (command == 'place_box') {
          //...

        }

      } if (cmd == 'server') {
        const [command, ...params] = data.split(" ");
        if (command == 'map') {
          const [mapId] = params;
          this.#unloadMountains();
          this.#loadMountains(MAPS[mapId].mountain_objects);
          this.players.forEach(({ws})=>ws.callback({data:{
              c: ServerPacket.SERVER_CUSTOM,
              type: 203,
              data: JSON.stringify({ playerBounds, mapBounds, mapId: manifest.mapId, parentMapId: manifest.parentMapId, mapVersion: manifest.mapVersion, ships: manifest.ships, }),
            }}));
          //...emit MAP_CHANGED
        } else if (command == 'mode') {
          const [game_mode_id] = params.map(x=>parseInt(x));
          if (game_mode_id !== this.game_mode_id) {
            this.game_mode_id = game_mode_id;
            this.players.forEach(({ws})=>ws.callback({data:{
              c: ServerPacket.SERVER_CUSTOM,
              type: 202,
              data: JSON.stringify({ type:game_mode_id }),
            }}));
          }

        } else if (command == 'editor') {
          const [subcmd] = params;
          if (false) {
          } else if (subcmd == 'bounds') {
            // /server editor bounds -2000 -2000 2000 2000
            const [, MIN_X, MIN_Y, MAX_X, MAX_Y] = params.map(x=>parseInt(x));
            setBounds({MIN_X, MIN_Y, MAX_X, MAX_Y});
            this.players.forEach(({ws})=>ws.callback({data:{
              c: ServerPacket.SERVER_CUSTOM,
              type: 203,
              data: JSON.stringify({ playerBounds, mapBounds, mapId: manifest.mapId, parentMapId: manifest.parentMapId, mapVersion: manifest.mapVersion }),
            }}));

          } else if (subcmd == 'place_box') {
            // /server editor place_box 9 10 -100
            const [, type, posX, posY] = params.map(x=>parseInt(x));
            // type 4=upgrade 8=shield 9=inferno 200=firewall
            const hitboxCache = powerupHitboxCache[type];
            let collitionsType = COLLISIONS_OBJECT_TYPES.INFERNO;
            if (type === MOB_TYPES.UPGRADE) {
              collitionsType = COLLISIONS_OBJECT_TYPES.UPGRADE;
            } else if (type === MOB_TYPES.SHIELD) {
              collitionsType = COLLISIONS_OBJECT_TYPES.SHIELD;
            }
            const box = {
              id: this.#createMobId(),
              mobtype: type,
              hitbox: {
                width: hitboxCache.width,
                height: hitboxCache.height,
                x: ~~posX + MAP_SIZE.HALF_WIDTH + hitboxCache.x,
                y: ~~posY + MAP_SIZE.HALF_HEIGHT + hitboxCache.y,
              },
              hitcircles: [...POWERUPS_COLLISIONS[type]],
              position: {x:posX, y:posY},
              rotation: {
                _current:0, sin: 0, cos: 1, low: 0,
                get current() { return this._current; }, 
              },
            };
            const body = new Circle(box.hitbox.x - hitboxCache.x, box.hitbox.y - hitboxCache.y, hitboxCache.width / 2);
            body.id = box;
            body.type = collitionsType;
            body.isCollideWithViewport = true;
            body.isCollideWithPlayer = true;
            body.isBox = true;
            box.hitbox.body = body;
            this.#addCollisionBody(body);
            this.boxes.push(box);

            if (!viewport_enabled) {
              this.players.forEach(({ws})=>ws.callback({data:{
                c: ServerPacket.MOB_UPDATE_STATIONARY,
                id: box.id,
                type: box.mobtype,
                posX: box.position.x,
                posY: box.position.y,
              }}));
            }
          }
        }
      }
    }

    // chat(conn, text) {
    //   const player = this.players.find(x=>x.ws.id==ws.id);
    //   this.players.forEach(({ws})=>ws.callback({data:{
    //     c: ServerPacket.CHAT_PUBLIC,
    //     id: player.id,
    //     text,
    //   }}));
    // }
}


const server = new Server();
requestAnimationFrame((timestamp)=>server.loop(timestamp));

function beacon() { postMessage({id:-1, data:{players:server.players.length, type:server.game_mode_id}}); }
setInterval(beacon, 30*1000);