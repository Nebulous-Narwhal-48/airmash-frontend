import { mat4, vec3 } from 'https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19.1/+esm';
import Stats from 'https://cdn.jsdelivr.net/npm/stats.js@0.17.0/src/Stats.min.js';
import earcut from 'https://cdn.jsdelivr.net/npm/earcut/+esm';
import Vector from './Vector.js';
import { load_assets, SHIP_ASSETS } from './assets.js';


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

const TEXTURE_ARRAY_1_MAX_DEPTH = 23;
const TEXTURE_ARRAY_2_MAX_DEPTH = 20;
const TEXTURE_ARRAY_1_MAX_SIZE = {w:512, h:512}, TEXTURE_ARRAY_2_MAX_SIZE = {w:256, h:256};
function uv([x, y, w, h], {w:max_w, h:max_h}) {
    return {uv: [x/max_w, (max_h-y-h)/max_h/*flip y*/, w / max_w, h / max_h], w, h};
}
const uvs = {
    doodad_field: uv([0, 0, 256, 256], TEXTURE_ARRAY_1_MAX_SIZE),
    minimap: uv([0, 256, 512, 256], TEXTURE_ARRAY_1_MAX_SIZE),
    minimap_box: uv([400, 268, 64, 64], TEXTURE_ARRAY_1_MAX_SIZE),
    minimap_mob: uv([464, 268, 16, 16], TEXTURE_ARRAY_1_MAX_SIZE),
    minimap_blue: uv([480, 268, 16, 16], TEXTURE_ARRAY_1_MAX_SIZE),
    minimap_flag_blue: uv([224, 400, 32, 32], TEXTURE_ARRAY_1_MAX_SIZE),
    minimap_flag_red: uv([256, 400, 32, 32], TEXTURE_ARRAY_1_MAX_SIZE),
    minimap_base_blue: uv([288, 400, 32, 32], TEXTURE_ARRAY_1_MAX_SIZE),
    minimap_base_red: uv([320, 400, 32, 32], TEXTURE_ARRAY_1_MAX_SIZE),
    thruster: uv([0, 268, 128, 128], TEXTURE_ARRAY_1_MAX_SIZE),
    thruster_glow: uv([136, 268, 64, 64], TEXTURE_ARRAY_1_MAX_SIZE),
    smoke_glow: uv([208, 268, 64, 64], TEXTURE_ARRAY_1_MAX_SIZE),
    rotor: uv([264, 0, 128, 128], TEXTURE_ARRAY_1_MAX_SIZE),
    missile: uv([392, 0, 32, 128], TEXTURE_ARRAY_1_MAX_SIZE),
    missile_fat: uv([424, 0, 64, 128], TEXTURE_ARRAY_1_MAX_SIZE),
    missile_small: uv([488, 0, 16, 128], TEXTURE_ARRAY_1_MAX_SIZE),
    crate_rampage: uv([256, 128, 128, 128], TEXTURE_ARRAY_1_MAX_SIZE),
    crate_shield: uv([384, 128, 128, 128], TEXTURE_ARRAY_1_MAX_SIZE),
    crate_upgrade: uv([272, 268, 128, 128], TEXTURE_ARRAY_1_MAX_SIZE),
    badge_bronze: uv([0, 400, 64, 64], TEXTURE_ARRAY_1_MAX_SIZE),
    badge_silver: uv([64, 400, 64, 64], TEXTURE_ARRAY_1_MAX_SIZE),
    badge_gold: uv([128, 400, 64, 64], TEXTURE_ARRAY_1_MAX_SIZE),
    levelborder: uv([192, 400, 32, 32], TEXTURE_ARRAY_1_MAX_SIZE),
    flash_1: uv([0, 0, 120, 120], TEXTURE_ARRAY_1_MAX_SIZE),
    flash_2: uv([0, 128, 120, 120], TEXTURE_ARRAY_1_MAX_SIZE),
    flash_3: uv([128, 0, 120, 120], TEXTURE_ARRAY_1_MAX_SIZE),
    flash_4: uv([128, 128, 120, 120], TEXTURE_ARRAY_1_MAX_SIZE),
    spark_1: uv([256, 0, 8, 8], TEXTURE_ARRAY_1_MAX_SIZE),
    spark_2: uv([272, 0, 8, 8], TEXTURE_ARRAY_1_MAX_SIZE),
    spark_3: uv([288, 0, 8, 8], TEXTURE_ARRAY_1_MAX_SIZE),
    spark_4: uv([304, 0, 8, 8], TEXTURE_ARRAY_1_MAX_SIZE),
    smoke_1: uv([320, 0, 32, 32], TEXTURE_ARRAY_1_MAX_SIZE),
    smoke_2: uv([352, 0, 32, 32], TEXTURE_ARRAY_1_MAX_SIZE),
    smoke_3: uv([384, 0, 32, 32], TEXTURE_ARRAY_1_MAX_SIZE),
    smoke_4: uv([416, 0, 32, 32], TEXTURE_ARRAY_1_MAX_SIZE),
    smoke_5: uv([448, 0, 32, 32], TEXTURE_ARRAY_1_MAX_SIZE),
    smoke_6: uv([480, 0, 32, 32], TEXTURE_ARRAY_1_MAX_SIZE),
    smoke_7: uv([256, 32, 32, 32], TEXTURE_ARRAY_1_MAX_SIZE),
    smoke_8: uv([288, 32, 32, 32], TEXTURE_ARRAY_1_MAX_SIZE),
    smoke_9: uv([320, 32, 32, 32], TEXTURE_ARRAY_1_MAX_SIZE),
    smoke_10: uv([352, 32, 32, 32], TEXTURE_ARRAY_1_MAX_SIZE),
    smoke_11: uv([384, 32, 32, 32], TEXTURE_ARRAY_1_MAX_SIZE),
    smoke_12: uv([416, 32, 32, 32], TEXTURE_ARRAY_1_MAX_SIZE),
    smoke_13: uv([448, 32, 32, 32], TEXTURE_ARRAY_1_MAX_SIZE),
    smoke_14: uv([480, 32, 32, 32], TEXTURE_ARRAY_1_MAX_SIZE),
    smoke_15: uv([256, 64, 32, 32], TEXTURE_ARRAY_1_MAX_SIZE),
    smoke_16: uv([288, 64, 32, 32], TEXTURE_ARRAY_1_MAX_SIZE),
    glowsmall: uv([320, 64, 64, 64], TEXTURE_ARRAY_1_MAX_SIZE),
    hotsmoke_1: uv([0, 256, 120, 120], TEXTURE_ARRAY_1_MAX_SIZE),
    hotsmoke_2: uv([128, 256, 120, 120], TEXTURE_ARRAY_1_MAX_SIZE),
    hotsmoke_3: uv([256, 256, 120, 120], TEXTURE_ARRAY_1_MAX_SIZE),
    hotsmoke_4: uv([384, 256, 120, 120], TEXTURE_ARRAY_1_MAX_SIZE),
    shockwave: uv([0, 384, 128, 128], TEXTURE_ARRAY_1_MAX_SIZE),
    powerup_circle: uv([128, 384, 128, 128], TEXTURE_ARRAY_1_MAX_SIZE),
    powerup_rampage: uv([256, 384, 128, 128], TEXTURE_ARRAY_1_MAX_SIZE),
    powerup_shield: uv([384, 384, 128, 128], TEXTURE_ARRAY_1_MAX_SIZE),
    ctf_flag_blue: uv([256, 128, 128, 128], TEXTURE_ARRAY_1_MAX_SIZE),
    ctf_flag_red: uv([384, 128, 128, 128], TEXTURE_ARRAY_1_MAX_SIZE),
    thruster_shadow: uv([0, 0, 32, 32], TEXTURE_ARRAY_2_MAX_SIZE),
    rotor_shadow: uv([40, 0, 64, 64], TEXTURE_ARRAY_2_MAX_SIZE),
    smokeshadow_1: uv([0, 64, 32, 32], TEXTURE_ARRAY_2_MAX_SIZE),
    smokeshadow_2: uv([32, 64, 32, 32], TEXTURE_ARRAY_2_MAX_SIZE),
    smokeshadow_3: uv([64, 64, 32, 32], TEXTURE_ARRAY_2_MAX_SIZE),
    smokeshadow_4: uv([96, 64, 32, 32], TEXTURE_ARRAY_2_MAX_SIZE),
    smokeshadow_5: uv([128, 64, 32, 32], TEXTURE_ARRAY_2_MAX_SIZE),
    smokeshadow_6: uv([160, 64, 32, 32], TEXTURE_ARRAY_2_MAX_SIZE),
    smokeshadow_7: uv([192, 64, 32, 32], TEXTURE_ARRAY_2_MAX_SIZE),
    smokeshadow_8: uv([224, 64, 32, 32], TEXTURE_ARRAY_2_MAX_SIZE),
    smokeshadow_9: uv([0, 96, 32, 32], TEXTURE_ARRAY_2_MAX_SIZE),
    smokeshadow_10: uv([32, 96, 32, 32], TEXTURE_ARRAY_2_MAX_SIZE),
    smokeshadow_11: uv([64, 96, 32, 32], TEXTURE_ARRAY_2_MAX_SIZE),
    smokeshadow_12: uv([96, 96, 32, 32], TEXTURE_ARRAY_2_MAX_SIZE),
    smokeshadow_13: uv([128, 96, 32, 32], TEXTURE_ARRAY_2_MAX_SIZE),
    smokeshadow_14: uv([160, 96, 32, 32], TEXTURE_ARRAY_2_MAX_SIZE),
    smokeshadow_15: uv([192, 96, 32, 32], TEXTURE_ARRAY_2_MAX_SIZE),
    smokeshadow_16: uv([224, 96, 32, 32], TEXTURE_ARRAY_2_MAX_SIZE),
    missile_shadow: uv([0, 128, 32, 128], TEXTURE_ARRAY_2_MAX_SIZE),
    crate_shadow: uv([104, 0, 64, 64], TEXTURE_ARRAY_2_MAX_SIZE),
    ctf_flag_shadow: uv([168, 0, 64, 64], TEXTURE_ARRAY_2_MAX_SIZE),
};
(() => {
    const COLS = 6, FLAG_W = 80, FLAG_H = 60;
    for (let i=1; i<=125; i++) {
        let localIndex, layer;
        if (i <= 48) {
            localIndex = i - 1; layer = 0;
        } else if (i <= 96) {
            localIndex = i - 49; layer = 1;
        } else {
            localIndex = i - 97; layer = 2;
        }
        const x = (localIndex % COLS) * FLAG_W;
        const y = Math.floor(localIndex / COLS) * FLAG_H;
        uvs[`flag_${i}`] = { ...uv([x, y, FLAG_W, FLAG_H], TEXTURE_ARRAY_1_MAX_SIZE), layer };
    }
})();
const MOUNTAIN_TYPES = 4;
const SHADOW_OVERLAY = 1, MINIMAP_BOX = 1, MINIMAP_MAP = 1, CTF_FLAGS = 2, CTF_BASES = 2;
const MAX_UI = 50; //hud,
const MAX_PLAYER_NAME_GLYPHS = 20, MAX_LEVEL_GLYPHS = 3;
const MAX_DOODADS = 1000;
const MAX_PLAYERS = 200;
const MAX_THRUSTERS = 3 * 3; //3 thrusters per ship * 3=flame+shadow+glow
const MAX_ROTORS = 1 * 2; //1 rotor per ship * 2=rotor+shadow
const MAX_PARTICLES = 5000;
const MAX_CRATES = 200;
const MAX_GAME_OBJECTS = 3*CTF_FLAGS + CTF_BASES;//3=flag+shadow+minimap
const MAX_INSTANCES = MAX_PLAYERS * (8 + 5*5 + MAX_THRUSTERS + MAX_ROTORS + MAX_PLAYER_NAME_GLYPHS + MAX_LEVEL_GLYPHS) + SHADOW_OVERLAY + MINIMAP_BOX + MINIMAP_MAP + MAX_CRATES + MAX_GAME_OBJECTS + MAX_UI; //8=ship+shadow+minimap+powerup+powerup_circle+flag+levelborder+badge  5*5=missiles*(body+shadow,..)
const INSTANCE_STRIDE_FLOATS = 16;
const depthStencilFormat = 'depth24plus-stencil8';
const shadowScaling = 2.0;
const array_1_layout = {
    items: 0,
    mountain: 1,
    particles: 5,
    minimap: 6,
    flags: 7,
    text: 10,
    ships: 12,
};
const array_2_layout = {
    items: 0,
    ships: 1,
};
const TINT = {
    WHITE: 0xFFFFFF,
    ORANGE_SPARK: 0xFF4F01,   // Explosion sparks, Hot smoke
    YELLOW_FLASH: 0xF3F3AC,   // Explosion flash
    YELLOW_SMOKE: 0xFFF9A6,   // Missile smoke
    BOOST_SMOKE: 0xFFF9A6,
    POWERUP_RAMPAGE: 0xFF0300,
    BLUE_TEAM_MISSILE: 0x3232FA,
    BLUE_TEAM: 0x4076E2,
    RED_TEAM: 0xEA4242,
    FIREWALL_Y: 0xFAA806,
    FIREWALL_R: 0xFA4F06,
};
const isEmoji = /\p{Extended_Pictographic}/u;
const FONT_SIZE = 48, FONT_PADDING = 4;
const BLUE = 1, RED = 2;
const SEA_IDX = 0, SAND_IDX = 1, ROCK_IDX = 2;

const seaShaderCode = `
    struct CameraUniforms { viewProjMatrix : mat4x4<f32> };
    struct Params { uvScale : vec2<f32>, maskAlpha : f32 }; 

    @group(0) @binding(0) var<uniform> camera : CameraUniforms;
    @group(1) @binding(0) var<uniform> model : mat4x4<f32>;
    @group(1) @binding(1) var<uniform> params : Params;
    @group(1) @binding(2) var repeat : sampler;
    @group(1) @binding(3) var linear : sampler;
    @group(1) @binding(4) var colorMap : texture_2d_array<f32>;
    @group(1) @binding(5) var maskMap : texture_2d_array<f32>;

    struct VertexOutput {
        @builtin(position) position : vec4<f32>,
        @location(0) uv : vec2<f32>,
        @location(1) alphaUv : vec2<f32>,
    };

    @vertex fn vs_main(@location(0) pos : vec3<f32>, @location(1) uv : vec2<f32>) -> VertexOutput {
        var out : VertexOutput;
        out.position = camera.viewProjMatrix * model * vec4<f32>(pos, 1.0);
        out.uv = uv * params.uvScale; // Scale UVs for tiling
        out.alphaUv = uv; // Masks use original 0-1 UVs
        return out;
    }

    @fragment fn fs_main(in : VertexOutput) -> @location(0) vec4<f32> {
        let color = textureSample(colorMap, repeat, in.uv, 0);
        let alphaColor = textureSample(maskMap, repeat, in.alphaUv, 0);

        // mix(color, color * alphaColor, maskAlpha)
        let multiplied = color.rgb * alphaColor.rgb;
        let finalRgb = mix(color.rgb, multiplied, params.maskAlpha);

        return vec4<f32>(finalRgb, 1.0);
    }
`;

const landShaderCode = `
    struct CameraUniforms { viewProjMatrix : mat4x4<f32> };
    struct Params { uvScale : vec2<f32> }; // maskAlpha unused here

    @group(0) @binding(0) var<uniform> camera : CameraUniforms;
    @group(1) @binding(0) var<uniform> model : mat4x4<f32>;
    @group(1) @binding(1) var<uniform> params : Params;
    @group(1) @binding(2) var repeat : sampler;
    @group(1) @binding(3) var linear : sampler;
    @group(1) @binding(4) var colorMap : texture_2d_array<f32>; // Forest(0), Sand(1), Rock(2)
    @group(1) @binding(5) var maskMap : texture_2d_array<f32>;  // SeaMask(0), SandMask(1), RockMask(2)

    struct VertexOutput {
        @builtin(position) position : vec4<f32>,
        @location(0) uv : vec2<f32>,
        @location(1) alphaUv : vec2<f32>,
    };

    @vertex fn vs_main(@location(0) pos : vec3<f32>, @location(1) uv : vec2<f32>) -> VertexOutput {
        var out : VertexOutput;
        out.position = camera.viewProjMatrix * model * vec4<f32>(pos, 1.0);
        out.uv = uv * params.uvScale;
        out.alphaUv = uv;
        return out;
    }

    @fragment fn fs_main(in : VertexOutput) -> @location(0) vec4<f32> {
        // Base: Forest (Layer 0)
        var finalColor = textureSample(colorMap, repeat, in.uv, 0);

        // Add Sand (Layer 1) based on Sand Mask (Layer 1, Green Channel)
        let sandColor = textureSample(colorMap, repeat, in.uv, 1);
        let sandMask = textureSample(maskMap, repeat, in.alphaUv, 1).g;
        finalColor = mix(finalColor, sandColor, sandMask);

        // Add Rock (Layer 2) based on Rock Mask (Layer 2, Green Channel)
        let rockColor = textureSample(colorMap, repeat, in.uv, 2);
        let rockMask = textureSample(maskMap, repeat, in.alphaUv, 2).g;
        finalColor = mix(finalColor, rockColor, rockMask);

        return finalColor;
    }
`;

const stencilShaderCode = `
    struct CameraUniforms { viewProjMatrix : mat4x4<f32> };
    struct ModelUniforms { modelMatrix : mat4x4<f32> };
    @group(0) @binding(0) var<uniform> camera : CameraUniforms;
    @group(1) @binding(0) var<uniform> object : ModelUniforms;

    @vertex fn vs_main(@location(0) position : vec3<f32>) -> @builtin(position) vec4<f32> {
        return camera.viewProjMatrix * object.modelMatrix * vec4<f32>(position, 1.0);
    }
    @fragment fn fs_main() -> @location(0) vec4<f32> {
        return vec4<f32>(1.0, 0.0, 0.0, 0.5); // todo: pass color as uniform
    }
`;

const mipShaderCode = `
    struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) texcoord: vec2f,
    };
    @vertex fn vs(@builtin(vertex_index) vertexIndex : u32) -> VSOutput {
        let pos = array(
            vec2f( 0.0,  0.0), vec2f( 1.0,  0.0), vec2f( 0.0,  1.0),
            vec2f( 0.0,  1.0), vec2f( 1.0,  0.0), vec2f( 1.0,  1.0),
        );
        var vsOutput: VSOutput;
        let xy = pos[vertexIndex];
        vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
        vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
        return vsOutput;
    }
    @group(0) @binding(0) var ourSampler: sampler;
    @group(0) @binding(1) var ourTexture: texture_2d<f32>;
    @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
        return textureSample(ourTexture, ourSampler, fsInput.texcoord);
    }
`;

const instancesShaderCode = `
    struct CameraUniforms { viewProjMatrix : mat4x4<f32> };
    struct DrawParams { opacity : f32 };

    @group(0) @binding(0) var<uniform> camera : CameraUniforms;
    @group(1) @binding(0) var<storage, read> instances : array<InstanceData>;
    @group(1) @binding(1) var mySampler : sampler;
    @group(1) @binding(2) var myTexture : texture_2d_array<f32>;
    @group(1) @binding(3) var<uniform> params : DrawParams;

    struct VertexInput {
        @location(0) position : vec3<f32>, // -0.5 to 0.5
        @location(1) uv : vec2<f32>,
    };

    struct InstanceData {
        parentPos : vec2<f32>,   // parent Position
        localOffset : vec2<f32>, // offset relative to parent
        scale : vec2<f32>,       // Width/Height
        uv_pos : vec2<f32>,      // UV Top-Left
        uv_size : vec2<f32>,     // UV Width/Height
        offsetRot : f32,         // rotation around parent
        anchorY : f32,           // Vertical pivot point (0.0 to 1.0) for scaling and self-rotation
        rot : f32,               // self-rotation around anchor point
        tint : f32,              // packed Color (0xRRGGBB)
        texInfo : f32,           // texture index + z
        opacity : f32,
    };

    struct VertexOutput {
        @builtin(position) position : vec4<f32>,
        @location(0) uv : vec2<f32>,
        @location(1) @interpolate(flat) texIndex : i32,
        @location(2) @interpolate(flat) opacity : f32,
        @location(3) @interpolate(flat) tint : vec3<f32>,
    };

    fn rot_matrix(angle: f32) -> mat2x2<f32> {
        let c = cos(angle);
        let s = sin(angle);
        return mat2x2<f32>(vec2(c, s), vec2(-s, c));
    }

    fn unpack_color(color: f32) -> vec3<f32> {
        let c = u32(color);
        return vec3<f32>(
            f32((c >> 16u) & 255u) / 255.0,
            f32((c >> 8u) & 255u) / 255.0,
            f32(c & 255u) / 255.0
        );
    }

    @vertex
    fn vs_main(in : VertexInput, @builtin(instance_index) i_idx : u32) -> VertexOutput {
        let inst = instances[i_idx];

        // Apply Anchor (Shift vertex so (0,0) is at the pivot point)
        // TODO: Hardcoded X=0.5; to do Y can use lookup table for common anchor
        // value -> anchorX, anchorY
        let posCentered = in.position.xy - vec2(0.0, inst.anchorY - 0.5);

        // Scale
        let posScaled = posCentered * inst.scale;

        // Rotate (around its anchor)
        let posRotated = rot_matrix(inst.rot) * posScaled;

        // Rotate Local Offset (around parent)
        let offsetRotated = rot_matrix(inst.offsetRot) * inst.localOffset;

        // World Position
        let worldPos = inst.parentPos + offsetRotated + posRotated;

        // upack tex and z
        let packed = u32(inst.texInfo);
        let texIndex = i32(packed & 0xFFFu);           // First 12 bits
        let zInt = f32((packed >> 12u) & 0xFFFu);      // Next 12 bits
        let z = zInt / 4095.0;                         // Normalize to [0.0, 1.0]

        var out : VertexOutput;
        //out.position = camera.viewProjMatrix * vec4<f32>(worldPos, z, 1.0);
        out.position = vec4((camera.viewProjMatrix * vec4(worldPos, 0.0, 1.0)).xy, z, 1.0);
        out.uv = in.uv * inst.uv_size + inst.uv_pos;
        out.texIndex = texIndex;
        out.tint = unpack_color(inst.tint);
        out.opacity = inst.opacity;
        return out;
    }

    @fragment
    fn fs_main(in : VertexOutput) -> @location(0) vec4<f32> {
        var color = textureSample(myTexture, mySampler, in.uv, in.texIndex);
        color = vec4<f32>(color.rgb * in.tint, color.a);
        color.a = color.a * params.opacity * in.opacity; 
        if (color.a < 0.01) { discard; }
        return color;
    }
`;

const sdfShaderCode = `
    struct Camera { proj : mat4x4<f32> };
    @group(0) @binding(0) var<uniform> camera : Camera;
    @group(1) @binding(0) var<storage, read> instances : array<Instance>;
    @group(1) @binding(1) var mySampler : sampler;
    @group(1) @binding(2) var myTexture : texture_2d_array<f32>;

    struct VertexInput {
        @location(0) position : vec3<f32>, // -0.5 to 0.5
        @location(1) uv : vec2<f32>,
    };

    struct Instance {
        pos : vec2<f32>,
        quad_size : vec2<f32>,
        args : vec4<f32>,
        origin_offset : vec2<f32>,
        color : f32,
        alpha : f32,
        shape_type : f32,
        tex_layer : f32,
        z: f32,
        pad1: f32,
    };

    struct VertexOutput {
        @builtin(position) position : vec4<f32>,
        @location(0) local_pos : vec2<f32>,
        @location(1) @interpolate(flat) args : vec4<f32>,
        @location(2) @interpolate(flat) color : vec4<f32>,
        @location(3) @interpolate(flat) shape_type : u32,
        @location(4) @interpolate(flat) tex_layer : i32,
        @location(5) uv : vec2<f32>,
    };

    fn unpack_color(color: f32) -> vec3<f32> {
        let c = u32(color);
        return vec3<f32>(
            f32((c >> 16u) & 255u) / 255.0,
            f32((c >> 8u) & 255u) / 255.0,
            f32(c & 255u) / 255.0
        );
    }

    @vertex
    fn vs_main(in : VertexInput, @builtin(instance_index) i_idx : u32) -> VertexOutput {
        let inst = instances[i_idx];

        let pos = in.position.xy;

        // Scale by quad_size
        let localPos = pos * inst.quad_size + inst.origin_offset;
        let worldPos = inst.pos + localPos;

        var out : VertexOutput;
        //out.position = camera.proj * vec4<f32>(worldPos, inst.z, 1.0);
        out.position = vec4((camera.proj * vec4(worldPos, 0.0, 1.0)).xy, inst.z, 1.0);

        // Ensure the SDF always receives a 'Left-Side' coordinate system.
        // If quad_size.x is negative (Energy Bar), we flip the X coordinate passed to fragment
        // so the math sees it as a standard left arc, even though it's drawn on the right.
        // For Box (positive size), sign is 1.0, no change.
        out.local_pos = vec2(localPos.x * sign(inst.quad_size.x), localPos.y);

        out.args = inst.args;
        out.color = vec4<f32>(unpack_color(inst.color), inst.alpha);
        out.shape_type = u32(inst.shape_type);
        out.tex_layer = i32(inst.tex_layer);

        // For text, calculate standard UVs based on the quad
        // Input pos is -0.5 to 0.5. Map to 0.0 to 1.0
        let base_uv = in.position.xy + 0.5; 
        // args contains [u, v, w, h]
        out.uv = vec2(inst.args.x, inst.args.y) + (base_uv * vec2(inst.args.z, inst.args.w));

        return out;
    }

    // Arc: x=radius, y=thick, z=start, w=end
    fn sdArc(p: vec2<f32>, args: vec4<f32>) -> f32 {
        let radius = args.x;
        let thickness = args.y;
        let start = args.z;
        let end = args.w;
        let half_thick = thickness * 0.5;

        // Angle Calculation: 0 is Left (-X)
        // Negative Angle = Up (Top of screen)
        // Positive Angle = Down (Bottom of screen)
        let angle = atan2(p.y, -p.x);
        let clamped = clamp(angle, start, end);

        let closest = vec2<f32>(-cos(clamped), sin(clamped)) * radius;
        return length(p - closest) - half_thick;
    }

    // Box: x=width, y=height, z=corner, w=border
    fn sdBox(p: vec2<f32>, args: vec4<f32>) -> f32 {
        let dim = vec2(args.x, args.y) * 0.5;
        let rad = args.z;
        let border = args.w;
        
        let d = abs(p) - dim + vec2(rad);
        let dist = min(max(d.x, d.y), 0.0) + length(max(d, vec2(0.0))) - rad;
        
        if (border > 0.0) {
            return abs(dist) - (border * 0.5);
        }
        return dist;
    }

    @fragment
    fn fs_main(in : VertexOutput) -> @location(0) vec4<f32> {
        var dist = 0.0;

        if (in.shape_type == 0u) {
            dist = sdArc(in.local_pos, in.args);
        } else {
            dist = sdBox(in.local_pos, in.args);
        }

        let delta = fwidth(dist);
        let alpha = 1.0 - smoothstep(-delta, 0.0, dist);
        if (alpha <= 0.0) { discard; }
        return vec4<f32>(in.color.rgb, in.color.a * alpha);
    }
`;


const scale_idx = 4;
function write_instance(data, idx, pX, pY, pZ_norm, w, h, rot, uX, uY, uW, uH, tex, lX=0, lY=0, alpha=1.0, offsetRot=null, aY=0.5, tint=null) {
    const texIndex = Math.floor(tex) & 0xFFF;
    const zInt = Math.floor((1.0 - pZ_norm) * 4095) & 0xFFF; //pZ_norm must be from 0 to 1
    const packedTexZ = texIndex | (zInt << 12);

    data[idx + 0] = pX;
    data[idx + 1] = -pY;
    data[idx + 2] = lX;
    data[idx + 3] = lY;
    data[idx + scale_idx] = w;
    data[idx + scale_idx + 1] = h;
    data[idx + 6] = uX;
    data[idx + 7] = uY;
    data[idx + 8] = uW;
    data[idx + 9] = uH;
    data[idx + 10] = (offsetRot !== null) ? offsetRot : rot; 
    data[idx + 11] = 1 - aY;
    data[idx + 12] = rot;
    data[idx + 13] = tint !== null ? tint : TINT.WHITE;
    data[idx + 14] = packedTexZ;
    data[idx + 15] = alpha;
}
function write_sdf_instance(data, idx, x, y, z_norm, wSize, hSize, arg1, arg2, arg3, arg4, tint, alpha, type, tex=0, offX=0, offY=0) {
    data[idx] = x; data[idx+1] = y;
    data[idx+2] = wSize; data[idx+3] = hSize;
    data[idx+4] = arg1; data[idx+5] = arg2;
    data[idx+6] = arg3; data[idx+7] = arg4;
    data[idx+8] = offX; data[idx+9] = offY;
    data[idx+10] = tint; data[idx+11] = alpha;
    data[idx+12] = type; 
    data[idx+13] = tex;
    data[idx+14] = 1.0 - z_norm;
    data[idx+15] = 0; //pad
}

export class WebgpuRenderer extends AbstractRenderer {
    camera = {
        left: -300/2,
        right: 300/2,
        top: 150/2,
        bottom: -150/2,
        near: 0.1,
        far: 10,
        zoom: 1,
        position: { x: 0, y: 0, z: 2 },
    }
    #cameraState = {position:Vector.zero(), center:Vector.zero()}
    get cameraState() {
        return this.#cameraState;
    }
    set cameraState({x, y}) {
        this.camera.position.x = x;
        this.camera.position.y = -y;
        this.#cameraState.position.x = this.camera.position.x + this.camera.left / this.camera.zoom;
        this.#cameraState.position.y = -this.camera.position.y + this.camera.bottom / this.camera.zoom;
        this.#cameraState.center.x = this.camera.position.x;
        this.#cameraState.center.y = -this.camera.position.y;
    }
    #minimapGeo
    textures = {}
    samplers = {}
    vertex_buffers = {}
    uniform_buffers = {}
    storage_buffers = {}
    bind_groups = {}
    pipelines = {}
    projectionMatrix = mat4.create()
    uiProjectionMatrix = mat4.create()
    viewMatrix = mat4.create()
    cameraWorldMatrix = mat4.create()
    viewProjData = new Float32Array(16)
    instanceData = new Float32Array(Math.max(MAX_INSTANCES + MAX_PARTICLES, MAX_DOODADS) * INSTANCE_STRIDE_FLOATS)
    texture_ship_mapping = [new Array(TEXTURE_ARRAY_1_MAX_DEPTH), new Array(TEXTURE_ARRAY_2_MAX_DEPTH)]
    particles = []
    emitters = []
    particles_count = { flash:0, spark:0, fragment:0, e_smoke:0, missile_smoke:0, shockwave:0 }
    hudState = {}

    async init() {
        const canvas = this.canvas = document.createElement('canvas');
        canvas.setAttribute('style', 'width: 100%;height: 100%;display: block;');
        document.body.appendChild(canvas);
        document.body.style.height = '100%';
        document.documentElement.style.height = '100%';

        const adapter = await navigator.gpu.requestAdapter();
        const device = this.device = await adapter.requestDevice();
        const context = this.context = canvas.getContext('webgpu');
        const format = navigator.gpu.getPreferredCanvasFormat();
        context.configure({ device, format });

        const bindGroupLayouts = this.bindGroupLayouts = {
            camera: device.createBindGroupLayout({
                entries: [
                    { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
                ]
            }),
            map: device.createBindGroupLayout({
                entries: [
                    { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } }, // Model Matrix
                    { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }, // UV Scale / Params
                    { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
                    { binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
                    { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: '2d-array' } }, // Color Array
                    { binding: 5, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: '2d-array' } }, // Mask Array
                ]
            }),
            stencil: device.createBindGroupLayout({
                entries: [
                    { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
                ]
            }),
            instances: device.createBindGroupLayout({
                entries: [
                    { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } }, // instance data
                    { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
                    { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: '2d-array' } },
                    { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },  // opacity
                ]
            }),
        };

        const seaShaderModule = device.createShaderModule({ code: seaShaderCode });
        const landShaderModule = device.createShaderModule({ code: landShaderCode });
        const stencilShaderModule = device.createShaderModule({ code: stencilShaderCode });
        const mipShaderModule = device.createShaderModule({ code: mipShaderCode });
        const instancesShaderModule = device.createShaderModule({ code: instancesShaderCode });
        const sdfModule = device.createShaderModule({ code: sdfShaderCode });

        this.pipelines.sea = device.createRenderPipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayouts.camera, bindGroupLayouts.map]
            }),
            vertex: {
                module: seaShaderModule,
                buffers: [{
                    arrayStride: 20, // 5 floats (pos3 + uv2)
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x3' }, //pos
                        { shaderLocation: 1, offset: 12, format: 'float32x2' } //uv
                    ]
                }]
            },
            fragment: {
                module: seaShaderModule,
                targets: [{ format }]
            },
            primitive: { topology: 'triangle-list' },
            depthStencil: {
                format: depthStencilFormat,
                depthWriteEnabled: false,
                depthCompare: 'always',
                stencilFront: {
                    compare: 'equal', // Only draw if stencil == reference (0)
                    passOp: 'keep'
                },
                stencilBack: { compare: 'equal', passOp: 'keep' }
            },
        });
        this.pipelines.land = device.createRenderPipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayouts.camera, bindGroupLayouts.map]
            }),
            vertex: {
                module: landShaderModule,
                buffers: [{
                    arrayStride: 20, // 5 floats (pos3 + uv2)
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x3' }, //pos
                        { shaderLocation: 1, offset: 12, format: 'float32x2' } //uv
                    ]
                }]
            },
            fragment: {
                module: landShaderModule,
                targets: [{ format }]
            },
            primitive: { topology: 'triangle-list' },
            depthStencil: {
                format: depthStencilFormat,
                depthWriteEnabled: false,
                depthCompare: 'always',
                stencilFront: {
                    compare: 'equal', // Only draw if stencil == reference (1)
                    passOp: 'keep'
                },
                stencilBack: { compare: 'equal', passOp: 'keep' }
            },
        });
        this.pipelines.stencil = device.createRenderPipeline({
            layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayouts.camera, bindGroupLayouts.stencil] }),
            vertex: {
                module: stencilShaderModule,
                buffers: [{ arrayStride: 12, attributes: [{ shaderLocation: 0, format: 'float32x3', offset: 0 }] }] // Position
            },
            fragment: {
                module: stencilShaderModule,
                targets: [{ 
                    format, 
                    writeMask: 0 // Do not write RGB to screen, only affect Stencil
                }] 
            },
            depthStencil: {
                format: depthStencilFormat,
                depthWriteEnabled: false,
                depthCompare: 'always',
                stencilFront: {
                    compare: 'always', 
                    passOp: 'replace', // If drawn, replace stencil value with reference
                },
                stencilBack: { compare: 'always', passOp: 'replace' }
            },
            primitive: { topology: 'triangle-list' }
        });
        this.pipelines.mip = device.createRenderPipeline({
            layout: 'auto',
            vertex: { module: mipShaderModule },
            fragment: { module: mipShaderModule, targets: [{ format: "rgba8unorm" }] },
        });
        const vertex_descriptor = {
            module: instancesShaderModule,
            buffers: [
                {
                    arrayStride: 20,
                    attributes: [
                        { shaderLocation: 0, offset:0, format: 'float32x3' },
                        { shaderLocation: 1, offset:12, format: 'float32x2' }
                    ]
                }
            ]
        };
        const fragment_descriptor = {
            module: instancesShaderModule,
            targets: [{ 
                format,
                blend: { // Standard alpha blending
                    color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                    alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
                }
            }]
        };
        const descriptor = {
            layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayouts.camera, bindGroupLayouts.instances] }),
            vertex: vertex_descriptor,
            fragment: fragment_descriptor,
            primitive: { topology: 'triangle-list' },
            depthStencil: {
                format: depthStencilFormat,
                depthWriteEnabled: false,
                depthCompare: 'always',
            },
        };
        this.pipelines.instances = device.createRenderPipeline({
            ...descriptor
        });
        this.pipelines.instances_blend_add = device.createRenderPipeline({
            ...descriptor,
            fragment: {
                module: instancesShaderModule,
                targets: [{ 
                    format,
                    blend: { // ADD blend
                        color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
                        alpha: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' }
                    }
                }]
            },
        });
        this.pipelines.shadows = device.createRenderPipeline({
            ...descriptor,
            fragment: {
                module: instancesShaderModule,
                targets: [{ 
                    format: 'rgba8unorm',
                    blend: { // MAX blending: Keeps the highest alpha, prevents summing
                        color: { srcFactor: 'one', dstFactor: 'one', operation: 'max' },
                        alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'max' }
                    }
                }]
            },
            depthStencil: undefined
        });
        this.pipelines.ui = device.createRenderPipeline({
            ...descriptor,
            vertex: { ...vertex_descriptor, module: sdfModule},
            fragment: { ...fragment_descriptor, module: sdfModule},
            depthStencil: {
                format: depthStencilFormat,
                depthWriteEnabled: false,
                depthCompare: 'always',
            },
        });
        this.pipelines.overlay = device.createRenderPipeline({
            layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayouts.camera, bindGroupLayouts.stencil] }),
            vertex: {
                module: stencilShaderModule,
                buffers: [{ arrayStride: 12, attributes: [{ shaderLocation: 0, format: 'float32x3', offset: 0 }] }]
            },
            fragment: {
                module: stencilShaderModule,
                targets: [{ 
                    format, 
                    blend: {
                        color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
                        alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
                    }
                }] 
            },
            primitive: { topology: 'triangle-list' },
            depthStencil: {
                format: depthStencilFormat,
                depthWriteEnabled: false,
                depthCompare: 'always', 
            },
        });

        this.samplers.repeat = device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
            addressModeU: 'repeat', 
            addressModeV: 'repeat', 
        });
        this.samplers.linear = device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
            mipmapFilter: 'linear',
        });
        this.mipSampler = device.createSampler({ minFilter: 'linear' });

        this.textures.sea = this.#create_texture_array(256, 256, 1);
        this.textures.land = this.#create_texture_array(1024, 1024, 3);
        this.textures.map_masks = this.#create_texture_array(4096, 2048, 3);
        this.textures.array_1 = this.#create_texture_array(TEXTURE_ARRAY_1_MAX_SIZE.w, TEXTURE_ARRAY_1_MAX_SIZE.h, TEXTURE_ARRAY_1_MAX_DEPTH, true);
        this.textures.array_2 = this.#create_texture_array(TEXTURE_ARRAY_2_MAX_SIZE.w, TEXTURE_ARRAY_2_MAX_SIZE.h, TEXTURE_ARRAY_2_MAX_DEPTH);
        this.#update_texture_array(this.textures.sea, ['assets/map_sea.jpg']);
        this.#update_texture_array(this.textures.land, ['assets/map_forest.jpg', 'assets/map_sand.jpg', 'assets/map_rock.jpg']);
        this.#update_texture_array(this.textures.array_1, ['assets/array_1_a.png'], [array_1_layout.items]);
        this.#update_texture_array(this.textures.array_1, ['assets/array_1_b.png'], [array_1_layout.particles]);
        this.#update_texture_array(this.textures.array_1, ['assets/array_1_c.png'], [array_1_layout.flags]);
        this.#update_texture_array(this.textures.array_1, ['assets/array_1_d.png'], [array_1_layout.flags+1]);
        this.#update_texture_array(this.textures.array_1, ['assets/array_1_e.png'], [array_1_layout.flags+2]);
        for (let i=array_1_layout.mountain; i<=MOUNTAIN_TYPES; i++)
            this.#update_texture_array(this.textures.array_1, [`assets/mountains/mountain${i}.png`], [i]);
        this.#update_texture_array(this.textures.array_2, ['assets/array_2_a.png'], [array_2_layout.items]);
        this.charAtlas = new CharAtlas(this, this.textures.array_1, [array_1_layout.text, array_1_layout.text+1], TEXTURE_ARRAY_1_MAX_SIZE.w);

        this.vertex_buffers.quad = this.#create_quad_vertex_buffer(1, 1);

        // uniforms
        // camera (world)
        const cameraBuffer = this.uniform_buffers.camera = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

        // camera (screen)
        const uiCameraBuffer = this.uniform_buffers.ui_camera = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

        // Map model matrix
        const modelBuf = this.uniform_buffers.map = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        const m = mat4.identity();
        mat4.scale(m, vec3.set(config.mapWidth, config.mapHeight, 1, vec3.create()), m);
        device.queue.writeBuffer(modelBuf, 0, m);

        // Params Sea: UV Scale (w/256) + MaskAlpha (0.5)
        const paramsSeaBuf = this.uniform_buffers.sea = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        const seaParams = new Float32Array([config.mapWidth/256, config.mapHeight/256, 0.5, 0]); // vec2 scale, float alpha, pad
        device.queue.writeBuffer(paramsSeaBuf, 0, seaParams);

        // Params Land: UV Scale (w/1024)
        const paramsLandBuf = this.uniform_buffers.land = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        const landParams = new Float32Array([config.mapWidth/1024, config.mapHeight/1024, 0, 0]); 
        device.queue.writeBuffer(paramsLandBuf, 0, landParams);

        // global opacity
        const opacityBuf = this.uniform_buffers.opacity = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        device.queue.writeBuffer(opacityBuf, 0, new Float32Array([1.0]));

        // global shadow opacity
        const opacityShadowBuf = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        device.queue.writeBuffer(opacityShadowBuf, 0, new Float32Array([0.4]));

        // storage
        const instanceBuffer = this.storage_buffers.instances = device.createBuffer({
            size: (MAX_DOODADS + MAX_PARTICLES + MAX_INSTANCES) * INSTANCE_STRIDE_FLOATS * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        // static bind groups
        this.bind_groups.camera = device.createBindGroup({
            layout: bindGroupLayouts.camera,
            entries: [{ binding: 0, resource: { buffer: cameraBuffer } }]
        });
        this.bind_groups.ui_camera = device.createBindGroup({
            layout: bindGroupLayouts.camera,
            entries: [{ binding: 0, resource: { buffer: uiCameraBuffer } }]
        });
        this.bind_groups.sea = this.device.createBindGroup({
            layout: this.bindGroupLayouts.map,
            entries: [
                { binding: 0, resource: { buffer: this.uniform_buffers.map } },
                { binding: 1, resource: { buffer: this.uniform_buffers.sea } },
                { binding: 2, resource: this.samplers.repeat },
                { binding: 3, resource: this.samplers.linear },
                { binding: 4, resource: this.textures.sea.createView({ dimension: '2d-array' }) },
                { binding: 5, resource: this.textures.map_masks.createView({ dimension: '2d-array' }) },
            ]
        });
        this.bind_groups.land = this.device.createBindGroup({
            layout: this.bindGroupLayouts.map,
            entries: [
                { binding: 0, resource: { buffer: this.uniform_buffers.map } },
                { binding: 1, resource: { buffer: this.uniform_buffers.land } },
                { binding: 2, resource: this.samplers.repeat },
                { binding: 3, resource: this.samplers.linear },
                { binding: 4, resource: this.textures.land.createView({ dimension: '2d-array' }) },
                { binding: 5, resource: this.textures.map_masks.createView({ dimension: '2d-array' }) },
            ]
        });
        this.bind_groups.instances = device.createBindGroup({
            layout: bindGroupLayouts.instances,
            entries: [
                { binding: 0, resource: { buffer: instanceBuffer } }, 
                { binding: 1, resource: this.samplers.linear },
                { binding: 2, resource: this.textures.array_1.createView({ dimension: '2d-array' }) }, 
                { binding: 3, resource: { buffer: opacityBuf } },
            ]
        });
        this.bind_groups.shadows = device.createBindGroup({
            layout: bindGroupLayouts.instances,
            entries: [
                { binding: 0, resource: { buffer: instanceBuffer } }, 
                { binding: 1, resource: this.samplers.linear },
                { binding: 2, resource: this.textures.array_2.createView({ dimension: '2d-array' }) }, 
                { binding: 3, resource: { buffer: opacityShadowBuf } },
            ]
        });

        this.#resize_textures(canvas.width, canvas.height);
        this.#initGameObjScreenVars(window.innerWidth, window.innerHeight);
        this.updateHUD(1, 1);
        this.visibilityHUD(false);
        //this.apply_bounds(game.server.config.mapBounds);
        load_assets({...game.server.config});
    }

    #initGameObjScreenVars(screenInnerWidth, screenInnerHeight) {
        game.screenX = screenInnerWidth;
        game.screenY = screenInnerHeight;
        game.halfScreenX = screenInnerWidth / 2;
        game.halfScreenY = screenInnerHeight / 2;
        UI.modifyConfigIfMobile();

        game.scale = (game.screenX + game.screenY) / UI.getScalingFactor();
        this.camera.zoom = game.scale;
    }

    #resize_textures(w, h) {
        if (this.textures.depth) this.textures.depth.destroy();
        this.textures.depth = this.device.createTexture({
            size: [w, h],
            format: depthStencilFormat,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });

        if (this.textures.shadow_buffer) this.textures.shadow_buffer.destroy();
        this.textures.shadow_buffer = this.device.createTexture({
            size: [w/shadowScaling, h/shadowScaling, 1],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });

        this.bind_groups.shadows_layer = this.device.createBindGroup({
            layout: this.bindGroupLayouts.instances,
            entries: [
                { binding: 0, resource: { buffer: this.storage_buffers.instances } },
                { binding: 1, resource: this.samplers.linear },
                { binding: 2, resource: this.textures.shadow_buffer.createView({ dimension: '2d-array' }) },
                { binding: 3, resource: { buffer: this.uniform_buffers.opacity } }
            ]
        });
    }

    #create_texture_array(w, h, depth, use_mipmaps=false) {
        const texture = this.device.createTexture({
            size: [w, h, depth],
            mipLevelCount: use_mipmaps ? Math.floor(Math.log2(Math.max(w, h))) + 1 : undefined,
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        });
        return texture;
    }

    async #update_texture_array(texture, urls_or_bitmaps, depth_idxs, clear=false) {
        depth_idxs ||= urls_or_bitmaps.map((_, i) => i);

        const bitmaps = typeof urls_or_bitmaps[0] === 'string' ? await Promise.all(urls_or_bitmaps.map(async url => {
            const blob = await fetch(url).then(res=>res.blob());
            return createImageBitmap(blob, { colorSpaceConversion: 'none' });
        })) : urls_or_bitmaps;

        if (clear) {
            const commandEncoder = this.device.createCommandEncoder({ label: 'Clear Layers' });
            bitmaps.forEach((_, i) => {
                const layer = depth_idxs[i];
                const pass = commandEncoder.beginRenderPass({
                    colorAttachments: [{
                        view: texture.createView({ 
                            baseArrayLayer: layer, arrayLayerCount: 1,
                            baseMipLevel: 0, mipLevelCount: 1,
                        }),
                        clearValue: { r: 0, g: 0, b: 0, a: 0 },
                        loadOp: 'clear',
                        storeOp: 'store'
                    }]
                });
                pass.end();
            });
            this.device.queue.submit([commandEncoder.finish()]);
        }

        // Copy each bitmap to its array layer
        bitmaps.forEach((bmp, i) => {
            const layer = depth_idxs[i];
            this.device.queue.copyExternalImageToTexture(
                { source: bmp, flipY: true },
                { texture, origin: [0, 0, layer] }, // Z = layer index
                { width: bmp.width, height: bmp.height },
            );
            bmp.close();
        });

         this.#generate_mips(texture, depth_idxs);
    }

    #generate_mips(texture, layers) {
        if (texture.mipLevelCount <= 1) return;
        const device = this.device;
        const encoder = device.createCommandEncoder();
        layers = layers || Array.from({length: texture.depthOrArrayLayers}, (_, i) => i);

        for (const layer of layers) {
            let width = texture.width;
            let height = texture.height;

            for (let baseMipLevel = 1; baseMipLevel < texture.mipLevelCount; ++baseMipLevel) {
                width = Math.max(1, Math.floor(width / 2));
                height = Math.max(1, Math.floor(height / 2));

                const bindGroup = device.createBindGroup({
                    layout: this.pipelines.mip.getBindGroupLayout(0),
                    entries: [
                        { binding: 0, resource: this.mipSampler },
                        { 
                            binding: 1, 
                            resource: texture.createView({
                                dimension: '2d',
                                baseMipLevel: baseMipLevel - 1,
                                mipLevelCount: 1,
                                baseArrayLayer: layer,
                                arrayLayerCount: 1
                            }) 
                        },
                    ],
                });
                const pass = encoder.beginRenderPass({
                    colorAttachments: [{
                        view: texture.createView({
                            dimension: '2d',
                            baseMipLevel: baseMipLevel,
                            mipLevelCount: 1,
                            baseArrayLayer: layer,
                            arrayLayerCount: 1
                        }),
                        loadOp: 'clear',
                        storeOp: 'store',
                    }],
                });
                pass.setPipeline(this.pipelines.mip);
                pass.setBindGroup(0, bindGroup);
                pass.draw(6);
                pass.end();
            }
        }

        device.queue.submit([encoder.finish()]);
    }

    #create_quad_vertex_buffer(w, h) {
        const hw = w/2, hh = h/2;
        // Full map Quad (Pos + UV)
        const quadData = new Float32Array([
            -hw,  hh, 0,  0, 1,
            -hw, -hh, 0,  0, 0,
            hw,  -hh, 0,  1, 0,
            -hw,  hh, 0,  0, 1,
            hw,  -hh, 0,  1, 0,
            hw,   hh, 0,  1, 1
        ]);
        const vBuf = this.device.createBuffer({ size: quadData.byteLength, usage: GPUBufferUsage.VERTEX, mappedAtCreation: true });
        new Float32Array(vBuf.getMappedRange()).set(quadData);
        vBuf.unmap();
        return vBuf;
    }

    resize(width, height) {
        this.#initGameObjScreenVars(width, height);
        this.setCamera(this.cameraState.center.x, this.cameraState.center.y);
        this.bounding_box = null;
        //Games.update(true);
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

        this.#updateMinimapGeometry();
    }

    // apply bounds to minimap
    //  1. change the draw size
    //  2. calculate the uv to show only the content inside the bounds)
    // config.minimapSize (default 240) represents the base width of the full world map on screen.
    #updateMinimapGeometry() {
        const { width, height } = this.canvas;
        const bounds = game.server.config.mapBounds;
        const minX = bounds.MIN_X, maxX = bounds.MAX_X, minY = bounds.MIN_Y, maxY = bounds.MAX_Y;
        const worldW = maxX - minX, worldH = maxY - minY;
        const fullW = config.mapWidth, fullH = config.mapHeight;
        const baseSize = config.minimapSize;
        const zoom = Math.min(4, Math.min(fullW / worldW, fullH / worldH));
        const drawW = baseSize * (worldW / fullW) * zoom;
        const drawH = drawW * (worldH / worldW); 
        const screenX = width - config.minimapPaddingX - (drawW / 2);
        const screenY = height - config.minimapPaddingY - (drawH / 2);
        const baseUV = uvs.minimap.uv; // [u, v, w, h]
        const uStart = (minX + 16384) / fullW;
        const vStart = (8192 - maxY) / fullH; // Texture V origin is Top-Left (+Y in world)
        const u = baseUV[0] + uStart * baseUV[2];
        const v = baseUV[1] + vStart * baseUV[3];
        const uw = (worldW / fullW) * baseUV[2];
        const vh = (worldH / fullH) * baseUV[3];

        this.#minimapGeo = {
            minX, minY,
            worldW, worldH,
            drawW, drawH,
            screenX, screenY, // center of the minimap relative to bottom-right corner with padding
            uvs: { u, v, uw, vh }
        };
    }

    #worldToMini(wx, wy) {
        const { minX, worldW, minY, worldH, screenX, drawW, screenY, drawH } = this.#minimapGeo;
        const nx = (wx - minX) / worldW;
        const ny = (wy - minY) / worldH;
        return {
            x: screenX + (nx - 0.5) * drawW,
            y: screenY + (ny - 0.5) * drawH // Y flipped for screen coords
        };
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

        const urls = [], depth_idxs = [];
        if (sea_mask_uri && check(4)) {
            if (asset_has_changed(4)) {
                console.log('apply_map_assets sea_mask');
                urls.push(sea_mask_uri);
                depth_idxs.push(SEA_IDX);
                this.sea_mask_uri = sea_mask_uri;//used by editor
            }
            config.manifest.mapVersion[4] = mapVersion[4];
        }
        if (sand_mask_uri && check(5)) {
            if (asset_has_changed(5)) {
                console.log('apply_map_assets sand_mask');
                urls.push(sand_mask_uri);
                depth_idxs.push(SAND_IDX);
                this.sand_mask_uri = sand_mask_uri;
            }
            config.manifest.mapVersion[5] = mapVersion[5];
        }
        if (rock_mask_uri && check(6)) {
            if (asset_has_changed(6)) {
                console.log('apply_map_assets rock_mask');
                urls.push(rock_mask_uri);
                depth_idxs.push(ROCK_IDX);
                this.rock_mask_uri = rock_mask_uri;
            }
            config.manifest.mapVersion[6] = mapVersion[6];
        }

        if (urls.length)
            this.#update_texture_array(this.textures.map_masks, urls, depth_idxs);

        if (gui_uri && check(7)) {
            if (asset_has_changed(7)) {
                //console.log('apply_map_assets gui', mapId, parentMapId, mapVersion[7]);
                if (!parentMapId && mapId=='vanilla' && !mapVersion[7])//pixi backward compat (todo: remove when pixi support is no longer needed)
                    this.#update_texture_array(this.textures.array_1, ['assets/gui/ui_minimap.png'], [array_1_layout.minimap]);
                else
                    this.reload_minimap(gui_uri);
            }
            config.manifest.mapVersion[7] = mapVersion[7];
        }

        this.#updateMinimapGeometry();
        config.manifest.mapId = mapId;
        config.manifest.parentMapId = parentMapId;

        if (json)
            return json;
    }

    createMapFromJson(json, walls_json, doodads_json, polygons_json) {
        const {doodads, groundDoodads, walls, polygons, bounds, objects, extra} = json;

        config.doodads = doodads;
        config.groundDoodads = groundDoodads;
        config.walls = walls;
        config.polygons = polygons;
        config.objects = objects;
        config.extra = extra;

        // reset mountains, ground doodads
        Mobs.setupDoodads();

        // Helper to decode delta-encoded polygons
        function parsePolygons(polygons) {
            const vertices = []; // Flat array of xyz
            let h = 0, d = 0; // Global offsets
            const polygonRanges = [];

            for (let l = 0; l < polygons.length; l++) {
                const startVertexIndex = vertices.length / 3;
                const polyRaw = polygons[l];
                if (!polyRaw || polyRaw.length === 0) continue;

                // Earcut inputs
                const coords = []; // Flat [x,y, x,y...]
                const holeIndices = []; 

                let offset = 0;
                const outerCoords = []; // for hit testing

                // Loop through rings (0 = outer, >0 = holes)
                for (let u = 0; u < polyRaw.length; u++) {
                    const ring = polyRaw[u];
                    if (u > 0) {
                        holeIndices.push(offset / 2); // Start index of this hole
                    }

                    for (let a = 0; a < ring.length; a += 2) {
                        const t = ring[a] + h;
                        const r = ring[a + 1] + d;
                        coords.push(t, r);
                        if (u === 0) outerCoords.push([t, -r]);
                        h = t;
                        d = r;
                        offset += 2;
                    }
                }

                // Triangulate this polygon (Outer + Holes)
                const triangles = earcut(coords, holeIndices);

                // Convert indices back to XYZ vertices
                for (let i = 0; i < triangles.length; i++) {
                    const index = triangles[i];
                    vertices.push(coords[index * 2], coords[index * 2 + 1], 0); // Z=0
                }

                const vertexCount = (vertices.length / 3) - startVertexIndex;
                polygonRanges.push({ start: startVertexIndex, count: vertexCount, outerCoords });
            }
            return {vertexData: new Float32Array(vertices), polygonRanges}
        }

        const {vertexData, polygonRanges} = parsePolygons(polygons);
        this.polygonRanges = polygonRanges;
        this.activePolygonOverlay = null;
        this.polygonVertexCount = vertexData.length / 3;

        if (this.vertex_buffers.stencil) {
            this.vertex_buffers.stencil.destroy();
        }

        const vBuf = this.device.createBuffer({
            size: vertexData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(vBuf.getMappedRange()).set(vertexData);
        vBuf.unmap();
        this.vertex_buffers.stencil = vBuf;

        const uBuf = this.device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        this.device.queue.writeBuffer(uBuf, 0, mat4.identity());

        this.bind_groups.stencil = this.device.createBindGroup({
            layout: this.bindGroupLayouts.stencil,
            entries: [{ binding: 0, resource: { buffer: uBuf } }]
        });
    }

    apply_ships_assets(mapId, ships, assets) {
        console.log('apply_ships_assets', mapId, ships, assets, config.manifest);
        const asset_types = SHIP_ASSETS;
        const map_has_changed = config.manifest.mapId === null || (config.manifest.mapId=='vanilla' && config.manifest.mapId != mapId) || ( config.manifest.mapId < mapId);

        const urls = [], urls_shadow = [], depth_idxs = [], depth_idxs_shadow = [];
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
                urls.push(ship_datauri);
                depth_idxs.push(this.#assign_depth_index(id, false));
                config.manifest.ships[id][1] = ships[id][1];
            }
            if (checks[2]) {
                urls_shadow.push(ship_shadow_datauri);
                depth_idxs_shadow.push(this.#assign_depth_index(id, true));
                config.manifest.ships[id][2] = ships[id][2];
            }
        }

        if (urls.length) {
            this.#update_texture_array(this.textures.array_1, urls, depth_idxs, true);
        }
        if (urls_shadow.length) {
            this.#update_texture_array(this.textures.array_2, urls_shadow, depth_idxs_shadow, true);
        }

        Object.values(Players.all()).forEach(player=>player.reloadGraphics());
        UI.setupAircraft();
    }

    // assign texture array index of ship_id
    // texture_ship_mapping[0] maps ship to index of texture in texture array
    // texture_ship_mapping[1] is same but for shadows
    #assign_depth_index(ship_id, is_shadow) {
        const id_offset = 1; // id 0 doesn't exist
        const depth_offset = is_shadow ? array_2_layout.ships : array_1_layout.ships;
        const i = is_shadow ? 1 : 0;
        const reverse_mapping = new Array(TEXTURE_ARRAY_1_MAX_DEPTH);//depth to ship
        for (let j=id_offset; j<this.texture_ship_mapping[i].length; j++) {
            const depth = this.texture_ship_mapping[i][j];
            if (!isNaN(depth))
                reverse_mapping[depth] = j;
        }
        let first_available = null;
        for (let depth=depth_offset; depth<reverse_mapping.length; depth++) {
            if (reverse_mapping[depth] == ship_id)
                return depth;
            if (first_available === null && !reverse_mapping[depth] /*|| !config.manifest.ships[this.texture_ship_mapping[depth]]*/)  //first time or delete ship type
                first_available = depth;
        }
        if (first_available === null)
            throw "todo expand texture array?";
        else {
            this.texture_ship_mapping[i][ship_id] = first_available;
            return first_available;
        }
    }

    render(all_players, visible_players, visible_doodads, visible_mobs, visible_objects_count) {
        const {device, canvas} = this;
        // handle resize
        const width = Math.max(1, Math.min(device.limits.maxTextureDimension2D, canvas.clientWidth));
        const height = Math.max(1, Math.min(device.limits.maxTextureDimension2D, canvas.clientHeight));
        const needResize = width !== canvas.width || height !== canvas.height;
        if (needResize) {
            canvas.width = width;
            canvas.height = height;

            this.#initGameObjScreenVars(window.innerWidth, window.innerHeight);
            this.#resize_textures(width, height)
            this.#update_camera();
            this.#updateMinimapGeometry();
            this.bounding_box = null;
        }

        this.#update_emitters();
        this.#update_buffer_offsets(all_players, visible_players, visible_doodads, visible_mobs, visible_objects_count);
        this.#update_players(visible_players);
        this.#update_mobs(visible_mobs);
        this.#update_particles();
        this.#update_ui(all_players);
        this.#update_ctf_flags();
        this.#update_editor_overlay();
        {
            const { width, height } = this.canvas;
            const worldW = width / this.camera.zoom;
            const worldH = height / this.camera.zoom;
            const { x, y } = this.cameraState.center;
            write_instance( this.instanceData, this.shadowOverlayOffset * INSTANCE_STRIDE_FLOATS, x, y, 0, worldW, worldH, 0, 0, 1, 1, -1, 0, );
        }

        // for debug
        if (this.instance_counter + this.projectiles_counter + this.explosion_counter + this.playernames_counter + this.flags_counter + this.editor_counter != this.instanceCount2)
            throw "assert 1";
        if (this.projectiles_add_counter != this.additiveInstanceCount1)
            throw "assert 2";
        if (this.thrusters_glow_counter + this.explosion_add_counter + this.powerups_add_counter != this.additiveInstanceCount2)
            throw "assert 3";
        if (this.minimap_counter + 2 != this.instanceCount3)
            throw "assert 4";

        this.device.queue.writeBuffer(
            this.storage_buffers.instances, 
            0, 
            this.instanceData, 
            0, 
            this.totalInstanceCount * INSTANCE_STRIDE_FLOATS
        );

        if (this.doodads_changed) {
            this.#update_doodads(visible_doodads);
            this.device.queue.writeBuffer(
                this.storage_buffers.instances, 
                this.doodadsInstanceOffset * INSTANCE_STRIDE_FLOATS * 4,
                this.instanceData, 
                0, 
                this.doodadsInstanceCount * INSTANCE_STRIDE_FLOATS
            );
            this.doodads_changed = false;
        }

        if (this.needsMips) {
            this.#generate_mips(this.textures.array_1, [array_1_layout.text]);
            this.needsMips = false;
        }

        const commandEncoder = device.createCommandEncoder();
        const textureView = this.context.getCurrentTexture().createView();

        // [Shadow Pass] blend shadows with max alpha
        const shadowPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: this.textures.shadow_buffer.createView(),
                clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
                loadOp: 'clear',
                storeOp: 'store',
            }]
        });
        shadowPass.setPipeline(this.pipelines.shadows);
        shadowPass.setVertexBuffer(0, this.vertex_buffers.quad);
        shadowPass.setBindGroup(0, this.bind_groups.camera);
        shadowPass.setBindGroup(1, this.bind_groups.shadows);
        shadowPass.draw(6, this.shadowInstanceCount, 0, this.shadowsInstanceOffset);
        shadowPass.end();


        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store',
            }],
            depthStencilAttachment: {
                view: this.textures.depth.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
                stencilClearValue: 0,
                stencilLoadOp: 'clear',
                stencilStoreOp: 'store',
            },
        });

        renderPass.setBindGroup(0, this.bind_groups.camera);

        // land polygons stencil
        if (this.bind_groups.stencil) {
            renderPass.setPipeline(this.pipelines.stencil);
            renderPass.setBindGroup(1, this.bind_groups.stencil);
            renderPass.setStencilReference(1); 
            renderPass.setVertexBuffer(0, this.vertex_buffers.stencil);
            renderPass.draw(this.polygonVertexCount);
        }

        renderPass.setVertexBuffer(0, this.vertex_buffers.quad);

        // sea
        renderPass.setPipeline(this.pipelines.sea);
        renderPass.setBindGroup(1, this.bind_groups.sea);
        renderPass.setStencilReference(0); // don't draw if inside polygon
        renderPass.draw(6); // Quad

        // land
        renderPass.setPipeline(this.pipelines.land);
        renderPass.setBindGroup(1, this.bind_groups.land);
        renderPass.setStencilReference(1); // don't draw if outside polygon
        renderPass.draw(6);

        // [Doodads Pass] mountains 
        renderPass.setPipeline(this.pipelines.instances);
        renderPass.setBindGroup(1, this.bind_groups.instances);
        renderPass.draw(6, this.doodadsInstanceCount, 0, this.doodadsInstanceOffset);

        // [shadows overlay]
        renderPass.setBindGroup(1, this.bind_groups.shadows_layer);
        renderPass.draw(6, this.shadowOverlayCount, 0, this.shadowOverlayOffset);

        if (this.activePolygonOverlay && this.bind_groups.stencil) {
            renderPass.setPipeline(this.pipelines.overlay);
            renderPass.setBindGroup(1, this.bind_groups.stencil);
            renderPass.setVertexBuffer(0, this.vertex_buffers.stencil);
            renderPass.draw(this.activePolygonOverlay.count, 1, this.activePolygonOverlay.start, 0);

            // restore
            renderPass.setPipeline(this.pipelines.instances);
            renderPass.setVertexBuffer(0, this.vertex_buffers.quad);
        }

        renderPass.setBindGroup(1, this.bind_groups.instances);

        // [Main Pass 1]
        renderPass.draw(6, this.instanceCount1, 0, this.instanceOffset1);

        // [Blend Add Pass 1]
        renderPass.setPipeline(this.pipelines.instances_blend_add);
        renderPass.draw(6, this.additiveInstanceCount1, 0, this.additiveInstanceOffset1);

        // [Main Pass 2]
        renderPass.setPipeline(this.pipelines.instances);
        renderPass.draw(6, this.instanceCount2, 0, this.instanceOffset2);

        // [Blend Add Pass 2]
        renderPass.setPipeline(this.pipelines.instances_blend_add);
        renderPass.draw(6, this.additiveInstanceCount2, 0, this.additiveInstanceOffset2);

        renderPass.setBindGroup(0, this.bind_groups.ui_camera);

        // [Main Pass 3]
        renderPass.setPipeline(this.pipelines.instances);
        renderPass.draw(6, this.instanceCount3, 0, this.instanceOffset3);

        // [UI Pass]
        renderPass.setPipeline(this.pipelines.ui);
        renderPass.draw(6, this.uiInstanceCount1, 0, this.uiInstanceOffset1);

        renderPass.end();

        device.queue.submit([commandEncoder.finish()]);
    }

    /**
     * Buffer Layout
     * 
     * [Shadow Pass] -> shadowsInstanceOffset = 0
     *  +-----------------------------------+  <-- shadowOffset
     *  | shadows layer                     |      (Size: shadowInstanceCount
     *  +-----------------------------------+       Fill Idx: shadow_counter)
     * 
     * [Main Pass 1] -> instanceOffset1 = shadowInstanceCount
     *  +-----------------------------------+  <-- smokeOffset
     *  | smoke layer                       |      (Size: smoke, Idx: smoke_counter)
     *  +-----------------------------------+  <-- cratesOffset
     *  | crates layer                      |      (Size: crates, Idx: crates_counter)
     *  +-----------------------------------+  <-- thrustersOffset
     *  | thrusters layer                   |      (Size: thrusters, Idx: thrusters_counter)
     *  +-----------------------------------+
     *
     * [Blend Add Pass 1] -> additiveInstanceOffset1 = instanceOffset1 + instanceCount1
     *  +-----------------------------------+  <-- projectilesAddOffset
     *  | projectiles layer                 |      (Size: missile_glows, Idx: projectiles_add_counter)
     *  +-----------------------------------+
     *
     * [Main Pass 2] -> instanceOffset2 = additiveInstanceOffset1 + additiveInstanceCount1
     *  +-----------------------------------+  <-- projectilesOffset
     *  | projectiles layer                 |      (Size: missiles, Idx: projectiles_counter)
     *  +-----------------------------------+  <-- baseOffset
     *  | aircraft layer                    |      (Size: aircraft, Idx: instance_counter)
     *  +-----------------------------------+  <-- explosionsOffset
     *  | explosions layer                  |      (Size: explosions, Idx: explosion_counter)
     *  +-----------------------------------+  <-- playernamesOffset
     *  | playernames layer                 |      (Size: playernames, Idx: playernames_counter)
     *  +-----------------------------------+  <-- flagsOffset
     *  | flags layer                       |      (Size: flags, Idx: flags_counter)
     *  +-----------------------------------+  <-- editorOffset
     *  | editor draw                       |      (Size: editor_count, Idx: editor_counter)
     *  +-----------------------------------+
     * 
     * [Blend Add Pass 2] -> additiveInstanceOffset2 = instanceOffset2 + instanceCount2
     *  +-----------------------------------+  <-- glowsOffset
     *  | glows layer                       |      (Size: thruster_glows, Idx: thrusters_glow_counter)
     *  +-----------------------------------+  <-- explosionsAddOffset
     *  | explosions layer                  |      (Size:explosions_add, Idx: explosion_add_counter)
     *  +-----------------------------------+  <-- powerupsAddOffset
     *  | powerups layer                    |      (Size:powerups_add, Idx: powerups_add_counter)
     *  +-----------------------------------+
     * 
     * [Main Pass 3] -> instanceOffset3 = additiveInstanceOffset2 + additiveInstanceCount2
     *  +-----------------------------------+  <-- minimapMapOffset
     *  | minimap map                       |      (Size: MINIMAP_MAP, Idx: )
     *  +-----------------------------------+  <-- minimapMobsOffset
     *  | minimap objects                   |      (Size:dots+ctf_flags+ctf_bases, Idx:minimap_counter)
     *  +-----------------------------------+  <-- minimapBoxOffset
     *  | minimap viewport box              |      (Size: MINIMAP_BOX, Idx: )
     *  +-----------------------------------+
     * 
     * [UI Pass] -> uiInstanceOffset1 = instanceOffset3 + instanceCount3
     *  +-----------------------------------+  <-- hudOffset
     *  | hud,                              |      (Size: todo, Idx: i)
     *  +-----------------------------------+
     * 
     * [shadows overlay] -> shadowOverlayOffset = uiInstanceOffset1 + uiInstanceCount1
     *  +-----------------------------------+  <-- shadowOverlayOffset * INSTANCE_STRIDE_FLOATS
     *  | shadows overlay                   |      (Size: SHADOW_OVERLAY, Idx: i)
     *  +-----------------------------------+
     * 
     * [Doodads Pass] -> doodadsInstanceOffset = MAX_INSTANCES + MAX_PARTICLES
     *  +-----------------------------------+  <-- 0 (overwrite instanceData, separate writeBuffer)
     *  | Mountains,                        |      (Size: visible_doodads+ctf_bases, Idx: i)
     *  +-----------------------------------+
     */
    #update_buffer_offsets(all_players, visible_players, visible_doodads, visible_mobs, visible_objects_count) {
        const count = visible_players.length;
        const o_count = {
            thrusters: visible_objects_count?.thrusters ?? 0,
            rotors: visible_objects_count?.rotors ?? 0,
            missiles: visible_objects_count?.missiles ?? 0,
            crates: visible_objects_count?.crates ?? 0,
            playernames_glyphs: visible_objects_count?.playernames_glyphs ?? 0,
            badges: visible_objects_count?.badges ?? 0,
            flags: count,
            levels: visible_objects_count?.levels ?? 0, //level borders
            levels_glyphs: visible_objects_count?.levels_glyphs ?? 0,
        };
        const p_count = this.particles_count;
        const editor_count = this.editor_points?.length > 0 ? (this.editor_points.length * 2 - 1) : 0;//N points = N joints + (N-1) segments

        const aircraft = count + o_count.rotors;
        const smoke = p_count.missile_smoke + p_count.shockwave;
        const crates = o_count.crates;
        const explosions = p_count.fragment + p_count.e_smoke;
        const thrusters = o_count.thrusters + o_count.missiles;
        const missile_glows = o_count.missiles * 2; // 1 Thruster glow + 1 Smoke glow per missile
        const thruster_glows = o_count.thrusters; // Player thruster glows
        const missiles = o_count.missiles;
        const explosions_add = p_count.flash + p_count.spark;
        const ctf_flags = CTF_FLAGS, ctf_bases = CTF_BASES;
        const shadows = aircraft + thrusters + explosions + p_count.missile_smoke + crates + ctf_flags;
        const dots = all_players.length;
        const powerups_add = count * 2; //powerup + powerup_circle
        const playernames = o_count.playernames_glyphs + o_count.badges + o_count.flags + o_count.levels_glyphs + o_count.levels;

        this.shadowsInstanceOffset = 0;
        this.shadowInstanceCount = shadows;
        this.instanceOffset1 = this.shadowInstanceCount;
        this.instanceCount1 = smoke + crates + thrusters;
        this.additiveInstanceOffset1 = this.instanceOffset1 + this.instanceCount1;
        this.additiveInstanceCount1 = missile_glows;
        this.instanceOffset2 = this.additiveInstanceOffset1 + this.additiveInstanceCount1;
        this.instanceCount2 = missiles + aircraft + explosions + playernames + ctf_flags + editor_count;
        this.additiveInstanceOffset2 = this.instanceOffset2 + this.instanceCount2;
        this.additiveInstanceCount2 = thruster_glows + explosions_add + powerups_add;
        this.instanceOffset3 = this.additiveInstanceOffset2 + this.additiveInstanceCount2;
        this.instanceCount3 = dots + ctf_flags + ctf_bases + MINIMAP_BOX + MINIMAP_MAP;
        this.uiInstanceOffset1 = this.instanceOffset3 + this.instanceCount3;
        this.uiInstanceCount1 = 4; //4=hud (todo: use constants)
        this.shadowOverlayOffset = this.uiInstanceOffset1 + this.uiInstanceCount1;
        this.shadowOverlayCount = 1;
        this.totalInstanceCount = this.shadowOverlayOffset + this.shadowOverlayCount;
        this.doodadsInstanceOffset = MAX_INSTANCES + MAX_PARTICLES;
        this.doodadsInstanceCount = visible_doodads.length + ctf_bases;

        this.shadowOffset = this.shadowsInstanceOffset * INSTANCE_STRIDE_FLOATS;
        this.smokeOffset = this.instanceOffset1 * INSTANCE_STRIDE_FLOATS;
        this.cratesOffset = this.smokeOffset + smoke * INSTANCE_STRIDE_FLOATS;
        this.thrustersOffset = this.cratesOffset + crates * INSTANCE_STRIDE_FLOATS;
        this.projectilesAddOffset = this.additiveInstanceOffset1 * INSTANCE_STRIDE_FLOATS;
        this.projectilesOffset = this.instanceOffset2 * INSTANCE_STRIDE_FLOATS;
        this.baseOffset = this.projectilesOffset + missiles * INSTANCE_STRIDE_FLOATS;
        this.explosionsOffset = this.baseOffset + aircraft * INSTANCE_STRIDE_FLOATS;
        this.playernamesOffset = this.explosionsOffset + explosions * INSTANCE_STRIDE_FLOATS
        this.flagsOffset = this.playernamesOffset + playernames * INSTANCE_STRIDE_FLOATS
        this.editorOffset = this.flagsOffset + ctf_flags * INSTANCE_STRIDE_FLOATS
        this.glowsOffset = this.additiveInstanceOffset2 * INSTANCE_STRIDE_FLOATS;
        this.explosionsAddOffset = this.glowsOffset + thruster_glows * INSTANCE_STRIDE_FLOATS;
        this.powerupsAddOffset = this.explosionsAddOffset + explosions_add * INSTANCE_STRIDE_FLOATS;
        this.minimapMapOffset = this.instanceOffset3 * INSTANCE_STRIDE_FLOATS;
        this.minimapMobsOffset = this.minimapMapOffset + MINIMAP_MAP * INSTANCE_STRIDE_FLOATS;
        this.minimapBoxOffset = this.minimapMobsOffset + (dots + ctf_flags + ctf_bases) * INSTANCE_STRIDE_FLOATS;
        this.hudOffset = this.uiInstanceOffset1 * INSTANCE_STRIDE_FLOATS

        this.instance_counter = 0;
        this.projectiles_counter = 0;
        this.explosion_counter = 0;
        this.playernames_counter = 0;
        this.flags_counter = 0;
        this.shadow_counter = 0;
        this.thrusters_counter = 0;
        this.minimap_counter = 0;
        this.projectiles_add_counter = 0;
        this.thrusters_glow_counter = 0;
        this.explosion_add_counter = 0;
        this.powerups_add_counter = 0;
        this.editor_counter = 0;
    }

    #update_ui(all_players) {
        const {instanceData} = this;
        const { width, height } = this.canvas;

        // hud
        {
            const z = 0.9; //inverted normalized z (0 is far, 1 is near)
            const TYPE_ARC = 0;
            const idx = this.hudOffset;
            const {health, energy, health_color, energy_color, visible} = this.hudState;
            const shadowColor = 0x191919; //[0.1, 0.1, 0.1];
            const alpha = visible ? 1.0 : 0;
            const cx = width / 2, cy = height / 2;
            const scale = this.camera.zoom;
            const offset = 40 * scale; //separation from the center
            const radius = 145 * scale; //radius of the circle centered at the pivot point. A larger radius makes the curve flatter
            const thick = 14 * scale;
            const hPivotX = cx - offset; // center of the circle
            const ePivotX = cx + offset;
            const maxAngle = 0.52; //The angle from the horizontal center line to the top tip of the bar
            const totalRange = maxAngle * 2;
            const hStart = maxAngle - (totalRange * health);
            const eStart = maxAngle - (totalRange * energy);
            //shadow overhang
            const shadowThick = thick + 2;//left/right
            const angleMargin = 0 / radius; //top/bottom
            const shadowTop = maxAngle + angleMargin;
            const shadowBottom = -maxAngle - angleMargin;

            const bounding_box = this.bounding_box || (this.bounding_box = calculateArcGeo(radius, shadowThick, -maxAngle, maxAngle));

            // Shadows
            write_sdf_instance(instanceData, idx, hPivotX, cy, z, bounding_box.w, bounding_box.h, radius, shadowThick, shadowBottom, shadowTop, shadowColor, 0.3*alpha, TYPE_ARC, undefined, bounding_box.x, bounding_box.offY);
            write_sdf_instance(instanceData, idx + 1 * INSTANCE_STRIDE_FLOATS, ePivotX, cy, z, -bounding_box.w, bounding_box.h, radius, shadowThick, shadowBottom, shadowTop, shadowColor, 0.3*alpha, TYPE_ARC, undefined, -bounding_box.x, bounding_box.offY);
            // // Health
            write_sdf_instance(instanceData, idx + 2 * INSTANCE_STRIDE_FLOATS, hPivotX, cy, z+0.1, bounding_box.w, bounding_box.h, radius, thick, hStart, maxAngle, health_color, alpha, TYPE_ARC, undefined, bounding_box.x, bounding_box.offY);
            // Energy
            // Note: Negative width flips geometry, vertex shader 'sign' fix ensures correct SDF
            write_sdf_instance(instanceData, idx + 3 * INSTANCE_STRIDE_FLOATS, ePivotX, cy, z+0.1,-bounding_box.w, bounding_box.h, radius, thick, eStart, maxAngle, energy_color, alpha, TYPE_ARC, undefined, -bounding_box.x, bounding_box.offY);
        }

        // minimap
        {
            const minimap_visible = game.state == Network.STATE.PLAYING;
            const z = 1.0;
            const { screenX, screenY, drawW, drawH, worldW, worldH, uvs: mUV } = this.#minimapGeo;

            // map
            write_instance(instanceData, this.minimapMapOffset, screenX, -screenY, z, drawW, -drawH, 0, mUV.u, mUV.v, mUV.uw, mUV.vh, array_1_layout.minimap, undefined, undefined, minimap_visible?0.25:0);

            // viewport box
            const viewWorldW = width / this.camera.zoom;
            const viewWorldH = height / this.camera.zoom;
            const boxW = (viewWorldW / worldW) * drawW * 2 + 2;
            const boxH = (viewWorldH / worldH) * drawH * 2 + 2;
            const {x: boxX, y: boxY} = this.#worldToMini(this.cameraState.center.x, this.cameraState.center.y);
            write_instance(instanceData, this.minimapBoxOffset, boxX, -boxY, z, boxW, boxH, 0, ...uvs.minimap_box.uv, array_1_layout.items, undefined, undefined, minimap_visible?0.6:0);

            // mobs
            for (let i = 0; i < all_players.length; i++) {
                const {id, lowResPos} = all_players[i];
                const idx = this.minimapMobsOffset + this.minimap_counter * INSTANCE_STRIDE_FLOATS;
                const {sprite:{mobTextureName}} = (this.minimapMobs||{})[id] || {sprite:{}};
                if (!mobTextureName || !minimap_visible) { 
                    instanceData[idx + scale_idx] = 0, instanceData[idx + scale_idx + 1] = 0;
                    this.minimap_counter++;
                    continue;
                }
                const uv = mobTextureName=='minimapBlue' ? uvs.minimap_blue : uvs.minimap_mob;
                const _w = uv.w * 0.8, _h = uv.h * 0.8;
                const {x, y} = this.#worldToMini(lowResPos.x, lowResPos.y);
                write_instance(instanceData, idx, x, -y, z, _w, _h, 0, ...uv.uv, array_1_layout.items, undefined, undefined, 0.5);
                this.minimap_counter++;
            }
        }
    }

    #update_doodads(visible_doodads) {
        let i;
        for (i = 0; i < visible_doodads.length; i++) {
            const [posX, posY, type, scale, , , rotation, , {tint}={}] = visible_doodads[i];
            const posZ = 0;
            const baseIndex = i * INSTANCE_STRIDE_FLOATS;

            write_instance(this.instanceData, baseIndex, posX, posY, posZ, 512*scale, 512*scale, -(rotation||0), 0, 0, 1.0, 1.0, array_1_layout.mountain+type-1, undefined, undefined, undefined, undefined, undefined, tint);
        }

        // doodad_field
        const ctf = Games.ctf;
        for (let j=1; j<=CTF_BASES; j++) {
            const flag = j === BLUE ? ctf.flagBlue : ctf.flagRed;
            const idx = (i + j - 1) * INSTANCE_STRIDE_FLOATS;
            if (!flag) {
                this.instanceData[idx + scale_idx] = 0, this.instanceData[idx + scale_idx + 1] = 0;
                continue;
            }
            const uv = uvs.doodad_field;
            const w = uv.w * 0.5, h = uv.h * 0.5;
            const x = flag.basePos.x, y = flag.basePos.y;

            write_instance(this.instanceData, idx, x, y, 0, w, h, 0, ...uv.uv, array_1_layout.items, undefined, undefined, 1.0);
        }
    }

    #update_players(visible_players) {
        const {instanceData, shadowOffset, thrustersOffset, baseOffset, glowsOffset, powerupsAddOffset} = this;
        const cache = {};

        for (let i = 0; i < visible_players.length; i++) {
            const {type, alpha, pos, rot, scale, randomness, state, lowResPos, powerupActive, powerups, powerup_texture, powerup_tint, name, team, flag, level, bot, reel} = visible_players[i];

            const {graphics:{size:{w, h}, baseScale, anchor, thrusters, rotors}, special} = config.ships[type];
            const {x:posX, y:posY} = pos, posZ = 0;
            let shadowPosX, shadowPosY;
            const u_z = w / TEXTURE_ARRAY_1_MAX_SIZE.w, v_w = h / TEXTURE_ARRAY_1_MAX_SIZE.h, u_x = 0, v_y = 0;
            const oscillator = Tools.oscillator(0.025, 1e3, randomness);
            const shipAlpha = special === 5 ? alpha : 1.0;

            // ship
            {
                const baseIndex = baseOffset + this.instance_counter * INSTANCE_STRIDE_FLOATS;
                const _w = w * baseScale * scale * oscillator, _h = h * baseScale * scale * oscillator;
                const depth_idx = this.texture_ship_mapping[0][type];
                const anchorY = anchor[1];

                write_instance(instanceData, baseIndex, posX, posY, posZ,  _w, _h, -rot, u_x, v_y, u_z, v_w, depth_idx, undefined, undefined, alpha, undefined, anchorY);
                this.instance_counter++;
            }

            // ship shadow
            {
                const baseIndex = shadowOffset + this.shadow_counter * INSTANCE_STRIDE_FLOATS;
                const _w = w * baseScale * (1.2), _h = h * baseScale * (1.2);
                const depth_idx = this.texture_ship_mapping[1][type];
                ({x:shadowPosX, y:shadowPosY} = Mobs.shadowCoords(pos));
                const anchorY = anchor[1];

                write_instance(instanceData, baseIndex, shadowPosX, shadowPosY, posZ,  _w, _h, -rot, u_x, v_y, u_z, v_w, depth_idx, undefined, undefined, alpha, undefined, anchorY);
                this.shadow_counter++;
            }

            // thrusters
            if (thrusters?.length && Math.abs(state.thrustLevel) > 0.01) {
                let thuster_oscillator = Tools.oscillator(0.1, 0.5, randomness);
                thrusters.length > 1 && state.thrustLevel < 0 && (thuster_oscillator *= .7);
                const l = state.thrustLevel / 2 + (state.thrustLevel > 0 ? .5 : -.5);
                const thrustDirOffset = (state.thrustLevel > 0 ? state.thrustDir : 0);
                const u = Tools.clamp(2 * Math.abs(state.thrustLevel) - 0.1, 0, 1);
                for (let j=0; j<thrusters.length; j++) {
                    const {pos_angle, pos_radius, rot_factor, scale_x, scale_y, glow_pos_angle1, glow_pos_angle2, glow_pos_radius, glow_scale_x, glow_scale_y, glow_alpha_factor} = thrusters[j];

                    if (!cache[`thruster_${type}_${j}`])
                        cache[`thruster_${type}_${j}`] = [Math.sin(-pos_angle) * pos_radius, Math.cos(-pos_angle) * pos_radius];
                    let [localX, localY] = cache[`thruster_${type}_${j}`];
                    localX *= oscillator;
                    localY *= oscillator;

                    // thruster shadow
                    {
                        const baseIndex = shadowOffset + this.shadow_counter * INSTANCE_STRIDE_FLOATS;
                        const _w = uvs.thruster_shadow.w * (scale_x+0.1) * thuster_oscillator * l * scale * 4;
                        const _h = uvs.thruster_shadow.h * scale_y * thuster_oscillator * l * scale * 4;
                        const _rot = rot + rot_factor * thrustDirOffset;
                        const anchorY = 0.1;
                        const depth_idx = array_2_layout.items;

                        write_instance(instanceData, baseIndex, shadowPosX, shadowPosY, posZ, _w, _h, -_rot, ...uvs.thruster_shadow.uv, depth_idx, localX, -localY + 4, u*shipAlpha/2/*2.5*/, -rot, anchorY);
                    }

                    // thruster flame
                    {
                        const baseIndex = thrustersOffset + this.thrusters_counter * INSTANCE_STRIDE_FLOATS;
                        const _w = scale_x * uvs.thruster.w * thuster_oscillator * l * scale;
                        const _h = scale_y * uvs.thruster.h * thuster_oscillator * l * scale;
                        const _rot = rot + rot_factor * thrustDirOffset;
                        const anchorY = 0.1;
                        const depth_idx = array_1_layout.items;

                        write_instance(instanceData, baseIndex, posX, posY, posZ, _w, _h, -_rot, ...uvs.thruster.uv, depth_idx, localX, -localY, u*shipAlpha/*2.5*/, -rot, anchorY);
                        this.thrusters_counter++;
                    }

                    // thruster glow
                    {
                        const baseIndex = glowsOffset + this.thrusters_glow_counter * INSTANCE_STRIDE_FLOATS;
                        const _w = uvs.thruster_glow.w * glow_scale_x * 1.5 * state.thrustLevel * scale;
                        const _h = uvs.thruster_glow.h * glow_scale_y * 1.5 * state.thrustLevel * scale;
                        const localX = Math.sin(glow_pos_angle1 - glow_pos_angle2 * state.thrustDir) * glow_pos_radius * oscillator;
                        const localY = Math.cos(glow_pos_angle1 - glow_pos_angle2 * state.thrustDir) * glow_pos_radius * oscillator;
                        const _rot = 0;
                        const depth_idx = array_1_layout.items;

                        write_instance(instanceData, baseIndex, posX, posY, posZ, _w, _h, _rot, ...uvs.thruster_glow.uv, depth_idx, localX, -localY, glow_alpha_factor*state.thrustLevel*shipAlpha, -rot);
                        this.thrusters_glow_counter++;
                    }

                    this.shadow_counter++;
                }
            }

            // rotors
            if (rotors.length) {
                for (let j=0; j<rotors.length; j++) {
                    const {scale:rotor_scale, alpha:rotor_alpha, shadow_scale} = rotors[j];
                    {
                        const baseIndex = baseOffset + this.instance_counter * INSTANCE_STRIDE_FLOATS;
                        const _w = uvs.rotor.w * rotor_scale * baseScale * oscillator;
                        const _h = uvs.rotor.h * rotor_scale * baseScale * oscillator;
                        const depth_idx = array_1_layout.items;
                        instanceData[baseIndex + scale_idx] = 0, instanceData[baseIndex + scale_idx + 1] = 0;
                        write_instance(instanceData, baseIndex, posX, posY, posZ, _w, _h, state.rotorDir, ...uvs.rotor.uv, depth_idx, 0, 0, rotor_alpha);
                        this.instance_counter++;
                    }
                    {
                        const baseIndex = shadowOffset + this.shadow_counter * INSTANCE_STRIDE_FLOATS;
                        const _w = uvs.rotor_shadow.w * rotor_scale * baseScale * scale * shadow_scale;
                        const _h = uvs.rotor_shadow.h * rotor_scale * baseScale * scale * shadow_scale;
                        const depth_idx = array_2_layout.items;
                        write_instance(instanceData, baseIndex, shadowPosX, shadowPosY, posZ, _w, _h, state.rotorDir, ...uvs.rotor_shadow.uv, depth_idx);
                        this.shadow_counter++;
                    }
                }
            }

            // powerups
            {
                if (powerupActive && powerup_texture) {
                    const yOffset = 80;
                    const o = .35 * (0 == state.powerupFadeState ? 2 * (1 - state.powerupFade) + 1 : 1 - state.powerupFade) * Tools.oscillator(.075, 100, randomness);
                    const _alpha = .75 * (0 == state.powerupFadeState ? Tools.clamp(2 * state.powerupFade, 0, 1) : Tools.clamp(1 - 1.3 * state.powerupFade, 0, 1)) * alpha;

                    // powerup
                    {
                        const idx = powerupsAddOffset + this.powerups_add_counter * INSTANCE_STRIDE_FLOATS;
                        const _w = uvs[powerup_texture].w * o;
                        const _h = uvs[powerup_texture].h * o;
                        write_instance(instanceData, idx, posX, posY - yOffset, posZ, _w, _h, 0, ...uvs[powerup_texture].uv, array_1_layout.particles, undefined, undefined, _alpha);
                        this.powerups_add_counter++;
                    }
                    // circle
                    {
                        const idx = powerupsAddOffset + this.powerups_add_counter * INSTANCE_STRIDE_FLOATS;
                        instanceData[idx + scale_idx] = 0, instanceData[idx + scale_idx + 1] = 0;
                        const _w = uvs.powerup_circle.w * o * 1.35;
                        const _h = uvs.powerup_circle.h * o * 1.35;
                        write_instance(instanceData, idx, posX, posY - yOffset, posZ, _w, _h, state.powerupAngle, ...uvs.powerup_circle.uv, array_1_layout.particles, undefined, undefined, _alpha, undefined, undefined, powerup_tint);
                        this.powerups_add_counter++;
                    }
                } else {
                    for (let j=0; j<2; j++) {
                        const idx = powerupsAddOffset + this.powerups_add_counter * INSTANCE_STRIDE_FLOATS;
                        instanceData[idx + scale_idx] = 0, instanceData[idx + scale_idx + 1] = 0;
                        this.powerups_add_counter++;
                    }
                }
            }

            //playernames
            {
                let tint;
                if (GameType.CTF == game.gameType || game.server.config.tdmMode || GameType.CONQUEST == game.gameType)
                    tint = 1 == team ? TINT.BLUE_TEAM : TINT.RED_TEAM;
                else {
                    // if (player.in_my_team) {
                    //     tint = "#4076E2";
                    // } else if (player.in_team) {
                    //     tint = player.in_team;
                    // } else {
                        tint = team == game.myTeam ? TINT.WHITE : 0xFFEC52;
                    // }
                }
                const badge = state.badge === 0 ? 'badge_gold' : state.badge === 1 ? 'badge_silver' : 'badge_bronze', _flag = `flag_`+flag;
                const FLAG_WIDTH = 32; // 80 * 0.4
                const nameScale = 0.5 * (33/FONT_SIZE);
                const nameYOffset = 60;
                const {glyphs, totalWidth} = this.#text_glyphs(name, MAX_PLAYER_NAME_GLYPHS);
                const textPhysicalWidth = totalWidth * nameScale;
                const nameFlagHalfWidth = (textPhysicalWidth + FLAG_WIDTH + 10) / 2;
                let levelPhysicalWidth, levelBorderPhysicalWidth, levelGlyphs;
                const levelFontSize = bot ? 24 : 28;
                const levelScale = 0.5 * (levelFontSize / FONT_SIZE); 
                if (level != null || bot) {
                    const levelStr = bot ? "bot" : (level + "");
                    const {glyphs, totalWidth: levelTextWidth} = this.#text_glyphs(levelStr, MAX_LEVEL_GLYPHS);
                    levelPhysicalWidth = levelTextWidth * levelScale;
                    levelBorderPhysicalWidth = levelTextWidth * levelScale;
                    levelGlyphs = glyphs;
                }
                const nameplateX = posX - nameFlagHalfWidth + (state.hasBadge ? 12 : 0) - (levelPhysicalWidth ? levelPhysicalWidth / 2 + 8 : 0);

                const instance_count = this.#write_glyphs(instanceData, this.playernamesOffset + this.playernames_counter * INSTANCE_STRIDE_FLOATS, glyphs, nameplateX + 40, posY + nameYOffset, nameScale, tint, alpha);
                this.playernames_counter += instance_count;

                // flag
                {
                    const _w = uvs[_flag].w * 0.4, _h = uvs[_flag].h * 0.4;
                    const depth_idx = array_1_layout.flags + uvs[_flag].layer;
                    const _x = nameplateX + 15, _y = posY + nameYOffset + 10;
                    write_instance(instanceData, this.playernamesOffset + this.playernames_counter * INSTANCE_STRIDE_FLOATS, _x, _y, 0, _w, _h, 0, ...uvs[_flag].uv, depth_idx, 0, 0, reel?0:alpha);
                    this.playernames_counter++;
                }

                // badge
                if (state.hasBadge) {
                    const _w = uvs[badge].w * 0.3, _h = uvs[badge].h * 0.3;
                    const depth_idx = array_1_layout.items;
                    const _x = (nameplateX - 28) + (_w / 2);
                    const _y = (posY + nameYOffset) + (_h / 2);
                    write_instance(instanceData, this.playernamesOffset + this.playernames_counter * INSTANCE_STRIDE_FLOATS, _x, _y, 0, _w, _h, 0, ...uvs[badge].uv, depth_idx, 0, 0, alpha);
                    this.playernames_counter++;
                }

                // level
                if (level != null || bot) {
                    // levelborder
                    {
                        const _w = levelBorderPhysicalWidth + 10, _h = 32*0.65
                        const _x = nameplateX + 2 * nameFlagHalfWidth + 7.75 + (_w / 2) + 0;
                        const _y = posY + nameYOffset - 0.5 + (_h / 2);
                        const depth_idx = array_1_layout.items;
                        write_instance(instanceData, this.playernamesOffset + this.playernames_counter * INSTANCE_STRIDE_FLOATS, _x, _y, 0, _w, _h, 0, ...uvs.levelborder.uv, depth_idx, 0, 0, alpha * 0.4);
                        this.playernames_counter++;
                    }
                    // level
                    {
                        const _x = nameplateX + 2 * nameFlagHalfWidth + 10
                        const _y = posY + nameYOffset + (bot ? 3 : 2);
                        const levelTint = 0xC8C8C8; // rgb(200, 200, 200)
                        const count = this.#write_glyphs( instanceData, this.playernamesOffset + this.playernames_counter * INSTANCE_STRIDE_FLOATS, levelGlyphs, _x, _y, levelScale, levelTint, alpha);
                        this.playernames_counter += count;
                    }
                }
            }
        }
    }

    #text_glyphs(text, max_glyphs) {
        const glyphs = [];
        let totalWidth = 0;

        for (const char of text) {
            if (glyphs.length >= max_glyphs) break;
            const data = this.charAtlas.getChar(char);
            glyphs.push(data);
            totalWidth += (data.w + data.spacing);
        }

        return {glyphs, totalWidth};
    }

    #write_glyphs(instanceData, baseOffset, glyphs, posX, posY, scale, tint, alpha) {
        let currentX = posX;
        let instanceCount = 0;

        for (const data of glyphs) {
            const idx = baseOffset + instanceCount * INSTANCE_STRIDE_FLOATS;
            const w = data.w * scale;
            const h = data.h * scale;
            const quadCenterX = currentX + (w / 2);
            const quadCenterY = posY + (h / 2);
            const depth_idx = data.layer;

            write_instance(instanceData, idx, quadCenterX, quadCenterY, 0, w, h, 0, ...data.uv, depth_idx, 0, 0, alpha, undefined, undefined, data.tint ?? tint);

            currentX += (data.w + data.spacing) * scale;
            instanceCount++;
        }

        return instanceCount;
    }

    #update_mobs(visible_mobs) {
        const { instanceData, shadowOffset, projectilesOffset, projectilesAddOffset, thrustersOffset } = this;
        let crates_counter = 0;

        for (let i = 0; i < visible_mobs.length; i++) {
            const mob = visible_mobs[i];
            const { type, pos, spriteRot, state, exhaust, randomness, ownerId } = mob;
            let { alpha } = mob;
            const _pos = {...pos};
            const posZ = 0;
            const inactive_scale_factor = state.inactive ? 0 : 1; //replicates despawn_mob
            let texture, shadow_texture = 'missile_shadow', scale_x, scale_y, anchor_y, shadow_scale_x, shadow_scale_y, thruster_glow_scale_x, thruster_glow_scale_y, smoke_glow_scale_x, smoke_glow_scale_y, is_crate = false;;

            switch (type) {
            case MobType.PredatorMissile:
            case MobType.TornadoSingleMissile:
            case MobType.TornadoTripleMissile:
            case MobType.ProwlerMissile:
                texture = 'missile';
                scale_x = 0.2; scale_y = 0.15; 
                shadow_scale_x = 0.25; shadow_scale_y = 0.2;
                thruster_glow_scale_x = 3; thruster_glow_scale_y = 2;
                smoke_glow_scale_x = 1.5; smoke_glow_scale_y = 3;
                anchor_y = 0;
                break;
            case MobType.GoliathMissile:
            case MobType.CarrotMissile:
                texture = 'missile_fat';
                scale_x = 0.2; scale_y = 0.2;
                shadow_scale_x = 0.5; shadow_scale_y = 0.25;
                thruster_glow_scale_x = 4; thruster_glow_scale_y = 3;
                smoke_glow_scale_x = 2.5; smoke_glow_scale_y = 3;
                anchor_y = 0;
                break;
            case MobType.MohawkMissile:
                texture = 'missile_small';
                scale_x = 0.28; scale_y = 0.2;
                shadow_scale_x = 0.18; shadow_scale_y = 0.14;
                thruster_glow_scale_x = 3; thruster_glow_scale_y = 2;
                smoke_glow_scale_x = 2; smoke_glow_scale_y = 2;
                anchor_y = 0;
                break;
            case MobType.Upgrade:
            case MobType.MagicCrate:
                texture = 'crate_upgrade';
                is_crate = true;
                break;
            case MobType.Shield:
                texture = 'crate_shield';
                is_crate = true;
                break;
            case MobType.Inferno:
                texture = 'crate_rampage';
                is_crate = true;
                break;
            }

            if (is_crate) {
                const despawnFactor = (0 == state.despawnType ? 1 - state.despawnTicker : 1 + 2 * state.despawnTicker);
                const scale_factor = despawnFactor * Tools.oscillator(.08, 500, randomness);
                _pos.y += 20 * (Tools.oscillator(.08, 330, randomness) - 1.04);
                scale_x = 0.33 * scale_factor; scale_y = 0.33 * scale_factor;
                shadow_scale_x = 1.2 * 0.33 * scale_factor; shadow_scale_y = 1.2 * 0.33 * scale_factor;
                alpha = 1.0 - state.despawnTicker;
                shadow_texture = 'crate_shadow';
            }

            let tint;
            if (!is_crate) {
                if (game.gameType == GameType.CTF || GameType.CONQUEST == game.gameType) {
                    let team = Players.getMe().team == 1 ? 2 : 1;
                    if (ownerId) {
                        let owner = Players.get(ownerId);
                        if (owner) {
                            team = owner.team;
                        }
                    }
                    tint = (team == 1 ? TINT.BLUE_TEAM_MISSILE : TINT.RED_TEAM);
                } else if (game.gameType == GameType.FFA) {
                    if (ownerId) {
                        let owner = Players.get(ownerId);
                        if (owner && owner.in_my_team) {
                            tint = TINT.BLUE_TEAM_MISSILE;
                        }
                    }
                }
            }

            // body
            {
                let baseIndex;
                if (is_crate) {
                    baseIndex = this.cratesOffset + crates_counter * INSTANCE_STRIDE_FLOATS;
                    crates_counter++;
                } else {
                    baseIndex = projectilesOffset + this.projectiles_counter * INSTANCE_STRIDE_FLOATS
                    this.projectiles_counter++;
                }
                const depth_idx = array_1_layout.items;
                write_instance(instanceData, baseIndex, _pos.x, _pos.y, posZ, 
                uvs[texture].w * scale_x, uvs[texture].h * scale_y, -spriteRot, ...uvs[texture].uv, depth_idx, undefined, undefined, alpha, undefined, anchor_y, tint);
            }

            // shadow
            {
                const baseIndex = shadowOffset + this.shadow_counter * INSTANCE_STRIDE_FLOATS;
                const shadow_pos = Mobs.shadowCoords(pos);
                const anchor_y = 0.25;
                const depth_idx = array_2_layout.items;
                write_instance(instanceData, baseIndex, shadow_pos.x, shadow_pos.y, posZ, uvs[shadow_texture].w * shadow_scale_x * 2, uvs[shadow_texture].h * shadow_scale_y * 2, -spriteRot, ...uvs[shadow_texture].uv, depth_idx, undefined, undefined, alpha, undefined, anchor_y);
                this.shadow_counter++;
            }

            if (!is_crate) {
                // thruster
                {
                    const baseIndex = thrustersOffset + this.thrusters_counter * INSTANCE_STRIDE_FLOATS;
                    const oscillator = Tools.oscillator(.1, .5, randomness);
                    const localX = 0;
                    const localY = exhaust;
                    const scale_x = config.mobs[type].thruster[0] * oscillator * inactive_scale_factor;
                    const scale_y = config.mobs[type].thruster[1] * oscillator * inactive_scale_factor;
                    const anchor_y = 0.1;
                    const depth_idx = array_1_layout.items;
                    const alpha = config.mobs[type].thrusterAlpha;
                    write_instance(instanceData, baseIndex, pos.x, pos.y, posZ, uvs.thruster.w * scale_x, uvs.thruster.h * scale_y, -spriteRot, ...uvs.thruster.uv, depth_idx, localX, -localY, alpha, undefined, anchor_y, tint);
                    this.thrusters_counter++;
                }

                // thruster glow
                {
                    const baseIndex = projectilesAddOffset + this.projectiles_add_counter * INSTANCE_STRIDE_FLOATS;
                    const oscillator = Tools.oscillator(.15, 10, randomness);
                    const localX = 0;
                    const localY = exhaust + 20;
                    const scale_x = thruster_glow_scale_x * inactive_scale_factor;
                    const scale_y = thruster_glow_scale_y * inactive_scale_factor;
                    const depth_idx = array_1_layout.items;
                    const alpha = (((config.mobs[type].thrusterGlowAlpha || 1.0) * .5) * state.luminosity + .2) * oscillator;
                    write_instance(instanceData, baseIndex, pos.x, pos.y, posZ, uvs.thruster_glow.w * scale_x, uvs.thruster_glow.h * scale_y, 0, ...uvs.thruster_glow.uv, depth_idx, localX, -localY, alpha, -spriteRot);
                    this.projectiles_add_counter++;
                }

                // smoke glow
                {
                    const baseIndex = projectilesAddOffset + this.projectiles_add_counter * INSTANCE_STRIDE_FLOATS;
                    const localX = 0;
                    const localY = exhaust + 20;
                    const scale_x = smoke_glow_scale_x * inactive_scale_factor;
                    const scale_y = smoke_glow_scale_y * inactive_scale_factor;
                    const anchor_y = 0.3;
                    const depth_idx = array_1_layout.items;
                    const alpha = config.mobs[type].smokeGlowAlpha;
                    write_instance(instanceData, baseIndex, pos.x, pos.y, posZ, uvs.smoke_glow.w * scale_x, uvs.smoke_glow.h * scale_y, -spriteRot, ...uvs.smoke_glow.uv, depth_idx, localX, -localY, alpha, undefined, anchor_y, tint);
                    this.projectiles_add_counter++;
                }
            }
        }
    }

    #update_ctf_flags() {
        const ctf = Games.ctf, { instanceData, flagsOffset, shadowOffset, minimapMobsOffset, canvas } = this;

        for (let i=1; i<=CTF_FLAGS; i++) {
            const flag = i === BLUE ? ctf.flagBlue : ctf.flagRed;
            const idx = flagsOffset + this.flags_counter * INSTANCE_STRIDE_FLOATS;
            const shadowIdx = shadowOffset + this.shadow_counter * INSTANCE_STRIDE_FLOATS;
            const baseMinimapIdx = minimapMobsOffset + this.minimap_counter * INSTANCE_STRIDE_FLOATS;
            const flagMinimapIdx = minimapMobsOffset + (this.minimap_counter + 1) * INSTANCE_STRIDE_FLOATS;
            if (!flag) {
                instanceData[idx + scale_idx] = 0, instanceData[idx + scale_idx + 1] = 0;
                instanceData[shadowIdx + scale_idx] = 0, instanceData[shadowIdx + scale_idx + 1] = 0;
                instanceData[baseMinimapIdx + scale_idx] = 0, instanceData[baseMinimapIdx + scale_idx + 1] = 0;
                instanceData[flagMinimapIdx + scale_idx] = 0, instanceData[flagMinimapIdx + scale_idx + 1] = 0;
                this.flags_counter++;
                this.shadow_counter++;
                this.minimap_counter += 2; //flag+base
                continue;
            }
            if (flag.playerId != null) {
                // Flag is being carried
                let carrier = Players.get(flag.playerId);
                if (carrier) {
                    flag.visible = carrier.render;

                    if (carrier.render) {
                        flag.momentum = Tools.clamp(flag.momentum + (carrier.pos.x - flag.diffX) * game.timeFactor, -40, 40);
                        const directionModifier = flag.momentum > 0 ? 0.1 : -0.1;
                        flag.direction = Tools.clamp(flag.direction - directionModifier * game.timeFactor, -0.4, 0.4);
                        flag.spriteRotation = 0.04 * -(carrier.pos.x - flag.diffX) * game.timeFactor;
                        flag.position.x = carrier.pos.x;
                        flag.position.y = carrier.pos.y;
                        flag.diffX = carrier.pos.x;
                    }
                }
            } else {
                // Flag is dropped / at base
                flag.visible = this.inScreen(flag.position, 128);
                flag.direction = 0.4;
                flag.spriteRotation = 0;
            }

            if (flag.visible) {
                {
                    const uv = i === BLUE ? uvs.ctf_flag_blue : uvs.ctf_flag_red;
                    const w = uv.w * flag.direction; // Width can be negative (flips texture)
                    const h = uv.h * 0.4;
                    const rot = -(flag.spriteRotation || 0);
                    const depth_idx = array_1_layout.particles;
                    // Anchor X Handling:
                    // PIXI anchor X is at 15px. Center of texture is 64px.
                    // Distance from Center to Pole = 64 - 15 = 49px.
                    // We need to shift the sprite locally so the "pole" aligns with the world coordinates.
                    // If scale is positive (facing right), shift right. If negative, shift left.
                    const lX = 49 * flag.direction; 
                    const aY = 119/128;

                    write_instance(instanceData, idx, flag.position.x, flag.position.y, 0, w, h, rot, ...uv.uv, depth_idx, lX, 0, 1.0, undefined, aY);
                }
                // shadow
                {
                    const {x, y} = Mobs.shadowCoords(flag.position);
                    const uv = uvs.ctf_flag_shadow;
                    const dirSign = Math.sign(flag.direction || 1);
                    const shadowScale = 0.44 * 2.0;
                    const w = uv.w * shadowScale * dirSign;
                    const h = uv.h * shadowScale;
                    const rot = -(flag.spriteRotation || 0);
                    // PIXI Anchor is [3/32, 23/32]
                    // Pivot X in pixels = 3/32 * 64 = 6px. Center is 32px. Offset = 6 - 32 = -26px.
                    const lX = 26 * shadowScale * dirSign;
                    const aY = 23/32;
                    const depth = array_2_layout.items;

                    write_instance(instanceData, shadowIdx, x, y, 0, w, h, rot, ...uv.uv, depth, lX, 0, 1.0, undefined, aY);
                }
            } else {
                instanceData[idx + scale_idx] = 0, instanceData[idx + scale_idx + 1] = 0;
                instanceData[shadowIdx + scale_idx] = 0, instanceData[shadowIdx + scale_idx + 1] = 0;
            }
            this.flags_counter++;
            this.shadow_counter++;

            // minimap base
            if (flag.basePos && (game.gameType === GameType.CTF)) {
                const uv = i === BLUE ? uvs.minimap_base_blue : uvs.minimap_base_red;
                const _w = uv.w * 0.5, _h = uv.h * 0.5;
                const {x, y} = this.#worldToMini(flag.basePos.x, flag.basePos.y);
                write_instance(instanceData, baseMinimapIdx, x, -y, 1.0, _w, _h, 0, ...uv.uv, array_1_layout.items, undefined, undefined, 1.0);
            } else {
                instanceData[baseMinimapIdx + scale_idx] = 0; instanceData[baseMinimapIdx + scale_idx + 1] = 0;
            }

            // minimap flag
            {
                const uv = i === BLUE ? uvs.minimap_flag_blue : uvs.minimap_flag_red;
                const _w = uv.w * 0.5, _h = uv.h * 0.5;
                let targetX = flag.position.x, targetY = flag.position.y;
                if (flag.playerId != null) {
                    const carrier = Players.get(flag.playerId);
                    if (carrier && !carrier.render) {
                        targetX = carrier.lowResPos.x;
                        targetY = carrier.lowResPos.y;
                    }
                }
                const {x, y} = this.#worldToMini(targetX, targetY);
                write_instance(instanceData, flagMinimapIdx, x, -y, 1.0, _w, _h, 0, ...uv.uv, array_1_layout.items, undefined, undefined, 1.0);
            }

            this.minimap_counter += 2;
        }
    }

    #update_emitters() {
        const steps = game.timeFactor > .51 ? Math.round(game.timeFactor) : 1
        const dt = game.timeFactor / steps;

        for (let i = this.emitters.length - 1; i >= 0; i--) {
            const e = this.emitters[i];

            for (let r = 0; r < steps; r++) {
                e.life += e.decay * dt;
                if (e.life >= 1.0) {
                    this.emitters.splice(i, 1);
                    break;
                }

                e.speed.x *= (1 - e.drag * dt);
                e.speed.y *= (1 - e.drag * dt);
                e.pos.x += e.speed.x * dt;
                e.pos.y += e.speed.y * dt;

                if (this.particles.length < MAX_PARTICLES) {
                    const data = (1 - e.life) + 0.2;
                    const sequence = Tools.randInt(1, 16);
                    this.particles.push({
                        type: `fragment`,
                        texture: `smoke_${sequence}`,
                        shadowTexture: `smokeshadow_${sequence}`,
                        pos: { x: e.pos.x, y: e.pos.y },
                        speed: { x: 0, y: 0 },
                        scale: 0.5 * (1 - e.life),
                        scaleSpeed: 0.075 * data,
                        maxScale: 2 * data,
                        rot: Tools.randCircle(),
                        rotSpeed: Tools.rand(-0.1, 0.1),
                        tint: TINT.WHITE,
                        life: 0,
                        decay: 0.02,
                        alphaMul: 0.3,
                        drag: 0.05,
                        rotDrag: 0.05,
                    });
                    this.particles_count.fragment++;
                }
            }
        }
    }

    #update_particles() {
        const {instanceData, explosionsAddOffset, explosionsOffset, smokeOffset, shadowOffset} = this;
        let smoke_counter = 0;
        const steps = game.timeFactor > .51 ? Math.round(game.timeFactor) : 1
        const dt = game.timeFactor / steps;

        let i = 0;
        while (i < this.particles.length) {
            const p = this.particles[i];

            for (let r = 0; r < steps; r++) {
                p.life += p.decay * dt;
                if (p.life >= 1.0) {
                    this.particles_count[p.type]--;
                    this.particles.splice(i, 1);
                    i--;
                    break;
                }

                if (p.drag) {
                    const dragFactor = 1 - p.drag * dt;
                    p.speed.x *= dragFactor;
                    p.speed.y *= dragFactor;
                }
                if (p.rotDrag)
                    p.rotSpeed *= (1 - p.rotDrag * dt);
                p.pos.x += p.speed.x * dt;
                p.pos.y += p.speed.y * dt;
                p.scale = {x:p.scale.x ?? p.scale, y:p.scale.y ?? p.scale};
                p.scale.x += p.scaleSpeed * dt;
                if (p.maxScale && p.scale.x > p.maxScale) p.scale.x = p.maxScale; 
                p.scale.y += p.scaleSpeed * dt;
                if (p.maxScale && p.scale.y > p.maxScale) p.scale.y = p.maxScale; 
                p.rot += p.rotSpeed * dt;
            }

            if (p.life >= 1.0) {
                p.scale = {x:0, y:0}; //hide
            }

            let alpha = (p.easing ? Tools.easing.custom(p.life, p.easing) : (1.0 - p.life)) * (p.alphaMul || 1.0), shadow_alpha;
            if (alpha > 1.0) alpha = 1.0; 
            if (alpha < 0.0) alpha = 0.0;
            if (p.shadowTexture) {
                //TODO: original is * 2: hadow_alpha = (1.0 - p.life); //* (p.alphaMul || 1.0) * 2;
                shadow_alpha = p.easing ? Tools.easing.custom(p.life, p.easing) : (1.0 - p.life);
                if (shadow_alpha > 1.0) shadow_alpha = 1.0; 
                if (shadow_alpha < 0.0) shadow_alpha = 0.0;
            }
            let tint = p.type === 'missile_smoke' ? Tools.colorLerp(p.tint, TINT.WHITE, 2 * (1 - p.life)) : p.tint;

            if (p.type === 'fragment' || p.type === 'e_smoke' || p.type === 'missile_smoke' || p.type === 'shockwave') {
                if (p.type !== 'shockwave') { //shadow
                    const baseIndex = shadowOffset + this.shadow_counter * INSTANCE_STRIDE_FLOATS;
                    const _w = uvs[p.shadowTexture].w * p.scale.x, _h = uvs[p.shadowTexture].h * p.scale.y;
                    const depth_idx = array_2_layout.items;
                    const {x: sX, y: sY} = Mobs.shadowCoords(p.pos);

                    write_instance(instanceData, baseIndex, sX, sY, 0,  _w, _h, -p.rot, ...uvs[p.shadowTexture].uv, depth_idx, undefined, undefined, shadow_alpha, undefined, undefined, p.tint);
                    this.shadow_counter++;
                }
                {
                    let baseIndex;
                    if (p.type === 'missile_smoke' || p.type === 'shockwave') {
                        baseIndex = smokeOffset + smoke_counter * INSTANCE_STRIDE_FLOATS;
                        smoke_counter++;
                    } else {
                        baseIndex = explosionsOffset + this.explosion_counter * INSTANCE_STRIDE_FLOATS;
                        this.explosion_counter++;
                    }
                    const _w = uvs[p.texture].w * p.scale.x, _h = uvs[p.texture].h * p.scale.y;
                    const depth_idx = array_1_layout.particles;
                    write_instance(instanceData, baseIndex, p.pos.x, p.pos.y, 0,  _w, _h, -p.rot, ...uvs[p.texture].uv, depth_idx, undefined, undefined, alpha, undefined, undefined, tint);
                }
            } else {
                const baseIndex = explosionsAddOffset + this.explosion_add_counter * INSTANCE_STRIDE_FLOATS;
                const _w = uvs[p.texture].w * p.scale.x, _h = uvs[p.texture].h * p.scale.y;
                const depth_idx = array_1_layout.particles;

                write_instance(instanceData, baseIndex, p.pos.x, p.pos.y, 0,  _w, _h, -p.rot, ...uvs[p.texture].uv, depth_idx, undefined, undefined, alpha, undefined, undefined, p.tint);

                this.explosion_add_counter++;
            }

            i++;
        }
    }

    #update_editor_overlay() {
        if (!this.editor_points) return;
        const { instanceData, editor_points: points } = this;
        const uv = uvs.minimap_box; 
        const thickness = 8; //* this.camera.zoom; 
        const color = 0xFFFFFF; 
        const z = 0;

        // Draw segments
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i], p2 = points[i+1];
            const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
            const dist = Math.sqrt(dx*dx + dy*dy);
            const angle = Math.atan2(dy, dx);
            const mx = p1[0] + dx * 0.5, my = p1[1] + dy * 0.5;
            const idx = this.editorOffset + this.editor_counter * INSTANCE_STRIDE_FLOATS;

            write_instance(instanceData, idx, mx, my, z, dist + (thickness * 0.5), thickness, -angle, ...uv.uv, array_1_layout.items, 0, 0, 1.0, undefined, 0.5, color);
            this.editor_counter++;
        }

        // Draw vertices
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            const idx = this.editorOffset + this.editor_counter * INSTANCE_STRIDE_FLOATS;
            write_instance(instanceData, idx, p[0], p[1], z, thickness, thickness, 0, ...uv.uv, array_1_layout.items, 0, 0, 1.0, undefined, 0.5, 0xFFFFFF);
            this.editor_counter++;
        }
    }

    #update_camera() {
        const {canvas, camera, cameraWorldMatrix, projectionMatrix, viewMatrix, viewProjData} = this;
        // 1. Update Viewport dimensions
        camera.left = -canvas.width / 2;
        camera.right = canvas.width / 2;
        camera.top = canvas.height / 2;
        camera.bottom = -canvas.height / 2;

        // Projection Matrix (WebGPU Clip Space Z: 0 to 1)
        const zoom = camera.zoom;
        mat4.ortho(
            camera.left / zoom, 
            camera.right / zoom, 
            camera.bottom / zoom, 
            camera.top / zoom, 
            camera.near, 
            camera.far, 
            projectionMatrix
        );

        // View Matrix (Inverse of Camera World Position)
        mat4.translation([camera.position.x, camera.position.y, camera.position.z], cameraWorldMatrix);
        mat4.invert(cameraWorldMatrix, viewMatrix);

        // View Projection (Proj * View)
        mat4.multiply(projectionMatrix, viewMatrix, viewProjData);

        this.device.queue.writeBuffer(this.uniform_buffers.camera, 0, viewProjData);

        // ui camera
        mat4.ortho(0, this.canvas.width, this.canvas.height, 0, -1, 1, this.uiProjectionMatrix);
        this.device.queue.writeBuffer(this.uniform_buffers.ui_camera, 0, this.uiProjectionMatrix);
    }

    inScreen(e, n) {
        const {x, y} = this.cameraState.center, scale = this.camera.zoom;
        return e.x >= x - game.halfScreenX / scale - n && e.x <= x + game.halfScreenX / scale + n && e.y >= y - game.halfScreenY / scale - n && e.y <= y + game.halfScreenY / scale + n;
    }

    setCamera(x, y) {
        const cameraState = this.cameraState, scale = this.camera.zoom;
        var r = 0,
            i = 0;
        if (cameraState.shake > .5) {
            r = Tools.rand(-cameraState.shake, cameraState.shake);
            i = Tools.rand(-cameraState.shake, cameraState.shake);
            cameraState.shake *= 1 - .06 * game.timeFactor;
        };
        var o = game.halfScreenX / scale,
            s = game.halfScreenY / scale;
        x = Tools.clamp(x, game.server.config.mapBounds.MIN_X + o, game.server.config.mapBounds.MAX_X - o);
        y = Tools.clamp(y, game.server.config.mapBounds.MIN_Y + s, game.server.config.mapBounds.MAX_Y - s);
        this.cameraState = {x:r+x, y:i+y};

        this.#update_camera();
    }

    shakeCamera(e, n) {
        const cameraState = this.cameraState;
        var length = Tools.length(e.x - cameraState.center.x, e.y - cameraState.center.y),
            i = (game.halfScreenX / game.scale + game.halfScreenY / game.scale) / 2,
            o = Tools.clamp(1.3 * (1 - length / i), 0, 1);
        o < .1 || (cameraState.shake = o * n);
        this.#update_camera();
    }

    visibilityHUD(visible) {
        this.hudState.visible = visible;
    }

    updateHUD(health, energy, player) {
        if (player && !config.ships[player.type]) return;
        //const unpack = (c) => [(c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255];
        this.hudState.health = Tools.clamp(health, 0, 1);
        this.hudState.energy = Tools.clamp(energy, 0, 1);
        this.hudState.health_color = health > 0.5 ? Tools.colorLerp(13487404, 2591785, 2 * (health - 0.5)) : Tools.colorLerp(12201261, 13487404, 2 * health);
        this.hudState.energy_color = player && energy < config.ships[player.type].energyLight ? 2841755 : 3374821;
    }

    add_doodad() {
        this.doodads_changed = true;
        return {};
    }

    remove_doodad() {
        this.doodads_changed = true;
    }

    doodad_visibility() {
        this.doodads_changed = true;
    }

    add_minimap_mob(minimapMobs, mobTextureName) {
        this.minimapMobs = minimapMobs;
        return {mobTextureName};
    }

    powerup(player, type, tint) {
        player.powerup_texture = type; //'powerup_shield' or 'powerup_rampage'
        player.powerup_tint = player.powerups.rampage ? TINT.POWERUP_RAMPAGE : TINT.WHITE;
    }

    particles_explosion(pos, scale, fragments) {
        const _scale = scale > 1 ? 1 + (scale - 1) / 1.5 : scale;

        // flash
        for (let j = 0; j < 2; j++) {
            if (this.particles.length >= MAX_PARTICLES) break;
            this.particles.push({
                type: `flash`,
                texture: `flash_${Tools.randInt(1, 4)}`,
                pos: { x: pos.x, y: pos.y },
                speed: { x: 0, y: 0 },
                scale: 1.5 * scale, 
                scaleSpeed: 0,
                rot: Tools.randCircle(), 
                rotSpeed: 0,
                tint: TINT.YELLOW_FLASH,
                life: 0,
                decay: 0.1,
            });
            this.particles_count.flash++;
        }

        // spark
        for (let s = 0; s < Math.round(Tools.rand(20, 30) * scale); s++) {
            if (this.particles.length >= MAX_PARTICLES) break;
            const speed_angle = Tools.randCircle();
            const speed = Tools.rand(3, 10) * _scale;

            this.particles.push({
                type: `spark`,
                texture: `spark_${Tools.randInt(1, 4)}`,
                pos: { x: pos.x, y: pos.y },
                speed: { 
                    x: Math.cos(speed_angle) * speed,
                    y: -Math.sin(speed_angle) * speed
                },
                scale: Tools.rand(.4, 1.5) * _scale,
                scaleSpeed: 0,
                rot: Tools.randCircle(),
                rotSpeed: Tools.rand(-.2, .2),
                tint: TINT.ORANGE_SPARK,
                life: Tools.rand(0, .3),
                decay: 0.02,
                drag: 0.05,
                rotDrag: 0.05,
                alphaMul: 2.0
            });
            this.particles_count.spark++;
        }

        // fragment
        for (let s = 0; s < fragments; s++) {
            const angle = Tools.randCircle();
            const dist = Tools.rand(15, 30) * scale;
            const speedVal = Tools.rand(3, 7) * _scale;

            this.emitters.push({
                type: 'fragment',
                pos: { 
                    x: pos.x + Math.cos(angle) * dist, 
                    y: pos.y + Math.sin(angle) * dist 
                },
                speed: { 
                    x: Math.cos(angle) * speedVal,
                    y: Math.sin(angle) * speedVal,
                },
                life: Tools.rand(0, 0.5),
                decay: 0.02,
                drag: 0.02,
            });
        }

        // smoke
        for (let s = 0; s < Math.round(Tools.rand(20, 30) * scale); s++) {
            if (this.particles.length >= MAX_PARTICLES) break;

            const angle = Tools.randCircle();
            const dist = Tools.rand(0, 10) * scale;
            const speed = Tools.rand(0, 3) * scale;
            const sequence = Tools.randInt(1, 16);

            this.particles.push({
                type: 'e_smoke',
                texture: `smoke_${sequence}`,
                shadowTexture: `smokeshadow_${sequence}`,
                pos: { 
                    x: pos.x + Math.cos(angle) * dist, 
                    y: pos.y + Math.sin(angle) * dist 
                },
                speed: { 
                    x: Math.cos(angle) * speed, 
                    y: Math.sin(angle) * speed 
                },
                scale: Tools.rand(0.5, 0.8) * scale,
                scaleSpeed: 0.05,
                rot: Tools.randCircle(),
                rotSpeed: Tools.rand(-0.1, 0.1),
                tint: TINT.WHITE,
                life: 0,
                decay: 0.01,
                drag: 0.05,
                rotDrag: 0.05,
                alphaMul: 1.0,
                easing: 'explosionSmoke'
            });
            this.particles_count.e_smoke++;
        }

        // flash big
        if (this.particles.length < MAX_PARTICLES) {
            this.particles.push({
                type: 'flash',
                texture: 'glowsmall',
                pos: { x: pos.x, y: pos.y },
                speed: { x: 0, y: 0 },
                scale: 6 * scale,
                scaleSpeed: 0,
                rot: 0,
                rotSpeed: 0,
                tint: TINT.WHITE,
                life: 0,
                decay: 0.04,
                alphaMul: 1.0,
            });
            this.particles_count.flash++;
        }

        // hot smoke
        for (let s = 0; s < Math.round(Tools.rand(5, 10) * scale); s++) {
            if (this.particles.length >= MAX_PARTICLES) break;

            const angle = Tools.randCircle();
            const speedVal = Tools.rand(1, 3) * scale; 
            const sequence = Tools.randInt(1, 4);

            this.particles.push({
                type: 'flash',
                texture: `hotsmoke_${sequence}`,
                pos: { x: pos.x, y: pos.y }, 
                speed: { 
                    x: Math.cos(angle) * speedVal, 
                    y: Math.sin(angle) * speedVal 
                },
                scale: Tools.rand(0.1, 0.3) * scale,
                scaleSpeed: 0.05,
                rot: Tools.randCircle(),
                rotSpeed: Tools.rand(-0.1, 0.1),
                tint: TINT.ORANGE_SPARK,
                life: 0,
                decay: 0.035,
                drag: 0.1,
                rotDrag: 0.05,
                alphaMul: 1.0,
            });
            this.particles_count.flash++;
        }
    }

    particles_missile_smoke(mob, exhaust, data, tint) {
        if (this.particles.length >= MAX_PARTICLES) return;

        data = data || 1;
        const rotation = mob.spriteRot + Math.PI;
        const pos = {
            x: mob.pos.x + Math.sin(rotation) * exhaust,
            y: mob.pos.y - Math.cos(rotation) * exhaust
        };
        const u = Tools.rand(-0.1, 0.1);
        const speedVal = 5 * data;
        const index = Tools.randInt(1, 16);
        const rotSpeed = Tools.rand(-0.1, 0.1);
        const baseScale = 0.2 * data;

        let scaleSpeed = 0.2, maxScale = 2.0, decay = 0.05;
        if (mob.type === window.MobType.MohawkMissile) { scaleSpeed = 0.14, maxScale = 1.4, decay = 0.08; }
        else if (mob.type === window.MobType.GoliathMissile || mob.type === window.MobType.CarrotMissile) { scaleSpeed = 0.3; maxScale = 3.0; decay = 0.05; }

        this.particles.push({
            type: 'missile_smoke',
            texture: `smoke_${index}`,
            shadowTexture: `smokeshadow_${index}`,
            pos: pos,
            speed: {
                x: Math.sin(rotation + u) * speedVal,
                y: -Math.cos(rotation + u) * speedVal
            },
            scale: { x: 1.25 * baseScale, y: 4.0 * baseScale },
            scaleSpeed,
            maxScale: data * maxScale, 
            rot: rotation, 
            rotSpeed,
            tint: tint ?? TINT.YELLOW_SMOKE,
            life: 0,
            decay,
            drag: 0.05,
            alphaMul: 0.7,
        });
        this.particles_count.missile_smoke++;
    }

    particles_plane_boost(player, isBoost) {
        if (this.particles.length >= MAX_PARTICLES) return;

        const rot = player.rot + player.state.thrustDir / 2 + Math.PI;
        const offsetDist = isBoost ? 40 : -20; // Offset distance: 40 if boosting, -20 if braking
        const pos = {
            x: player.pos.x + Math.sin(rot) * offsetDist,
            y: player.pos.y - Math.cos(rot) * offsetDist
        };

        // Calculate velocity vector
        const angleJitter = Tools.rand(-0.1, 0.1);
        const boostAngleOffset = isBoost ? 0 : Math.PI;
        const angle = rot + angleJitter + boostAngleOffset;
        const speedVal = 6;
        const speed = {
            x: Math.sin(angle) * speedVal,
            y: -Math.cos(angle) * speedVal
        };

        const sequence = Tools.randInt(1, 16);
        const rotSpeed = Tools.rand(-0.1, 0.1);
        const data = 1.2; 

        this.particles.push({
            type: 'missile_smoke',
            texture: `smoke_${sequence}`,
            shadowTexture: `smokeshadow_${sequence}`,
            pos: pos,
            speed: speed,
            scale: { x: 0.3, y: 1.2 },
            scaleSpeed: 0.2,
            maxScale: 2 * data,
            rot: rot,
            rotSpeed: rotSpeed,
            tint: TINT.BOOST_SMOKE,
            life: 0,
            decay: 0.05,
            drag: 0.05,
            alphaMul: 1.0,
        });
        this.particles_count.missile_smoke++;
    }

    particles_plane_damage(player) {
        if (this.particles.length >= MAX_PARTICLES) return;

        const angle = Tools.randCircle();
        const life = Tools.rand(0, 0.3);
        const r = player.type == window.PlaneType.Goliath ? 2 : 1;
        const offsetDist = Tools.rand(0, 5 * r);
        const pos = {
            x: player.pos.x + Math.sin(angle) * offsetDist,
            y: player.pos.y - Math.cos(angle) * offsetDist
        };
        const s = Tools.rand(0.5, 2);
        const speed = {
            x: (Math.sin(angle) * s) + player.speed.x,
            y: (-Math.cos(angle) * s) + player.speed.y
        };

        this.particles.push({
            type: 'spark',
            texture: `spark_${Tools.randInt(1, 4)}`,
            pos: pos,
            speed: speed,
            scale: Tools.rand(0.2, 0.8),
            scaleSpeed: 0,
            rot: Tools.randCircle(),
            rotSpeed: 0,
            tint: TINT.ORANGE_SPARK,
            life,
            decay: 0.02,
            drag: 0.1,
            alphaMul: 2.0
        });
        this.particles_count.spark++;
    }

    particles_spirit_shockwave(pos) {
        if (this.particles.length >= MAX_PARTICLES) return;

        // 1. Smoke Ring
        for (let i = 0; i < 40; i++) {
            const angle = (i / 40) * 2 * Math.PI;
            const sequence = Tools.randInt(1, 16);

            this.particles.push({
                type: 'shockwave', 
                texture: `smoke_${sequence}`,
                pos: { x: pos.x, y: pos.y },
                speed: { 
                    x: Math.sin(angle) * 8, 
                    y: -Math.cos(angle) * 8 
                },
                scale: 2.0, 
                scaleSpeed: 0,
                rot: Tools.randCircle(),
                rotSpeed: 0.4,
                tint: TINT.WHITE,
                life: 0,
                decay: 0.05,
                drag: 0,
                alphaMul: 0.7,
                easing: 'shockwave' 
            });
            this.particles_count.shockwave++;
        }

        // 2. Inner Shockwave
        this.particles.push({
            type: 'shockwave',
            texture: 'shockwave',
            pos: { x: pos.x, y: pos.y },
            speed: { x: 0, y: 0 },
            scale: 0, 
            scaleSpeed: 0.05 * 3, // decay * target_scale (3)
            rot: -0.35 + Math.PI,
            rotSpeed: 0,
            tint: TINT.WHITE,
            life: 0,
            decay: 0.05,
            alphaMul: 0.4,
            easing: 'shockwave'
        });
        this.particles_count.shockwave++;

        // 3. Outer Shockwave
        this.particles.push({
            type: 'shockwave',
            texture: 'shockwave',
            pos: { x: pos.x, y: pos.y },
            speed: { x: 0, y: 0 },
            scale: 0,
            scaleSpeed: 0.05 * 4, // decay * target_scale (4)
            rot: -0.35,
            rotSpeed: 0,
            tint: TINT.WHITE,
            life: 0,
            decay: 0.05,
            alphaMul: 0.4,
            easing: 'shockwave'
        });
        this.particles_count.shockwave++;
    }

    highlight_polygon(x, y) {
        for (let i=0; i<this.polygonRanges.length; i++) {
            const polygon = this.polygonRanges[i];
            if (Tools.isPointInsidePolygon([x, y], polygon.outerCoords)) {
                this.activePolygonOverlay = this.activePolygonOverlay == polygon ? null : polygon;
                return this.activePolygonOverlay === null ? null : i;
            }
        }
    }

    set_editor_points(points) {
        this.editor_points = points;
    }

    reload_minimap(uri) {
        this.#update_texture_array(this.textures.array_1, [uri], [array_1_layout.minimap]);
    }

    update_map_mask(data, layer_index, x, y, w, h) {
        const originY = 2048 - (y + h);

        this.device.queue.writeTexture(
            { texture: this.textures.map_masks, origin: [x, originY, layer_index] },
            data,
            { bytesPerRow: w * 4, rowsPerImage: h },
            { width: w, height: h }
        );
    }
}

// Calculates the bounding box for an Arc Segment
function calculateArcGeo(radius, thick, startAng, endAng) {
    const angles = [startAng, endAng];
    if (startAng < 0 && endAng > 0) angles.push(0);
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (let a of angles) {
        const x = -Math.cos(a) * radius;
        const y = Math.sin(a) * radius;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    const halfThick = thick / 2 + 2; // +2 pixels for AA safety
    minX -= halfThick; maxX += halfThick;
    minY -= halfThick; maxY += halfThick;
    const w = maxX - minX;
    const h = maxY - minY;
    const x = minX + (w / 2);
    const y = minY + (h / 2);
    const offX = -x;
    const offY = -y;
    return { x, y, w, h, offX, offY };
}

class CharAtlas {
    constructor(renderer, texture, layer_idxs, size) {
        this.renderer = renderer;
        this.size = size;
        this.texture = texture;
        this.layer_idxs = Array.isArray(layer_idxs) ? layer_idxs : [layer_idxs];
        this.currentLayerPtr = 0;
        this.charMap = new Map();
        this.S = 5;
        this.nextX = this.S;
        this.nextY = this.S;
        this.rowHeight = 0;
        this.fontSize = FONT_SIZE;
        this.canvas = new OffscreenCanvas(size, size);
        this.ctx = this.canvas.getContext('2d');
        for (const c of '?abcdefghijklmnoprstuvwxyRCMSJF')
            this.bakeChar(c);
    }

    getChar(char) {
        if (this.charMap.has(char)) {
            return this.charMap.get(char);
        }
        if (this.oom) {
            return this.getChar('?');
        }
        return this.bakeChar(char);
    }

    bakeChar(char) {
        const {ctx, canvas, fontSize} = this;
        const fontFamily = 'MontserratWeb, Helvetica, sans-serif';
        const is_emoji = isEmoji.test(char);
        const font = `bold ${fontSize}px ${fontFamily}`;
        const padding = FONT_PADDING + 2;
        const resolution = 1;

        ctx.font = font;
        ctx.textBaseline = 'top';
        const metrics = ctx.measureText(char);

        const logicalWidth = Math.ceil(metrics.width) + (padding * 2);
        const logicalHeight = fontSize + (padding * 2);
        const width = Math.ceil(logicalWidth * resolution);
        const height = Math.ceil(logicalHeight * resolution);

        canvas.width = width;
        canvas.height = height;
        ctx.scale(resolution, resolution);
        ctx.clearRect(0, 0, width, height);
        ctx.font = font;
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillText(char, padding, padding);

        // Simple "Shelf" Packing algorithm
        if (this.nextX + width > this.size) {
            this.nextX = this.S;
            this.nextY += this.rowHeight + this.S;
            this.rowHeight = 0;
        }
        if (this.nextY + height > this.size) {
            if (this.currentLayerPtr < this.layer_idxs.length - 1) {
                this.currentLayerPtr++;
                this.nextX = this.S;
                this.nextY = this.S;
                this.rowHeight = 0;
            } else {
                this.oom = true;
                return this.getChar('?');
            }
        }
        this.rowHeight = Math.max(this.rowHeight, height);

        this.renderer.device.queue.copyExternalImageToTexture(
            { source: canvas, flipY: true },
            { texture: this.texture, origin: [this.nextX, this.nextY, this.layer_idxs[this.currentLayerPtr]] },
            [width, height]
        );
        this.renderer.needsMips = true;

        const data = {
            uv: [ this.nextX / this.size, this.nextY / this.size, width / this.size, height / this.size],
            w: logicalWidth, h: logicalHeight,
            spacing: -(3 + FONT_PADDING)*2,
            tint: is_emoji ? TINT.WHITE : undefined,
            layer: this.layer_idxs[this.currentLayerPtr],
        };

        this.charMap.set(char, data);
        this.nextX += width + this.S;
        return data;
    }
}
