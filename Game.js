import { PIXIRenderer } from "./renderer_pixi.js";
import { WebgpuRenderer } from "./renderer_webgpu.js";

window.DEVELOPMENT = (
    /^http:\/\/127\.0\.0\.1:[0-9]{1,5}\/?$/.test(window.origin) ||
    (new URLSearchParams(window.location.search)).has('dev')
);

const renderer = new URL(location.href).searchParams.get('renderer');

window.game = {
    protocol: 5,
    //version: '2.0.8',
    state: 0,
    focus: true,
    screenX: 0,
    screenY: 0,
    halfScreenX: 0,
    halfScreenY: 0,
    scale: 1,
    spectatingID: null,
    myID: null,
    myType: null,
    myTeam: null,
    myUserID: "",
    myName: "",
    myOriginalName: "",
    myScore: 0,
    myPlace: 0,
    myLevel: 0,
    myToken: "",
    myFlag: "xx",
    loggedIn: false,
    roomName: "",
    roomNameShort: "",
    regionName: "",
    gameType: null,
    inviteLink: "",
    lastFlagSet: "xx",
    reloading: false,
    ping: 0,
    lagging: false,
    timeFactor: 1,
    timeFactorUncapped: 1,
    time: 0,
    timeNetwork: 0,
    jitter: 0,
    frames: 0,
    shadowX: 0,
    shadowY: 0,
    //graphics: {},
    debug: {},
    buckets: [],
    serverUrl: null,
    backendHost: !location.href.includes('old') ? "data.airmash.rocks" : "data.airmash.online",
    server: {
        config: {
            playerBounds: {MIN_X: -16352, MIN_Y: -8160, MAX_X: 16352, MAX_Y: 8160},
            mapBounds: {MIN_X: -16384, MIN_Y: -8192, MAX_X: 16384, MAX_Y: 8192},
            mapId: 'vanilla',
            parentMapId: null,
            mapVersion: [0,0,0,0,0,0,0,0],
            ships: true ||renderer=='threejs'||renderer=='webgpu' ? [, [0,0,0], [0,0,0], [0,0,0], [0,0,0], [0,0,0]] : undefined,
        },
    }, // { id, config: interface LoginServerConfig }
    editorMode: false,
    freeCamera: false,
};

window.config = {
    skins: {
        MAX_URL_LENGTH: 60,
        MAX_IMG_BYTES: {512:25000, 256:18000, 128:12000},
    },
    airmashRefugees: {
        // Multiply all sprite font sizes (for blind people)
        fontSizeMul: 1.0,
        // Replace non-ASCII nicks with "playerXXX", where XXX is player ID.
        unicodeWorkaround: false
    },
    settings: {},
    auth: {},
    manifest: {
        mapId: null,
        parentMapId: null,
        mapVersion: [0,0,0,0,0,0,0,0],
        ships: [, [0,0,0], [0,0,0], [0,0,0], [0,0,0], [0,0,0]],
    },
    ships: [],
    /*
     * This array contains elements whose index is a missile MobType and whose
     * value is an object with keys:
     *      * thruster: [xScale, yScale] to size the exhaust
     *      * exhaust: offset from top(?) of missile texture where exhaust appears
     * Optional:
     *      * thrusterGlowAlpha: 0..1.0, cannot be 0.0, default 1.0
     *      * smokeGlowAlpha: 0..1.0, default 1.0
     *      * thrusterAlpha: 0..1.0, default 1.0
     */
    mobs: [
        // Unused (0)
        {},
        // MobType.PredatorMissile (1)
        {
            exhaust: 20,
            thruster: [.2, .4]
        },
        // MobType.GoliathMissile (2)
        {
            exhaust: 30,
            thruster: [.3, .6]
        },
        // MobType.MohawkMissile (3)
        {
            exhaust: 18,
            thruster: [.14, .3]
        },
        // MobType.Upgrade (4)
        {},
        // MobType.TornadoSingleMissile (5)
        {
            exhaust: 20,
            thruster: [.2, .4]
        },
        // MobType.TornadoTripleMissile (6)
        {
            exhaust: 20,
            thruster: [.2, .4]
        },
        // MobType.ProwlerMssile (7)
        {
            exhaust: 20,
            thruster: [.2, .4]
        },
        // Unused (8)
        {},
        // Unused (9)
        {},
        // Unused (10)
        {},
        // Unused (11)
        {},
        // MobType.CarrotMissile (12)
        {
            exhaust: 18,
            thruster: [.15, .3],
            thrusterGlowAlpha: 0.5,
            smokeGlowAlpha: 0.5,
            thrusterAlpha: 0.5
        }
    ],
    upgrades: {
        speed: {
            cost: [0, 1, 1, 1, 1, 1],
            factor: [1, 1.05, 1.1, 1.15, 1.2, 1.25]
        },
        defense: {
            cost: [0, 1, 1, 1, 1, 1],
            factor: [1, 1.05, 1.1, 1.15, 1.2, 1.25]
        },
        energy: {
            cost: [0, 1, 1, 1, 1, 1],
            factor: [1, 1.05, 1.1, 1.15, 1.2, 1.25]
        },
        missile: {
            cost: [0, 1, 1, 1, 1, 1],
            factor: [1, 1.05, 1.1, 1.15, 1.2, 1.25]
        }
    },

    groundDoodads: [
        [-9670, -1470, "doodadField", .5, 0, null, null],
        [8600, -940, "doodadField", .5, 0, null, null],
        [920, -2800, "doodadField", .5, 0, null, null]
    ],
    objects: {
        bases: [
          null,
          [-9670, -1470], //blue
          [8600, -940],   //red
        ]
    },
    debug: {
        show: true,
        collisions: false
    },
    mobile: false,
    ios: false,
    phone: false,
    tablet: false,
    mouse: false,
    resolution: 1,
    overdrawOptimize: true,
    overdraw: 256,
    scalingFactor: 2500,
    altScalingFactor: 4000,
    minimapPaddingX: 16,
    minimapPaddingY: 16,
    minimapSize: 240,
    maxChatLines: 50,
    maxScoreboard: 12,
    shadowScaling: 2,
    shadowOffsetX: 20,
    shadowOffsetY: 40,
    ackFrequency: 10,
    bucketSize: 512,
    mapWidth: 32768,
    mapHeight: 16384
};


// ab-protocol/src/types/flags.ts
window.CountryNames = {
  AL: 'Albania',
  DZ: 'Algeria',
  AD: 'Andorra',
  AQ: 'Antarctica',
  AR: 'Argentina',
  AM: 'Armenia',
  AU: 'Australia',
  AT: 'Austria',
  AZ: 'Azerbaijan',
  BH: 'Bahrain',
  BD: 'Bangladesh',
  BY: 'Belarus',
  BE: 'Belgium',
  BT: 'Bhutan',
  BO: 'Bolivia',
  BA: 'Bosnia and Herzegovina',
  BR: 'Brazil',
  BG: 'Bulgaria',
  CA: 'Canada',
  CL: 'Chile',
  CN: 'China',
  CO: 'Colombia',
  COMMUNIST: 'Communist',
  CONFEDERATE: 'Confederate',
  CR: 'CostaRica',
  HR: 'Croatia',
  CU: 'Cuba',
  CY: 'Cyprus',
  CZ: 'Czech Republic',
  DK: 'Denmark',
  DO: 'Dominican Republic',
  KP: 'DPRK',
  EC: 'Ecuador',
  EG: 'Egypt',
  SV: 'ElSalvador',
  EE: 'Estonia',
  EU: 'European Union',
  FI: 'Finland',
  FR: 'France',
  GE: 'Georgia',
  DE: 'Germany',
  GR: 'Greece',
  GT: 'Guatemala',
  HN: 'Honduras',
  HK: 'HongKong',
  HU: 'Hungary',
  IS: 'Iceland',
  IMPERIAL: 'Imperial Japan',
  IN: 'India',
  ID: 'Indonesia',
  IR: 'Iran',
  IQ: 'Iraq',
  IE: 'Ireland',
  IM: 'Isle of Man',
  IL: 'Israel',
  IT: 'Italy',
  JM: 'Jamaica',
  JP: 'Japan',
  JOLLY: 'Jolly Roger',
  JO: 'Jordan',
  KZ: 'Kazakhstan',
  KW: 'Kuwait',
  LV: 'Latvia',
  LB: 'Lebanon',
  LY: 'Libyan Arab Jamahiriya',
  LI: 'Liechtenstein',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  MO: 'Macao',
  MK: 'Macedonia',
  MY: 'Malaysia',
  MT: 'Malta',
  MX: 'Mexico',
  MD: 'Moldova',
  MC: 'Monaco',
  ME: 'Montenegro',
  MA: 'Morocco',
  NP: 'Nepal',
  NL: 'Netherlands',
  NZ: 'New Zealand',
  NG: 'Nigeria',
  NO: 'Norway',
  OM: 'Oman',
  PK: 'Pakistan',
  PA: 'Panama',
  PY: 'Paraguay',
  PE: 'Peru',
  PH: 'Philippines',
  PL: 'Poland',
  PT: 'Portugal',
  PR: 'PuertoRico',
  QA: 'Qatar',
  RAINBOW: 'Rainbow',
  RO: 'Romania',
  RU: 'Russian Federation',
  SM: 'SanMarino',
  SA: 'Saudi Arabia',
  RS: 'Serbia',
  SG: 'Singapore',
  SK: 'Slovakia',
  SI: 'Slovenia',
  SO: 'Somalia',
  ZA: 'South Africa',
  KR: 'South Korea',
  ES: 'Spain',
  LK: 'Sri Lanka',
  SE: 'Sweden',
  CH: 'Switzerland',
  SY: 'Syrian Arab Republic',
  TW: 'Taiwan',
  TZ: 'Tanzania',
  TH: 'Thailand',
  TT: 'Trinidad and Tobago',
  TN: 'Tunisia',
  TR: 'Turkey',
  TM: 'Turkmenistan',
  UA: 'Ukraine',
  AE: 'United Arab Emirates',
  GB: 'United Kingdom',
  UN: 'United Nations',
  US: 'United States',
  UY: 'Uruguay',
  UZ: 'Uzbekistan',
  VE: 'Venezuela',
  VN: 'Vietnam',
};


// ab-protocol/src/types/flags.ts
window.FlagCodeById = {
  1: 'SY',
  2: 'TH',
  3: 'TM',
  4: 'TN',
  5: 'TR',
  6: 'TT',
  7: 'TW',
  8: 'TZ',
  9: 'UA',
  10: 'UN',
  11: 'US',
  12: 'UY',
  13: 'UZ',
  14: 'VE',
  15: 'VN',
  16: 'PR',
  17: 'PT',
  18: 'PY',
  19: 'QA',
  20: 'RAINBOW',
  21: 'RO',
  22: 'RS',
  23: 'RU',
  24: 'SA',
  25: 'SE',
  26: 'SG',
  27: 'SI',
  28: 'SK',
  29: 'SM',
  30: 'MK',
  31: 'MO',
  32: 'MT',
  33: 'MX',
  34: 'MY',
  35: 'NG',
  36: 'NL',
  37: 'NO',
  38: 'NP',
  39: 'NZ',
  40: 'OM',
  41: 'PA',
  42: 'PE',
  43: 'JP',
  44: 'KP',
  45: 'KR',
  46: 'KW',
  47: 'KZ',
  48: 'LB',
  49: 'LI',
  50: 'LK',
  51: 'LT',
  52: 'LU',
  53: 'LV',
  54: 'HN',
  55: 'HR',
  56: 'HU',
  57: 'ID',
  58: 'IE',
  59: 'IL',
  60: 'IM',
  61: 'IMPERIAL',
  62: 'IN',
  63: 'IQ',
  64: 'DE',
  65: 'DK',
  66: 'DO',
  67: 'DZ',
  68: 'EC',
  69: 'EE',
  70: 'EG',
  71: 'ES',
  72: 'EU',
  73: 'BH',
  74: 'BO',
  75: 'BR',
  76: 'BT',
  77: 'BY',
  78: 'CA',
  79: 'CH',
  80: 'AD',
  81: 'AE',
  82: 'AL',
  83: 'AM',
  84: 'CL',
  85: 'AQ',
  86: 'CN',
  87: 'AR',
  88: 'FI',
  89: 'CO',
  90: 'AT',
  91: 'IR',
  92: 'FR',
  93: 'COMMUNIST',
  94: 'AU',
  95: 'LY',
  96: 'IS',
  97: 'GB',
  98: 'CONFEDERATE',
  99: 'AZ',
  100: 'MA',
  101: 'IT',
  102: 'GE',
  103: 'CR',
  104: 'BA',
  105: 'PH',
  106: 'MC',
  107: 'JM',
  108: 'GR',
  109: 'CU',
  110: 'BD',
  111: 'SO',
  112: 'PK',
  113: 'MD',
  114: 'JO',
  115: 'GT',
  116: 'CY',
  117: 'BE',
  118: 'ZA',
  119: 'SV',
  120: 'PL',
  121: 'ME',
  122: 'JOLLY',
  123: 'HK',
  124: 'CZ',
  125: 'BG'
};

// airmash-protocol-rs/blob/master/src/enums/game_type.rs
window.GameType = {
    FFA: 1,
    CTF: 2,
    BTR: 3,
    CONQUEST: 5,
    EDITOR: 6,
};

// airmash-protocol-rs/blob/master/src/enums/plane_type.rs
window.PlaneType = {
    Predator: 1,
    Goliath: 2,
    Mohawk: 3,
    Tornado: 4,
    Prowler: 5
};

// airmash-protocol-rs/blob/master/src/enums/mob_type.rs
window.MobType = {
    PredatorMissile: 1,
    GoliathMissile: 2,
    MohawkMissile: 3,
    Upgrade: 4,
    TornadoSingleMissile: 5,
    TornadoTripleMissile: 6,
    ProwlerMissile: 7,
    Shield: 8,
    Inferno: 9,

    // Frivolity
    CarrotMissile: 12,
    MagicCrate: 13
};

// IDs in this set have 'missile' behaviour in Mob.js, i.e. they get a thruster
// and are expected to move.
window.MissileMobTypeSet = {
    [MobType.PredatorMissile]: true,
    [MobType.GoliathMissile]: true,
    [MobType.MohawkMissile]: true,
    [MobType.TornadoSingleMissile]: true,
    [MobType.TornadoTripleMissile]: true,
    [MobType.ProwlerMissile]: true,

    // Frivolity
    [MobType.CarrotMissile]: true
};

// IDs in this set have 'crate' behaviour in Mob.js. They have no thruster and
// are expected to be stationary.
window.CrateMobTypeSet = {
    [MobType.Upgrade]: true,
    [MobType.Shield]: true,
    [MobType.Inferno]: true,

    // Frivolity
    [MobType.MagicCrate]: true
};

window.MobDespawnType = {
    LifetimeEnded: 0,
    Collided: 1
};

// Mapping from MobType to Textures.js name for the box image used to render a
// crate from CrateMobTypeSet.
window.CrateTextureNameByMobType = {
    [MobType.Upgrade]: "crateUpgrade",
    [MobType.Shield]: "crateShield",
    [MobType.Inferno]: "crateRampage",
    [MobType.MagicCrate]: "crateMagic"
};


window.Tools = {};
window.Network = {};
window.Input = {};
window.Players = {};
window.Mobs = {};
window.UI = {};
window.Games = {};
window.Sound = {};

if (renderer == 'pixi') {
    game.renderer = new PIXIRenderer();
} else {
    game.renderer = new WebgpuRenderer();
    config.shadowScaling = 1;
}
var scheduleFrame = function(fractionalFramesSinceLastFrame, skipGraphicsRendering) {
    game.timeFactor = fractionalFramesSinceLastFrame < 60 ? fractionalFramesSinceLastFrame : 60,
    game.timeFactorUncapped = game.timeFactor,
    game.timeFactor > 10 && (game.timeFactor = 10),
    game.time = performance.now(),
    game.frames++;

    Tools.debugStartFrame();
    if (game.state == Network.STATE.PLAYING) {
        Input.update();
        Network.detectConnectivity();
        var {all_players, visible_players, visible_objects_count} = Players.update();
        var {visible_mobs, visible_mobs_count} = Mobs.update();
        Games.update();
        Sound.update();
    } else if (game.state == Network.STATE.LOGIN) {
        var {visible_players, visible_objects_count, visible_mobs, visible_mobs_count} = Tools.updateReel();
    } else {;
        Sound.update();
    }
    const visible_doodads = Mobs.updateDoodads();
    game.renderer.render(all_players||[], visible_players||[], visible_doodads, visible_mobs||[], {...visible_objects_count||{}, ...(visible_mobs_count||{})});
    Tools.debugEndFrame();
};

// var scheduleOccasionalFrameWhileBlurred = function() {
//     var msSinceLastFrame = performance.now() - game.time;
//     msSinceLastFrame > 450 && !game.focus && scheduleFrame(msSinceLastFrame / 16.666, true)
// };

window.addEventListener('DOMContentLoaded', async function(){
    game.state = Network.STATE.LOGIN;
    Tools.loadSettings();
    Tools.detectCapabilities();
    Tools.setupDebug();
    await game.renderer.init();
    UI.setup();
    Input.setup();
    Games.setup();
    Sound.setup();

    const TARGET_FPS = 60;
    const TARGET_FRAME_MS = 1000 / TARGET_FPS;
    let lastTime = 0;
    function loop(currentTime) {
        requestAnimationFrame(loop);

        if (lastTime === 0) {
            lastTime = currentTime;
        }

        const deltaMS = currentTime - lastTime;

        // ratio of how much time actually passed vs. how much time *should* have passed for one frame.
        const fractionalFramesSinceLastFrame = deltaMS / TARGET_FRAME_MS;

        scheduleFrame(fractionalFramesSinceLastFrame);

        lastTime = currentTime;
    }
    requestAnimationFrame(loop);

    //setInterval(scheduleOccasionalFrameWhileBlurred, 500);
});

