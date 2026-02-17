import { fetch_catalog, PUBLIC_NAMESPACE, copy_assets, load_assets, upload_map_assets, upload_ship_assets, set_token, MAP_ASSETS, SHIP_ASSETS } from './assets.js';

const editorState = {
    editor_cmd: null,
    bounds: null,
    selected_mountain: null,
    mountain_scale: 0.9,
    selected_polygon: null, 
    polygons: null, 
    drawing: false, 
    points: null,
    paint_type: null,
    brush: {
        radius: 10,
        step: 40, //0-255
        gradient: true,
        delay: 100,
    },
    control_ship: false,
}
const simplify_tolerance = 5;   //higher values -> less points
const radiusToScaleRatio = 120; //config.doodads uses scale, config.walls uses radius
let catalog;


async function upload_map_assets_helper(asset, version, namespace) {
    const assets = typeof asset != "undefined" ? {
        [asset]: export_map_asset(asset)
    } : MAP_ASSETS.map((_, i)=>export_map_asset(i));
    return upload_map_assets(assets, version, namespace);
}

async function upload_ship_assets_helper(ship_id, asset, version, namespace, body) {
    const assets = typeof asset != "undefined" ? {
        [asset]: body ?? export_ship_asset(ship_id, asset)
    } : SHIP_ASSETS.map((_,i) => body ?? export_ship_asset(ship_id, i));
    return upload_ship_assets(ship_id, assets, version, namespace);
}


export async function startEditor() {
    if (game.state !== Network.STATE.LOGIN) {
        console.error('Logout to enter editor mode');
        return;
    }

    fetch_catalog().then(maps=>catalog=maps);

    await load_map(config.manifest);
    Games.selectServer(null, {}, true);
    Games.start(document.querySelector("#playername").value.trim(), true);
    //UI.nameEntered();

    initMaskCanvas('sea');
    initMaskCanvas('rock');
    initMaskCanvas('sand');
}
window.startEditor = startEditor;

async function load_map({mapId:parentMapId, mapVersion, ships}) {
    const mapId = uuidv7();
    await copy_assets(parentMapId, mapId, PUBLIC_NAMESPACE, Network.peer_id);
    const mapBounds = await load_assets({parentMapId, mapId, mapVersion, ships});
    game.server.config.mapBounds = mapBounds;
    if (window._server)
        window._server.postMessage({init:true, config, mapBounds});
}

async function save_map(mapIdTarget) {
    await navigator.locks.request("save_lock", { ifAvailable: true }, async (lock) => {
        if (!lock) {
            return;
        }
        try {
            await copy_assets(config.manifest.mapId, mapIdTarget, Network.server_id, PUBLIC_NAMESPACE);
            fetch_catalog().then(maps=>catalog=maps);
            if (mapIdTarget == config.manifest.mapId)//saveas
                window._server.postMessage({init:true, setParentMapId:mapIdTarget});

            document.querySelector('.save_msg').textContent = `Map saved as ${mapIdTarget}`;
            document.querySelector('#saveas_btn').setAttribute('disabled', true);

            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch(e) {
            console.error(e);
        }
    });
}

export function prepEditor() {
    game.freeCamera = true;
    Input.setupEditorMode();
    
    const show = true;
    show ? UI.show("#debug_options") : UI.hide("#debug_options");;
    document.querySelector('.debug_editor').style.display = show?'block':'none';
    document.querySelector('.debug_client').style.display = show?'none':'block';
    document.querySelector('.debug_server').style.display = show?'none':'block';
    document.querySelector('#scorebig').style.display = show?'none':'block';
    document.querySelector('#scoreboard').style.display = show?'none':'block';
    document.querySelector('#roomnamecontainer').style.display = show?'none':'block';
    document.querySelector('#settings').style.display = show?'none':'block';
    if (!Games.getCurrentServer().url)
        document.querySelector('#menu').style.display = 'none';
    //document.querySelector('#sidebar').style.display = 'none';
    document.querySelector('#debug_options').style.bottom = 'unset';
    document.querySelector('#debug_options').style.top = '20px';
    if (show)
        UI.minimizeChat();
    else
        UI.maximizeChat();
}

export function wipeEditor() {
    game.freeCamera = false;
    Input.setup();
    Tools.hideDebugOptions();
}

Input.setupEditorMode = function() {
    Input.unsetup();
    window.addEventListener('keydown', (e) => {
        if (['INPUT', 'SELECT'].includes(e.target.tagName)) return;
        if (game.gameType != GameType.EDITOR) return;
        if (editorState.control_ship) return;
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
            let {x, y} = game.renderer.cameraState.center;
            if (e.key == "ArrowUp") y -= 500;
            if (e.key == "ArrowDown") y += 500;
            if (e.key == "ArrowLeft") x -= 500;
            if (e.key == "ArrowRight") x += 500;
            game.renderer.setCamera(x, y);
            e.stopPropagation();
        }
    }, true);
    window.addEventListener('mousedown', (e) => {
        if (game.gameType != GameType.EDITOR) return;
        if (e.target.tagName != 'CANVAS') return;

        let {position:{x, y}} = game.renderer.cameraState;
        x = x + e.clientX / game.scale;
        y = y + e.clientY / game.scale;

        if (editorState.editor_cmd == 'select_mountain') {
            if (editorState.selected_mountain) {
                editorState.selected_mountain[1][8].tint = 0xffffff;
            }
            let [id, doodad, is_not_mountain] = Mobs.getDoodadAtCoord(x, y);
            if (doodad && !is_not_mountain) {
                editorState.selected_mountain = [id, doodad];
                doodad[8].tint = 0xff0000;
            } else {
                editorState.selected_mountain = null;
            }
            game.renderer.redrawBackground?.();//for pixi renderer
            game.renderer.doodad_visibility(doodad, true);//for new renderer
        } else if (editorState.editor_cmd == 'place_mountain') {
            Input.editorCmd('place_mountain', {x, y, scale:editorState.mountain_scale*radiusToScaleRatio});
        } else if (editorState.editor_cmd == 'select_polygon') {
            drawPolygonsOverlay([x, y]);
        } else if (editorState.editor_cmd == 'draw_polygon') {
            drawPolygon('begin', [x, y]);
        } else if (editorState.editor_cmd == 'paint') {
            //paintMask(x, y);
            Input.editorCmd('paint', {x, y});
            editorState.paint_x = x, editorState.paint_y = y;
            editorState.paint_timer = setInterval(()=>{
                //paintMask(editorState.paint_x, editorState.paint_y);
                Input.editorCmd('paint', {x:editorState.paint_x, y:editorState.paint_y});
            }, editorState.brush.delay);
        }
    });
    window.addEventListener('mousemove', (e) => {
        if (game.gameType != GameType.EDITOR) return;
        if (e.target.tagName != 'CANVAS') return;
        
        let {position:{x, y}} = game.renderer.cameraState;
        x = x + e.clientX / game.scale;
        y = y + e.clientY / game.scale;

        if (editorState.editor_cmd == 'draw_polygon') {
            drawPolygon('drawing', [x, y]);
        } else if (editorState.editor_cmd == 'paint') {
            editorState.paint_x = x, editorState.paint_y = y;
        }
    });
    window.addEventListener('mouseup', (e) => {
        if (game.gameType != GameType.EDITOR) return;
        if (e.target.tagName != 'CANVAS') return;
        if (editorState.editor_cmd == 'draw_polygon') {
            let {position:{x, y}} = game.renderer.cameraState;
            x = x + e.clientX / game.scale;
            y = y + e.clientY / game.scale;
            drawPolygon('end', [x, y]);
        } else if (editorState.editor_cmd == 'paint') {
            clearInterval(editorState.paint_timer);
        }
    });
    window.addEventListener('mousewheel', (e) => {
        if (game.gameType != GameType.EDITOR) return;
        e.stopPropagation();
        let {x, y} = game.renderer.cameraState.center;
        y += e.deltaY * 10;
        x += e.deltaX * 10;
        game.renderer.setCamera(x, y);
    });
    document.documentElement.style.overscrollBehaviorX = 'none';
};

Input.editorCmd = function(cmd, params) {
    console.log('editorCmd', cmd, params);
    if (!cmd) return;
    if (false){
    } else if (cmd == 'play') {
        if (params) {
            Network.sendCommand("server", `mode 1`);
        }
    } else if (cmd == 'delete_polygon') {
        //deletePolygon(editorState.selected_polygon);
        if (editorState.selected_polygon !== null)
            Network.sendCommand("editor", `map delete_polygon ${editorState.selected_polygon}`);
        return;

    } else if (cmd == 'add_polygon') {
        Network.sendCommand("editor", `map add_polygon ${JSON.stringify(params.points)}`);
        return;

    } else if (cmd == 'delete_mountain') {
        if (editorState.selected_mountain)
            Network.sendCommand("editor", `map delete_mountain ${editorState.selected_mountain[0]}`);
        return;

    } else if (cmd == 'set_bounds') {
        const bounds = {...game.server.config.mapBounds, ...(params||{})};
        Network.sendCommand("server", `editor bounds ${bounds.MIN_X} ${bounds.MIN_Y} ${bounds.MAX_X} ${bounds.MAX_Y}`);

    } else if (cmd == 'select_mountain') {

    } else if (cmd == 'place_mountain') {
        if ('x' in (params||{}))
            Network.sendCommand("editor", `map place_mountain ${params.x} ${params.y} ${params.scale}`);
        else
            editorState.mountain_scale = parseFloat(params?.mountain_scale || editorState.mountain_scale);

    } else if (cmd == 'select_polygon') {

    } else if (cmd == 'draw_polygon') {

    } else if (cmd == 'paint') {
        if ('x' in (params||{}))
            Network.sendCommand("editor", `map paint ${params.x} ${params.y} ${editorState.paint_type||'+rock'} ${editorState.brush.radius} ${editorState.brush.gradient} ${editorState.brush.step}`);
        else {
            editorState.paint_type = params?.type || editorState.paint_type;
            editorState.brush.radius = params?.radius || editorState.brush.radius;
            editorState.brush.gradient = 'gradient' in (params||{}) ? +params.gradient : editorState.brush.gradient;
        }

    } else if (cmd == 'bases') {
        if (params) {
            // const k = params.blue_base ? 'blue_base' : 'red_base';
            // const team = params.blue_base ? 1 : 2;
            // const [posX, posY] = params[k].split(',').map(x=>parseInt(x));
            // Games.networkFlag({flag:team, type:1, posX, posY});
            // const groundDoodad = config.groundDoodads.find(x=>x[0] == config.objects.bases[team][0] && x[1] == config.objects.bases[team][1]);
            // groundDoodad[0] = posX;
            // groundDoodad[1] = posY;
            // const [doodadId] = Mobs.getDoodadAtCoord(config.objects.bases[team][0], config.objects.bases[team][1], 'groundDoodad');
            // Mobs.removeDoodads(false, doodadId);
            // Mobs.addDoodad([...groundDoodad]);
            // Graphics.redrawBackground();
            // config.objects.bases[team] = [posX, posY]; 
        }

    } else if (cmd == 'load') {
        if (params) {
            load_map(catalog[params.mapId]);
        } else {
            document.querySelector('#maps').innerHTML = Object.keys(catalog).toSorted().reduce((html,mapId)=>{
                return html + `<option ${mapId==config.manifest.parentMapId&&'selected'}>${mapId}</option>`;
            }, '');
        }

    } else if (cmd == 'save') {
        if (params) {
            save_map(params.saveas && config.manifest.mapId || config.manifest.parentMapId);
        } else {
            console.log(catalog[config.manifest.parentMapId].w, !!catalog[config.manifest.parentMapId].w)
            if (catalog[config.manifest.parentMapId].w)
                document.querySelector('#save_btn').removeAttribute('disabled');
            else
                document.querySelector('#save_btn').setAttribute('disabled', true);
            if (config.manifest.mapId != config.manifest.parentMapId) {
                document.querySelector('#saveas_btn').removeAttribute('disabled');
            } else {
                document.querySelector('#saveas_btn').setAttribute('disabled', true);
            }
            document.querySelector('.save_msg').textContent = ``;
        }

    } else if (cmd == 'export') {
        if (params?.file == 'map.json')
            exportJson();
        else if (params?.file.includes('mask'))
            exportMask(params.file);
        else if (params?.file == 'gui.png')
            exportMinimap();

    } else if (cmd == 'clone_ship') {
        if (params) { 
            const name = ''+Date.now();
            const displayName = 'New ship';
            Network.sendCommand("editor", `clone_ship ${Players.getMe().type} ${name} ${displayName}`);
        }

    } else if (cmd == 'del_ship') {
        Network.sendCommand("editor", `del_ship ${Players.getMe().type}`);
        return;

    } else if (cmd == 'edit_ship') {
        function row_fire(fire_mode, fire_type, projectile) {
            const onchange = `onchange="Input.editorCmd('edit_ship', {update_fire:true})"`;
            const onremove = `onclick="Input.editorCmd('edit_ship', {remove_projectile:event.target})"`;
            return `
                <div class="fire_row ${fire_mode}_${fire_type}">
                    <input class="fire_type" type="text" size="1" placeholder="type" title="type" value="${projectile.type??''}" ${onchange}>
                    <input class="fire_x" type="text" size="2" placeholder="x" title="x" value="${projectile.x??''}" ${onchange}>
                    <input class="fire_y" type="text" size="2" placeholder="y" title="y" value="${projectile.y??''}" ${onchange}>
                    <input class="fire_rot" type="text" size="2" placeholder="rot" title="rot" value="${projectile.rot??''}" ${onchange}>
                    <input class="fire_alt" type="text" size="1" placeholder="alt" title="alt" value="${projectile.alt?'1':''}" ${onchange}>
                    <span style="cursor:pointer" ${onremove}>x</span>
                </div>`;
        }
        function row_collision(x, y, radius) {
            const onchange = `onchange="Input.editorCmd('edit_ship', {update_collisions:true})"`;
            const onremove = `onclick="Input.editorCmd('edit_ship', {remove_collision:event.target})"`;
            return `
                <div class="collision_row">
                    <input class="collision_x" type="text" size="3" placeholder="x" title="x" value="${x}" ${onchange}>
                    <input class="collision_y" type="text" size="3" placeholder="y" title="y" value="${y}" ${onchange}>
                    <input class="collision_r" type="text" size="3" placeholder="r" title="r" value="${radius}" ${onchange}>
                    <span style="cursor:pointer" ${onremove}>x</span>
                </div>`;
        }
        function row_thruster(params) {
            const onchange = `onchange="Input.editorCmd('edit_ship', {update_thrusters:true})"`;
            const onremove = `onclick="Input.editorCmd('edit_ship', {remove_thruster:event.target})"`;
            return `
                <div class="thruster_row">
                    ${thruster_keys.map(k=>`<input class="thruster_${k}" type="text" size="2" placeholder="${k}" title="${k}" value="${params[k]??''}" ${onchange}>`).join("\n")}
                    <span style="cursor:pointer" ${onremove}>x</span>
                </div>`;
        }
        function row_rotor(params) {
            const onchange = `onchange="Input.editorCmd('edit_ship', {update_rotors:true})"`;
            const onremove = `onclick="Input.editorCmd('edit_ship', {remove_rotor:event.target})"`;
            return `
                <div class="rotor_row">
                    ${rotor_keys.map(k=>`<input class="rotor_${k}" type="text" size="2" placeholder="${k}" title="${k}" value="${params[k]??''}" ${onchange}>`).join("\n")}
                    <span style="cursor:pointer" ${onremove}>x</span>
                </div>`;
        }

        const physics_keys = ['special', 'turnFactor', 'accelFactor', 'maxSpeed', 'minSpeed', 'brakeFactor', 'boostFactor', 'fireDelay', 'fireEnergy', 'specialEnergy', 'specialEnergyRegen', 'specialDelay', 'enclose_radius'];
        const thruster_keys = ["pos_angle", "pos_radius", "rot_factor", "scale_x", "scale_y", "glow_pos_angle1", "glow_pos_angle2", "glow_pos_radius", "glow_scale_x", "glow_scale_y", "glow_alpha_factor"];
        const rotor_keys = ["scale", "alpha", "shadow_scale"];

        if (params) {
            for (const k of physics_keys) {
                if (k in params) {
                    console.log('set', k, parseFloat(params[k]));
                    //config.ships[Players.getMe().type][k] = parseFloat(params[k]);
                    Network.sendCommand("editor", `edit_ship prop ${Players.getMe().type} float ${k} ${params[k]}`);
                }
            }

            // fire
            if (params.update_fire) {
                for (const fire_mode of ["fire", "infernoFire"]) {
                    for (const fire_type in config.ships[Players.getMe().type][fire_mode]) {
                        const old_projectiles = JSON.stringify(config.ships[Players.getMe().type][fire_mode][fire_type]);
                        let projectiles = [];
                        const rows = document.querySelectorAll(`.${fire_mode}_${fire_type}`);
                        rows.forEach(row=>{
                            const type = parseInt(row.querySelector('.fire_type').value);
                            const x = parseFloat(row.querySelector('.fire_x').value);
                            const y = parseFloat(row.querySelector('.fire_y').value);
                            const rot = parseFloat(row.querySelector('.fire_rot').value);
                            const alt = parseInt(row.querySelector('.fire_alt').value) ? true : false;
                            if (isNaN(type) || isNaN(x) || isNaN(y) || isNaN(rot)) return;
                            projectiles.push({type, x, y, rot, alt});
                        });
                        projectiles = JSON.stringify(projectiles);
                        //config.ships[Players.getMe().type][fire_mode][fire_type] = projectiles;   
                        if (projectiles != old_projectiles)
                            Network.sendCommand("editor", `edit_ship prop ${Players.getMe().type} json ${fire_mode}.${fire_type} ${projectiles}`);
                    }
                }
            }
            if (params.add_projectile) {
                const [fire_mode, fire_type] = params.add_projectile;
                document.getElementById(`ship_${fire_mode}_${fire_type}`).insertAdjacentHTML('beforeend', row_fire(fire_mode, fire_type, {}));
            }
            if (params.remove_projectile) {
                params.remove_projectile.closest('.fire_row').remove();
                Input.editorCmd('edit_ship', {update_fire:true});
            }

            // collisions
            if (params.update_collisions) {
                const old_collisions = JSON.stringify(config.ships[Players.getMe().type].collisions);
                let collisions = [];
                const rows = document.querySelectorAll(`.collision_row`);
                rows.forEach(row=>{
                    const x = parseFloat(row.querySelector('.collision_x').value);
                    const y = parseFloat(row.querySelector('.collision_y').value);
                    const r = parseFloat(row.querySelector('.collision_r').value);
                    if (isNaN(x) || isNaN(y) || isNaN(r)) return;
                    collisions.push([x, y, r]);
                });
                collisions = JSON.stringify(collisions);
                if (collisions != old_collisions)
                    Network.sendCommand("editor", `edit_ship prop ${Players.getMe().type} json collisions ${collisions}`);
                //config.ships[Players.getMe().type].collisions = collisions;
                // if (config.debug.collisions) {
                //     Tools.setDebugOptions({collisions:false}, false);
                //     Tools.setDebugOptions({collisions:true}, false);
                // }
            }
            if (params.add_collision) {
                document.getElementById(`ship_collisions`).insertAdjacentHTML('beforeend', row_collision('', '', ''));
            }
            if (params.remove_collision) {
                params.remove_collision.closest('.collision_row').remove();
                Input.editorCmd('edit_ship', {update_collisions:true});
            }

            // texture
            if (params.texture) {
                document.getElementById('texture_file').style.display = 'none';
                document.getElementById('texture_url').style.display = 'none';
                document.getElementById('texture_color').style.display = 'none';
                document.getElementById('texture_generate').style.display = 'none';
                document.getElementById(`texture_${params.texture}`).style.display = 'unset';

                function updateTexture(base64DataUri, base64DataUri_shadow, anchor) {
                    const type = Players.getMe().type;
                    const version = config.manifest.ships[type][1] + 1;
                    Promise.all([
                        upload_ship_assets_helper(type, 1, version, undefined, base64DataUri),
                        upload_ship_assets_helper(type, 2, version, undefined, base64DataUri_shadow),
                    ]).then(()=>Network.sendCommand("editor", `edit_ship texture ${type} ${version} ${anchor.join(' ')}`));
                }

                if (false) {
                } else if (params.files) {
                    const reader = new FileReader();
                    reader.onloadend = async function() {
                        const base64DataUri = reader.result;
                        const base64DataUri_shadow = await createShadow(base64DataUri);
                        updateTexture(base64DataUri, base64DataUri_shadow, [0.5, 0.5]);
                    };
                    reader.readAsDataURL(params.files[0]);
                } else if (params.url) {
                } else if (params.color) {
                    const color = params.color;
                    const {collisions, graphics:{baseScale}} = config.ships[Players.getMe().type];
                    const [base64DataUri, anchor, {w,h}] = drawCollisions(collisions, baseScale, color);
                    document.getElementById(`ship_anchor`).value = anchor.reduce((a,b)=>a+','+b);
                    createShadow(base64DataUri).then(base64DataUri_shadow=>updateTexture(base64DataUri, base64DataUri_shadow, anchor));
                } else if (params.prompt) {
                    const {prompt} = params;
                    document.querySelector('#texture_generate button').disabled = true;
                    document.querySelector('#texture_generate button').textContent = 'Generating...';
                    callGenerate({prompt, width:320, height:320, guidance:3.5, steps:28, seed:0}).then(async base64DataUri=>{
                        console.log('Generate result', base64DataUri);
                        const base64DataUri_shadow = await createShadow(base64DataUri);
                        updateTexture(base64DataUri, base64DataUri_shadow, [0.5, 0.5]);
                    }).catch((err)=>{
                        console.error(err);
                    }).finally(()=>{
                        document.querySelector('#texture_generate button').textContent = 'Generate';
                        document.querySelector('#texture_generate button').disabled = false;
                    });
                    
                } else {

                }
            }
            if (params.baseScale) {
                Network.sendCommand("editor", `edit_ship prop ${Players.getMe().type} float graphics.baseScale ${parseFloat(params.baseScale)}`);
            }
            if (params.anchor) {
                if (params.anchor.every(x=>!isNaN(parseFloat(x))))
                    Network.sendCommand("editor", `edit_ship prop ${Players.getMe().type} json graphics.anchor ${JSON.stringify(params.anchor)}`);

                // to see changes, reupload texture (TODO: automate this)
            }

            // thrusters
            if (params.update_thrusters) {
                const old_thrusters = JSON.stringify(config.ships[Players.getMe().type].graphics.thrusters);
                let thrusters = [];
                const rows = document.querySelectorAll(`.thruster_row`);
                rows.forEach(row=>{
                    const params = {};
                    for (const k of thruster_keys) {
                        params[k] = parseFloat(row.querySelector('.thruster_'+k).value);
                        if (isNaN(params[k])) return;
                    }
                    thrusters.push(params);
                });
                thrusters = JSON.stringify(thrusters);
                if (thrusters != old_thrusters)
                    Network.sendCommand("editor", `edit_ship prop ${Players.getMe().type} json graphics.thrusters ${thrusters}`);
            }
            if (params.add_thruster) {
                document.getElementById(`ship_thrusters`).insertAdjacentHTML('beforeend', row_thruster({}));
            }
            if (params.remove_thruster) {
                params.remove_thruster.closest('.thruster_row').remove();
                Input.editorCmd('edit_ship', {update_thrusters:true});
            }

            // rotors
            if (params.update_rotors) {
                const old_rotors = JSON.stringify(config.ships[Players.getMe().type].graphics.rotors);
                let rotors = [];
                const rows = document.querySelectorAll(`.rotor_row`);
                rows.forEach(row=>{
                    const params = {};
                    for (const k of rotor_keys) {
                        params[k] = parseFloat(row.querySelector('.rotor_'+k).value);
                        if (isNaN(params[k])) return;
                    }
                    rotors.push(params);
                });
                rotors = JSON.stringify(rotors);
                if (rotors != old_rotors)
                    Network.sendCommand("editor", `edit_ship prop ${Players.getMe().type} json graphics.rotors ${rotors}`);
            }
            if (params.add_rotor) {
                document.getElementById(`ship_rotors`).insertAdjacentHTML('beforeend', row_rotor({}));
            }
            if (params.remove_rotor) {
                params.remove_rotor.closest('.rotor_row').remove();
                Input.editorCmd('edit_ship', {update_rotors:true});
            }

            // explosions
            // TODO

        } else {
            for (const k of physics_keys) {
                (document.getElementById(`ship_${k}`)||{}).value = config.ships[Players.getMe().type][k];
            }
            // fire
            for (const fire_mode of ["fire", "infernoFire"]) {
                for (const fire_type in config.ships[Players.getMe().type][fire_mode]) {//default,special
                    let html = '';
                    for (const projectile of config.ships[Players.getMe().type][fire_mode][fire_type]) {
                        html += row_fire(fire_mode, fire_type, projectile);
                    }
                    document.getElementById(`ship_${fire_mode}_${fire_type}`).innerHTML = html;
                }
            }
            // collisions
            {
                let html = '';
                for (const collision of config.ships[Players.getMe().type].collisions) {
                    html += row_collision(...collision);
                }
                document.getElementById(`ship_collisions`).innerHTML = html;
            }
            // texture
            document.getElementById(`ship_baseScale`).value = config.ships[Players.getMe().type].graphics.baseScale;
            document.getElementById(`ship_anchor`).value = config.ships[Players.getMe().type].graphics.anchor.reduce((a,b)=>a+','+b);
            // thrusters
            {
                let html = '';
                for (const thruster of config.ships[Players.getMe().type].graphics.thrusters) {
                    html += row_thruster(thruster);
                }
                document.getElementById(`ship_thrusters`).innerHTML = html;
            }
            // rotors
            {
                let html = '';
                for (const rotor of config.ships[Players.getMe().type].graphics.rotors) {
                    html += row_rotor(rotor);
                }
                document.getElementById(`ship_rotors`).innerHTML = html;
            }
            // explosion
            // TODO

            document.activeElement.blur();
        }

    } else if (cmd == 'export_ship') {
        if (params) {
            if (params.file == 'ship.json')
                exportShipJson(Players.getMe().type);
            else if (params.file == 'ship_shadow.png')
                exportShipTexture(Players.getMe().type, true);
            else if (params.file == 'ship.png')
                exportShipTexture(Players.getMe().type);
        }

    } else if (cmd == 'control_ship') {
        document.activeElement.blur();

    } else if (!cmd) {
        cmd = null;

    } else {
        throw "unknown editor command";
    }
    editorState.editor_cmd = cmd;
    document.querySelectorAll('.cmd_detail').forEach(x=>x.style.display='none');
    (document.querySelector('.'+cmd)||{style:{}}).style.display = 'unset';
    if (cmd == 'control_ship' || cmd == 'edit_ship') {
        editorState.control_ship = true;
        Input.setup();
        game.freeCamera = false;
    } else {
        editorState.control_ship = false;
        Input.unsetup();
        game.freeCamera = true;
    }
};

Network.editorCmd = function(cmd, params) {
    console.log('Network.editorCmd', cmd, params);
    if (!cmd) return;
    if (false){

    } else if (cmd == 'map') {
        const {player_id, mapId, mapVersion, asset} = params;
        if (config.manifest.mapId == mapId && config.manifest.mapVersion[asset] + 1 == mapVersion[asset]) {
            config.manifest.mapVersion[asset] = mapVersion[asset];

            if (params.subcmd == 'delete_mountain')
                deleteMountain(params.id);
            else if (params.subcmd == 'place_mountain')
                addMountain(params.x, params.y, params.scale);
            else if (params.subcmd == 'delete_polygon')
                deletePolygon(params.polygon);
            else if (params.subcmd == 'add_polygon')
                addPolygon(params.points);
            else if (params.subcmd == 'paint')
                paintMask(params.x, params.y, params.paint_type, params.brush);

            if (player_id == Players.getMe().id) {
                upload_map_assets_helper(asset, mapVersion[asset]);

                if (params.subcmd == 'delete_polygon' || params.subcmd == 'add_polygon') {
                    config.manifest.mapVersion[7] = mapVersion[7];//todo remove hardcoded
                    upload_map_assets_helper(7, mapVersion[7]);
                }
            }
        } else {
            game.server.config.mapId = mapId;
            game.server.config.mapVersion = mapVersion;
            load_assets({...game.server.config});
        }
        
    } else if (cmd == 'clone_ship') {
        function clone_ship(old_type, new_type, name, displayName) {
            const ship_json = {...config.ships[old_type], name, displayName};
            config.ships[new_type] = ship_json;
            config.manifest.ships[new_type] = [0, 0, 0];
            Textures.add_ship_template(ship_json.name, config.ships[old_type].name, ship_json.graphics.anchor);
            UI.setupAircraft();
            return ship_json;
        }

        // server response
        const ship_json = clone_ship(params.type, params.new_type, params.name, params.displayName);

        // TODO handle upload_assets fail
        //  upload_assets can fail if a) the asset server fails or b) player does not complete the upload
        //  if player_id is the server owner, then it's probable that the whole server is also down, so there's nothing that can be done, except retry the upload
        //  the case where player_id is not the owner is not handled because adds more complexity
        //  right now the server makes sure that player_id is always the server owner
        if (params.player_id == Players.getMe().id) {
            upload_ship_assets_helper(params.new_type);
        }

    } else if (cmd == 'del_ship') {
        load_assets({parentMapId:config.manifest.parentMapId, mapId:config.manifest.mapId, ships: params.ships});

        if (params.player_id == Players.getMe().id) {
            upload_ship_assets_helper(params.type, undefined, -1, undefined, '');
        }
              
    } else if (cmd == 'edit_ship') {
        if (false) {
        } else if (params.subcmd == 'prop') {
            const {type, ships, player_id, k, v} = params;
            if (config.manifest.ships[type][0] + 1 == ships[type][0]) {
                config.manifest.ships[type][0] = ships[type][0];

                // k = 'prop1.prop2' -> config.ships[type][prop1][prop2] = v
                let target = config.ships[type];
                let path = k.split('.');
                path.slice(0,-1).forEach(x=>target=target[x]);
                target[path.at(-1)] = v;

                // collisions
                if (k == 'collisions') {
                    if (config.debug.collisions) {
                        Tools.setDebugOptions({collisions:false}, false);
                        Tools.setDebugOptions({collisions:true}, false);
                    }  
                } else if (k.startsWith('graphics')) {
                    Object.values(Players.all()).filter(x=>x.type==type).forEach(player=>{
                        // is this needed?
                        // if (k == 'graphics.thrusters' || k == 'graphics.rotors')
                        //     player.destroy();//remove old thrusters/rotors
                        player.reloadGraphics();
                    });
                }
                
                //update ui
                if (editorState.editor_cmd == cmd)
                    Input.editorCmd(cmd);

                if (player_id == Players.getMe().id) {
                    upload_ship_assets_helper(type, 0);
                }
            } else {
                load_assets({parentMapId:config.manifest.parentMapId, mapId:config.manifest.mapId, ships});
            }
        } else if (params.subcmd == 'texture') {
            const {type, ships, anchor, player_id} = params;
            if (config.manifest.ships[type][0] + 1 == ships[type][0]) {
                config.ships[type].graphics.anchor = anchor;
                config.ships[type].graphics.frame = null;
                config.ships[type].graphics.frame_shadow = null;
                config.manifest.ships[type][0] = ships[type][0];

                if (player_id == Players.getMe().id) {
                    upload_ship_assets_helper(type, 0);
                }
            } else {
                //if players has just joined and has not finished load_ships
            }

            load_assets({parentMapId:config.manifest.parentMapId, mapId:config.manifest.mapId, ships});
        }
    }
};

async function callGenerate({prompt, width, height, guidance, steps, seed}) {
    const buffer = await fetch(`...`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            prompt,
            seed: parseInt(seed) || Math.floor(Math.random() * 4294967295),
            width: parseInt(width),
            height: parseInt(height),
            guidance_scale: parseFloat(guidance),
            num_steps: parseInt(steps),
        }),
    }).then(res=>res.arrayBuffer());
    const base64String = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
    const dataURL = "data:image/png;base64," + base64String;
    //console.log(dataURL);
    return dataURL;
}

async function createShadow(img_src) {
    if (!window.cv) {
        console.log('loading opencv.js');
        const script = document.createElement('script');
        script.src = 'https://docs.opencv.org/master/opencv.js'; 
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
        await new Promise((resolve,reject)=>{
            script.onload = async () => {
                cv['onRuntimeInitialized'] = resolve;
            };
        });
    }

    // parameters
    const scale = 0.4; //40% of the input image
    const kernel_size = 31; //higher = more blurry
    const sigma = 15; //higher = more blurry

    // load img
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = img_src;
    await new Promise(r=>img.onload=r);

    const canvas = document.createElement('canvas');
    const src = cv.imread(img);

    // Split into B, G, R, A channels
    const channels = new cv.MatVector();
    cv.split(src, channels);
    const B = channels.get(0);
    const G = channels.get(1);
    const R = channels.get(2);
    const A = channels.get(3);  // Original alpha channel

    // Create mask where alpha > 0
    const mask = new cv.Mat();
    cv.threshold(A, mask, 0, 255, cv.THRESH_BINARY);

    // Set color channels to black using the mask
    B.setTo(new cv.Scalar(0), mask);
    G.setTo(new cv.Scalar(0), mask);
    R.setTo(new cv.Scalar(0), mask);

    // Create feathered alpha channel
    const featheredAlpha = new cv.Mat();
    // Adjust kernel size (must be odd numbers) for different feather amounts
    const kernelSize = new cv.Size(kernel_size, kernel_size);  // Larger values = more feathering
    cv.GaussianBlur(mask, featheredAlpha, kernelSize, sigma);

    // Replace original alpha with feathered version
    channels.set(3, featheredAlpha);
    A.delete();  // Cleanup original alpha

    // Merge channels back
    const dst = new cv.Mat();
    cv.merge(channels, dst);
    //cv.imshow(canvasOutput0, dst);

    // resize
    const resized = new cv.Mat()
    const newWidth = Math.round(dst.cols * scale);
    const newHeight = Math.round(dst.rows * scale);
    cv.resize(dst, resized, new cv.Size(newWidth, newHeight), 0, 0, cv.INTER_LINEAR);
    cv.imshow(canvas, resized);

    // Cleanup memory
    src.delete();
    mask.delete();
    channels.delete();  // Deletes B, G, R, featheredAlpha
    dst.delete();

    return canvas.toDataURL();
}

function addMountain(x, y, scale) {
    let doodad = [x, y, 1, scale/radiusToScaleRatio];
    Mobs.addDoodad(doodad);
    config.doodads.push([x, y, 1, scale/radiusToScaleRatio]);
    config.walls.push([x, y, scale]);
    doodad[8].visible = true;
    game.renderer.redrawBackground?.();// for pixi renderer
}

function deleteMountain(id) {
    Mobs.removeDoodads(true, id);
    config.doodads.splice(id, 1);
    config.walls.splice(id, 1);
    editorState.selected_mountain = null;//todo: only if is me..
    game.renderer.redrawBackground?.();
}

function drawCollisions(collisions, scale, color){
    let min_x = Infinity, max_x = -Infinity, min_y = Infinity, max_y = -Infinity;
    for (const collision of collisions) {
        min_x = Math.min(min_x, collision[0]-collision[2]);
        max_x = Math.max(max_x, collision[0]+collision[2]);
        min_y = Math.min(min_y, collision[1]-collision[2]);
        max_y = Math.max(max_y, collision[1]+collision[2]);
    } 
    const width = Math.ceil((max_x-min_x)/scale);
    const height = Math.ceil((max_y-min_y)/scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.translate(-min_x/scale, -min_y/scale);
    ctx.fillStyle = color;
    for (const collision of collisions) {
        ctx.beginPath();
        ctx.arc(collision[0]/scale, collision[1]/scale, collision[2]/scale, 0, 2 * Math.PI);
        ctx.fill();
    }
    // anchor=translation, needed because collisions max/min may not be symmetrical around (0,0), while texture's are (to save space)
    const anchor_x = ((-min_x-max_x)/2)/(max_x-min_x) + 0.5;
    const anchor_y = ((-min_y-max_y)/2)/(max_y-min_y) + 0.5;
    //console.log(canvas.toDataURL(), width, height, anchor_x, anchor_y);
    return [canvas.toDataURL(), [anchor_x, anchor_y], {w:width, h:height}];
}

function drawPolygonsOverlay([x, y]) {
    if (game.renderer.constructor.name == 'PIXIRenderer') {
        const {sprites:pixiTextureByName, layers:pixiContainerByName} = game.renderer.graphics;
        const polygons = config.polygons;
        const colors = [0xe6194b, 0x3cb44b, 0xffe119, 0xf58231, 0x911eb4, 0x46f0f0, 0xf032e6,  0xbcf60c, 0x008080];
        let cur_color = 0;

        if (pixiTextureByName.polygons_overlay) {  
            pixiContainerByName.map.removeChild(pixiTextureByName.polygons_overlay);
            pixiTextureByName.polygons_overlay.destroy();
        }

        pixiTextureByName.polygons_overlay = new PIXI.Graphics;
        pixiTextureByName.polygons_overlay.alpha = 0.5;
        let t, r, o, points, points_grouped, a, l, u, c = 0, h = 0, d = 0;
        for (l = 0; l < polygons.length; l++) {
            for (o = 0, u = 0; u < polygons[l].length; u++) {
                pixiTextureByName.polygons_overlay.beginFill(colors[cur_color]);
                cur_color = ++cur_color === colors.length ? 0 : cur_color;
                for (points = [], points_grouped = [], a = 0; a < polygons[l][u].length; a += 2) {
                    t = polygons[l][u][a] + h;
                    r = polygons[l][u][a + 1] + d;
                    points.push(parseFloat(t), -parseFloat(r));
                    points_grouped.push([parseFloat(t), -parseFloat(r)]);
                    h = t;
                    d = r;
                    c++;
                }
                if (!Tools.isPointInsidePolygon([x, y], points_grouped))
                    continue;
                editorState.selected_polygon = l;
                pixiTextureByName.polygons_overlay.drawPolygon(points);
                0 != o && pixiTextureByName.polygons_overlay.addHole();
                o++;
                pixiTextureByName.polygons_overlay.endFill();
            }
        }
        Graphics.initPolygonsScale();
        pixiContainerByName.map.addChild(pixiTextureByName.polygons_overlay);
        game.renderer.redrawBackground();
    } else {
        editorState.selected_polygon = game.renderer.highlight_polygon(x, y);
    }
};

function drawPolygon(status, [x, y]) {
    if (game.renderer.constructor.name == 'PIXIRenderer') {
        const {sprites:pixiTextureByName, layers:pixiContainerByName} = game.graphics;
        if (status == 'begin') {
            if (pixiTextureByName.polygons_overlay) {  
                pixiContainerByName.map.removeChild(pixiTextureByName.polygons_overlay);
                pixiTextureByName.polygons_overlay.destroy();
            }
            pixiTextureByName.polygons_overlay = new PIXI.Graphics;
            pixiTextureByName.polygons_overlay.alpha = 0.5;
            Graphics.initPolygonsScale();
            pixiContainerByName.sea.addChild(pixiTextureByName.polygons_overlay);
            pixiTextureByName.polygons_overlay.lineStyle(4, 0xffffff);
            pixiTextureByName.polygons_overlay.moveTo(x, y);
            editorState.drawing = true;
            editorState.points = [[x, y]];
        } else if (status == 'drawing') {
            if (!editorState.drawing) return;
            pixiTextureByName.polygons_overlay.moveTo(...editorState.points.at(-1));
            pixiTextureByName.polygons_overlay.lineTo(x, y);
            editorState.points.push([x, y]);
        } else if (status == 'end') {
            if (!editorState.drawing) return;

            pixiContainerByName.sea.removeChild(pixiTextureByName.polygons_overlay);
            pixiTextureByName.polygons_overlay.destroy();
            pixiTextureByName.polygons_overlay = null;

            // make sure path is closed
            editorState.points.push(editorState.points[0]);
            // reduce number of points
            editorState.points = simplify(editorState.points.map(([x,y])=>({x,y})), simplify_tolerance).map(({x,y})=>[x,y]);

            //addPolygon(editorState.points);
            Input.editorCmd('add_polygon', {points:editorState.points});

            editorState.drawing = false;
            editorState.points = null;
        }

        game.renderer.redrawBackground();
    } else {
        if (status == 'begin') {
            editorState.drawing = true;
            editorState.points = [[x, y]];
            game.renderer.set_editor_points(editorState.points);
        } else if (status == 'drawing') {
            if (!editorState.drawing) return;
            const last = editorState.points[editorState.points.length - 1];
            if (Math.hypot(x - last[0], y - last[1]) > 5) {
                editorState.points.push([x, y]);
                game.renderer.set_editor_points(editorState.points);
            }
        } else if (status == 'end') {
            if (!editorState.drawing) return;

            // Close the loop
            editorState.points.push(editorState.points[0]);
            // Simplify
            editorState.points = simplify(editorState.points.map(([x,y])=>({x,y})), simplify_tolerance).map(({x,y})=>[x,y]);

            Input.editorCmd('add_polygon', {points:editorState.points});

            editorState.drawing = false;
            editorState.points = null;
            game.renderer.set_editor_points(null);
        }
    }
};

function addPolygon(points) {
    if (!editorState.polygons)
        editorState.polygons = JSON.parse(JSON.stringify(config.polygons));

    let _points = new Array(points.length*2);
    _points[0] = points[0][0];
    _points[1] = -points[0][1];
    for (let i=1; i<points.length; i++) {
        _points[i*2] = points[i][0] - points[i-1][0];
        _points[i*2+1] = -points[i][1] + points[i-1][1];
    }

    config.polygons.splice(0, 0, [_points]);
    // adjust next polygon (all points coordinates are relative to first point of first polygon)
    config.polygons[1][0][0] -= points[0][0];
    config.polygons[1][0][1] -= -points[0][1];

    game.renderer.createMapFromJson(JSON.parse(JSON.stringify({doodads: config.doodads, groundDoodads:config.groundDoodads, walls: config.walls, polygons: config.polygons, objects: config.objects})));
    reloadMinimap();
};

function deletePolygon(selected_polygon) {
    if (selected_polygon === null) return;
    if (!editorState.polygons)
        editorState.polygons = JSON.parse(JSON.stringify(config.polygons));

    let sum_xy = [0, 0];
    config.polygons[selected_polygon].forEach((x,i)=>{
        // sum only first point (assumes first point is the same as last point (check..))
        sum_xy[0] += x[0];
        sum_xy[1] += x[1];
    });

    config.polygons.splice(selected_polygon, 1);

    // adjust next polygon (all points coordinates are relative to first point of first polygon)
    if (selected_polygon < config.polygons.length) {
        config.polygons[selected_polygon][0][0] += sum_xy[0];
        config.polygons[selected_polygon][0][1] += sum_xy[1];
    }

    editorState.selected_polygon = null;//todo: only if is me..

    game.renderer.createMapFromJson(JSON.parse(JSON.stringify({doodads: config.doodads, groundDoodads: config.groundDoodads, walls: config.walls, polygons: config.polygons, objects: config.objects})));
    reloadMinimap();

    if (game.renderer.constructor.name == 'PIXIRenderer') {
        const {sprites:pixiTextureByName, layers:pixiContainerByName} = game.graphics;
        pixiContainerByName.map.removeChild(pixiTextureByName.polygons_overlay);
        pixiTextureByName.polygons_overlay?.destroy();
        pixiTextureByName.polygons_overlay = null;
        game.renderer.redrawBackground();
    }
};

function reloadMinimap() {
    const dataUrl = exportMinimap(true);
    game.renderer.reload_minimap(dataUrl);
    // Textures.delete("gui");
    // Textures.delete("ui_minimap");
    // Textures.add("gui", dataUrl);
    // UI.setupMinimap();
    // UI.maskMinimap();
}

async function initMaskCanvas(type) {
    const url = game.renderer[`${type}_mask_uri`];//renderer.sea_mask_uri,..
    if (!url) {
        // retry
        await new Promise(r => setTimeout(r, 1000));
        return initMaskCanvas(type);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 4096;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const img = new Image();
    img.src = url;
    await new Promise(r => img.onload = r);
    ctx.drawImage(img, 0, 0, 4096, 2048);

    editorState[`${type}_canvas`] = canvas;
}

const PAINT_LAYERS = {
    'sea': 0,
    'sand': 1,
    'rock': 2
};
function paintMask(x, y, paint_type, brush) {
    const type = (paint_type || '+rock').replace('+', '').replace('-', '');
    const layerIndex = PAINT_LAYERS[type];

    const canvas = editorState[`${type}_canvas`];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Convert World coords to Texture coords
    const texX = Math.round((x + 16384) / 8);
    const texY = Math.round((y + 8192) / 8);

    const radius = brush.radius;
    const alpha_step = brush.step * (paint_type?.startsWith('-') ? -1 : 1);

    // Dirty Rectangle
    const startX = Math.max(0, texX - radius);
    const startY = Math.max(0, texY - radius);
    const endX = Math.min(4096, texX + radius);
    const endY = Math.min(2048, texY + radius);

    const w = endX - startX;
    const h = endY - startY;
    if (w <= 0 || h <= 0) return;

    const imageData = ctx.getImageData(startX, startY, w, h);
    const data = imageData.data;
    let changed = false;

    for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
            const currentX = startX + i;
            const currentY = startY + j;
            const dist = Math.sqrt((currentX - texX) ** 2 + (currentY - texY) ** 2);

            if (dist > radius) continue;

            const idx = (i + j * w) * 4;
            let _alpha = brush.gradient ? Math.round(Math.abs(alpha_step) * (1 - dist / radius)) : Math.abs(alpha_step);
            if (paint_type?.startsWith('-')) _alpha = -_alpha;

            const oldVal = data[idx];
            const val = Math.max(0, Math.min(255, oldVal + _alpha));

            if (val !== oldVal) {
                data[idx] = val;
                data[idx + 1] = val;
                data[idx + 2] = val;
                data[idx + 3] = 255; 
                changed = true;
            }
        }
    }

    if (changed) {
        // 1. Update the CPU Canvas (Source of Truth) normally (Top-to-Bottom)
        ctx.putImageData(imageData, startX, startY);

        // 2. Prepare Data for GPU (Bottom-to-Top)
        // Since we can't use flipY on partial updates, and the texture is stored inverted,
        // we must manually reverse the rows of the byte array we send to the GPU.
        const flippedData = new Uint8Array(w * h * 4);
        const rowBytes = w * 4;
        
        for (let row = 0; row < h; row++) {
            // Source row (Top down)
            const srcStart = row * rowBytes;
            const srcEnd = srcStart + rowBytes;
            
            // Dest row (Bottom up)
            const destStart = (h - 1 - row) * rowBytes;
            
            // Copy the row
            flippedData.set(data.subarray(srcStart, srcEnd), destStart);
        }

        // 3. Send raw flipped bytes to renderer
        game.renderer.update_map_mask(flippedData, layerIndex, startX, startY, w, h);
    }
}

function paintMask_pixi(x, y, paint_type, brush) {
    const texture_name = (paint_type || '+rock').replace('+','').replace('-', '');
    const container_name = texture_name == 'sea' ? 'sea' : 'map';

    if (!editorState[`${texture_name}_canvas`]) {
        const img = game.renderer.graphics.sprites[`${texture_name}_mask`].texture.baseTexture.source;
        const canvas = document.createElement('canvas');
        canvas.width = 4096;
        canvas.height = 2048;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        editorState[`${texture_name}_canvas`] = canvas;

        game.renderer.graphics.layers[container_name].removeChild(texture_name == 'sea' ? game.renderer.graphics.sprites[texture_name+'_mask'] : game.renderer.graphics.sprites[texture_name].mask);
        game.renderer.graphics.sprites[texture_name].mask = null;
        const texture = new PIXI.Texture.fromCanvas(canvas);
        const sprite = new PIXI.Sprite(texture);
        sprite.scale.set(8 * game.scale, 8 * game.scale);
        if (texture_name == 'sea') {
            sprite.blendMode = PIXI.BLEND_MODES.MULTIPLY;
            sprite.alpha = .5;
        }
        game.renderer.graphics.sprites[`${texture_name}_mask`] = sprite;
        if (texture_name != 'sea')
            game.renderer.graphics.sprites[texture_name].mask = game.renderer.graphics.sprites[`${texture_name}_mask`];
        game.renderer.graphics.layers[container_name].addChild(game.renderer.graphics.sprites[`${texture_name}_mask`]);
    }

    x += 16384;
    y += 8192;
    x = Math.round(x/8);
    y = Math.round(y/8);
    if (x < 0 || y < 0) return;

    const canvas = editorState[`${texture_name}_canvas`];
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0,0, 4096, 2048);
    const radius = brush.radius;
    const alpha_step = brush.step * (paint_type?.startsWith('-') ? -1 : 1);
    for (let j = Math.max(0, y-radius); j < Math.min(2048, y+radius); j++) {
        for (let i = Math.max(0, x-radius); i < Math.min(4096, x+radius); i++) {
            const _x = i - x, _y = j - y;
            const distance = Math.sqrt(_x*_x + _y*_y);
            if (distance > radius)
                continue;
            const idx = (i + j * imageData.width) * 4;
            const _alpha = brush.gradient ? Math.round(alpha_step * (1 - distance/radius)) : alpha_step;
            imageData.data[idx + 0] = Math.min(255, imageData.data[idx + 0] + _alpha);
            imageData.data[idx + 1] = Math.min(255, imageData.data[idx + 1] + _alpha);
            imageData.data[idx + 2] = Math.min(255, imageData.data[idx + 2] + _alpha);
            imageData.data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
    game.renderer.graphics.sprites[`${texture_name}_mask`].texture.update();

    game.renderer.redrawBackground();
};


function export_map_asset(asset) {
    if (MAP_ASSETS[asset] == 'map.json')
        return exportJson(true);
    else if (MAP_ASSETS[asset].includes('mask'))
        return exportMask(MAP_ASSETS[asset], true)
    else if (MAP_ASSETS[asset] == 'gui.png')
        return exportMinimap(true);
    return '';
}

function export_ship_asset(ship_id, asset) {
    if (SHIP_ASSETS[asset] == 'ship.json')
        return config.ships[ship_id];
    else if (SHIP_ASSETS[asset] == 'ship.png')
        return !config.ships[ship_id].graphics.frame ? exportShipTexture(ship_id, false, false) : '';
    else if (SHIP_ASSETS[asset] == 'ship_shadow.png')
        return !config.ships[ship_id].graphics.frame ? exportShipTexture(ship_id, true, false) : '';
    else
        throw 'assert';
}

function exportJson(nodownload=false) {
    const json = {
        bounds: game.server.config.mapBounds,
        "players_spawn_zones": {// TODO: make it editable
            "FFA": [
                { "MIN_X": -1024, "MAX_X": 3072, "MIN_Y": -4608, "MAX_Y": -512 },
                { "MIN_X": -11264, "MAX_X": -8192, "MIN_Y": -5632, "MAX_Y": -1536 },
                { "MIN_X": -8192, "MAX_X": -4096, "MIN_Y": 2560, "MAX_Y": 6656 },
                { "MIN_X": 4096, "MAX_X": 8192, "MIN_Y": -3072, "MAX_Y": 1024 }
            ],
            "CTF": [
                null,
                { "X": -8880, "Y": -2970 },
                { "X": 7820, "Y": -2930 }
            ],
            "BTR": [
                { "MIN_X": -120, "MIN_Y": -4500, "MAX_X": 2960, "MAX_Y": -960 },
                { "MIN_X": -13384, "MIN_Y": -6192, "MAX_X": 13384, "MAX_Y": 6192 }
            ]
        },
        objects: config.objects,
        doodads: config.doodads.toSorted((a, b)=>a[0]-b[0]),
        groundDoodads: config.groundDoodads,
        walls: config.walls.toSorted((a, b)=>a[0]-b[0]), 
        polygons: config.polygons,
    };

    if (!nodownload) {
        const link = document.createElement('a');
        link.download = 'map.json';
        link.href = "data:application/json;base64," + window.btoa(JSON.stringify(json));
        link.click();
    }
    return json;
}

function exportMask(file, nodownload=false) {
    const type = file.match(/_(.*)_/)[1];//rock,sand,sea
    let canvas = editorState[`${type}_canvas`];
    // if (!canvas) {
    //     paintMask(-Infinity, -Infinity,  '+' + type);
    //     canvas = editorState[`${type}_canvas`];
    // }
    if (!nodownload) {
        const link = document.createElement('a');
        link.download = file;
        link.href = canvas.toDataURL("image/jpeg");
        link.click();
    }
    return canvas.toDataURL("image/jpeg");
}

function exportMinimap(nodownload=false) {
    const polygons = config.polygons;
    const width = 512, height = 256;//minimap texture size
    const canvas = document.createElement('canvas');
    let ctx, offset_x, offset_y;

    if (game.renderer.constructor.name != 'PIXIRenderer') {
        // draw only minimap
        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext('2d');
        offset_x = 0, offset_y = 0;
    } else {
        // update gui.png
        offset_x = 4, offset_y = 4;
        const img = game.renderer.pixiImageByName['gui'].baseTexture.source;
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        // copy the bottom part of gui.png
        ctx.drawImage(img, 
            0, offset_y+height, 1024, 1024-offset_y-height, 
            0, offset_y+height, 1024, 1024-offset_y-height);
        }

    let h = 0, d = 0;
    for (let l=0; l<polygons.length; l++) {
        for (let u=0; u<polygons[l].length; u++) {
            if (u === 0) {
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#555555';
                ctx.beginPath();
            }
            for (let a = 0; a < polygons[l][u].length; a += 2) {
                const t = parseFloat(polygons[l][u][a]) + h;
                const r = parseFloat(polygons[l][u][a + 1]) + d;
                if (u === 0) {
                    const _t = (t+16384)/64 + offset_x;
                    const _r = (-r+8192)/64 + offset_y;
                    if (a == 0)
                        ctx.moveTo(_t, _r);
                    else
                        ctx.lineTo(_t, _r)
                }
                h = t;
                d = r;
            }
            if (u === 0) {
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }
    }

    if (!nodownload) {
        const link = document.createElement('a');
        link.download = 'gui.png';
        link.href = canvas.toDataURL();
        link.click();
    }
    return canvas.toDataURL();
}

function exportShipJson(ship_id) {
    const name = prompt("Enter name (eg. raptor)");
    const displayName = prompt("Enter displayName (eg. Predator)");
    const json = JSON.stringify({...config.ships[ship_id], name, displayName}, null, 4);
    const link = document.createElement('a');
    link.download = 'ship.json';
    link.href = "data:application/json;base64," + window.btoa(json);
    link.click();
}

function exportShipTexture(ship_id, is_shadow, download=true) {
    const {name:type_name, graphics:{frame}} = config.ships[ship_id];
    const img = Textures.get(`${type_name}${is_shadow?'_shadow':''}`).baseTexture.source;
    const canvas = document.createElement('canvas');
    canvas.width = frame?.[2] || img.naturalWidth;
    canvas.height = frame?.[3] || img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (frame)
        ctx.drawImage(img, ...frame, 0, 0, frame[2], frame[3]);
    else
        ctx.drawImage(img, 0, 0);

    if (download) {
        const link = document.createElement('a');
        link.download = `ship${is_shadow?'_shadow':''}.png`;
        link.href = canvas.toDataURL();
        link.click();
    }
    return canvas.toDataURL();
}


function uuidv7() {
    function _uuidv7() {
        // random bytes
        const value = new Uint8Array(16);
        crypto.getRandomValues(value);

        // current timestamp in ms
        const timestamp = BigInt(Date.now());

        // timestamp
        value[0] = Number((timestamp >> 40n) & 0xffn);
        value[1] = Number((timestamp >> 32n) & 0xffn);
        value[2] = Number((timestamp >> 24n) & 0xffn);
        value[3] = Number((timestamp >> 16n) & 0xffn);
        value[4] = Number((timestamp >> 8n) & 0xffn);
        value[5] = Number(timestamp & 0xffn);

        // version and variant
        value[6] = (value[6] & 0x0f) | 0x70;
        value[8] = (value[8] & 0x3f) | 0x80;

        return value;
    }

    const uuidVal = _uuidv7();
    const uuidStr = Array.from(uuidVal)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return uuidStr;
}

window.upload_vanilla = async ()=>{
    function imageToDataURL(url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = this.naturalWidth;
                canvas.height = this.naturalHeight;
                const context = canvas.getContext('2d');
                context.drawImage(this, 0, 0);
                const dataURL = canvas.toDataURL('image/png');
                resolve(dataURL);
            };
            image.src = url;
        });
    }
    set_token('a');
    await upload_map_assets_helper(undefined, 0, PUBLIC_NAMESPACE);
    for (const ship_id of [...new Array(6).keys()].slice(1)) {
        const assets = SHIP_ASSETS.map((_,i)=>export_ship_asset(ship_id, i));
        assets[1] = await imageToDataURL(`assets/aircraft/${config.ships[ship_id].name.replace('mohawk','comanche')}.png`);
        assets[2] = await imageToDataURL(`assets/shadows/${config.ships[ship_id].name.replace('mohawk','comanche')}_shadow.png`);
        upload_ship_assets(ship_id, assets, 0, PUBLIC_NAMESPACE);
    }
    set_token('');
};
window.test_copy = ()=>copy_assets('vanilla', '0', 'xxx');





/*
 (c) 2017, Vladimir Agafonkin
 Simplify.js, a high-performance JS polyline simplification library
 mourner.github.io/simplify-js
*/

// to suit your point format, run search/replace for '.x' and '.y';
// for 3D version, see 3d branch (configurability would draw significant performance overhead)

// square distance between 2 points
function getSqDist(p1, p2) {

    var dx = p1.x - p2.x,
        dy = p1.y - p2.y;

    return dx * dx + dy * dy;
}

// square distance from a point to a segment
function getSqSegDist(p, p1, p2) {

    var x = p1.x,
        y = p1.y,
        dx = p2.x - x,
        dy = p2.y - y;

    if (dx !== 0 || dy !== 0) {

        var t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);

        if (t > 1) {
            x = p2.x;
            y = p2.y;

        } else if (t > 0) {
            x += dx * t;
            y += dy * t;
        }
    }

    dx = p.x - x;
    dy = p.y - y;

    return dx * dx + dy * dy;
}
// rest of the code doesn't care about point format

// basic distance-based simplification
function simplifyRadialDist(points, sqTolerance) {

    var prevPoint = points[0],
        newPoints = [prevPoint],
        point;

    for (var i = 1, len = points.length; i < len; i++) {
        point = points[i];

        if (getSqDist(point, prevPoint) > sqTolerance) {
            newPoints.push(point);
            prevPoint = point;
        }
    }

    if (prevPoint !== point) newPoints.push(point);

    return newPoints;
}

function simplifyDPStep(points, first, last, sqTolerance, simplified) {
    var maxSqDist = sqTolerance,
        index;

    for (var i = first + 1; i < last; i++) {
        var sqDist = getSqSegDist(points[i], points[first], points[last]);

        if (sqDist > maxSqDist) {
            index = i;
            maxSqDist = sqDist;
        }
    }

    if (maxSqDist > sqTolerance) {
        if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
        simplified.push(points[index]);
        if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
    }
}

// simplification using Ramer-Douglas-Peucker algorithm
function simplifyDouglasPeucker(points, sqTolerance) {
    var last = points.length - 1;

    var simplified = [points[0]];
    simplifyDPStep(points, 0, last, sqTolerance, simplified);
    simplified.push(points[last]);

    return simplified;
}

// both algorithms combined for awesome performance
function simplify(points, tolerance, highestQuality) {

    if (points.length <= 2) return points;

    const len = points.length;

    var sqTolerance = tolerance !== undefined ? tolerance * tolerance : 1;

    points = highestQuality ? points : simplifyRadialDist(points, sqTolerance);
    points = simplifyDouglasPeucker(points, sqTolerance);

    console.log('simplify:', len, '->', points.length);

    return points;
}
