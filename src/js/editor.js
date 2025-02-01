
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
}
const simplify_tolerance = 5;   //higher values -> less points
const radiusToScaleRatio = 120; //config.doodads uses scale, config.walls uses radius

Input.setupEditorMode = function() {
    if (game.editorMode) {
        Input.unsetup();
        window.addEventListener('keydown', (e) => {
            if (['INPUT', 'SELECT'].includes(e.target.tagName)) return;
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                let {x, y} = Graphics.getCamera();
                if (e.key == "ArrowUp") y -= 500;
                if (e.key == "ArrowDown") y += 500;
                if (e.key == "ArrowLeft") x -= 500;
                if (e.key == "ArrowRight") x += 500;
                Graphics.setCamera(x, y);
                e.stopPropagation();
            }
        }, true);
        window.addEventListener('mousedown', (e) => {
            if (e.target.tagName != 'CANVAS') return;

            let {position:{x, y}} = Graphics.getCameraState();
            x = x + e.clientX / game.scale;
            y = y + e.clientY / game.scale;

            if (editorState.editor_cmd == 'select_mountain') {
                if (editorState.selected_mountain) {
                    editorState.selected_mountain[1][8].tint = 0xffffff;
                }
                let [id, doodad] = Mobs.getDoodadAtCoord(x, y);
                if (doodad) {
                    editorState.selected_mountain = [id, doodad];
                    doodad[8].tint = 0xff0000;
                } else {
                    editorState.selected_mountain = null;
                }
                Graphics.redrawBackground();
            } else if (editorState.editor_cmd == 'place_mountain') {
                addMountain(x, y);
            } else if (editorState.editor_cmd == 'select_polygon') {
                drawPolygonsOverlay([x, y]);
            } else if (editorState.editor_cmd == 'draw_polygon') {
                drawPolygon('begin', [x, y]);
            } else if (editorState.editor_cmd == 'paint') {
                paintMask(x, y);
                editorState.paint_x = x, editorState.paint_y = y;
                editorState.paint_timer = setInterval(()=>{
                    paintMask(editorState.paint_x, editorState.paint_y);
                }, editorState.brush.delay);
            }
        });
        window.addEventListener('mousemove', (e) => {
            if (e.target.tagName != 'CANVAS') return;
            
            let {position:{x, y}} = Graphics.getCameraState();
            x = x + e.clientX / game.scale;
            y = y + e.clientY / game.scale;

            if (editorState.editor_cmd == 'draw_polygon') {
                drawPolygon('drawing', [x, y]);
            } else if (editorState.editor_cmd == 'paint') {
                editorState.paint_x = x, editorState.paint_y = y;
            }
        });
        window.addEventListener('mouseup', (e) => {
            if (e.target.tagName != 'CANVAS') return;
            if (editorState.editor_cmd == 'draw_polygon') {
                let {position:{x, y}} = Graphics.getCameraState();
                x = x + e.clientX / game.scale;
                y = y + e.clientY / game.scale;
                drawPolygon('end', [x, y]);
            } else if (editorState.editor_cmd == 'paint') {
                clearInterval(editorState.paint_timer);
            }
        });
        window.addEventListener('mousewheel', (e) => {
            e.stopPropagation();
            let {x, y} = Graphics.getCamera();
            y += e.deltaY * 10;
            x += e.deltaX * 10;
            Graphics.setCamera(x, y);
        });
        document.documentElement.style.overscrollBehaviorX = 'none';
    } else {
        Input.setup();
        Tools.applySettingsToGame();
    }
};

Input.editorCmd = function(cmd, params) {
    if (false){
    } else if (cmd == 'delete_polygon') {
        deletePolygon();
    } else if (cmd == 'delete_mountain') {
        deleteMountain();
    } else {
        editorState.editor_cmd = cmd;
        if (params) {
            editorState.mountain_scale = parseFloat(params.mountain_scale || editorState.mountain_scale);
            editorState.paint_type = params.type || editorState.paint_type;
            editorState.brush.radius = params.radius || editorState.brush.radius;
            editorState.brush.gradient = 'gradient' in params ? params.gradient : editorState.brush.gradient;
            if (cmd == 'set_bounds') {
                for (let k in params)
                    game.server.config.mapBounds[k.toUpperCase()] = Math.max(k.endsWith('y')?-8192:-16384, Math.min(k.endsWith('y')?8192:16384, parseInt(params[k])));
                game.server.config.playerBounds = {
                    MIN_X: game.server.config.mapBounds.MIN_X+32, 
                    MIN_Y: game.server.config.mapBounds.MIN_Y+32, 
                    MAX_X: game.server.config.mapBounds.MAX_X-32, 
                    MAX_Y: game.server.config.mapBounds.MAX_Y-32
                };
                Graphics.replaceMap();
            } else if (cmd == 'bases') {
                const k = params.blue_base ? 'blue_base' : 'red_base';
                const team = params.blue_base ? 1 : 2;
                const [posX, posY] = params[k].split(',').map(x=>parseInt(x));
                Games.networkFlag({flag:team, type:1, posX, posY});
                const groundDoodad = config.groundDoodads.find(x=>x[0] == config.objects.bases[team][0] && x[1] == config.objects.bases[team][1]);
                groundDoodad[0] = posX;
                groundDoodad[1] = posY;
                const [doodadId] = Mobs.getDoodadAtCoord(config.objects.bases[team][0], config.objects.bases[team][1]);
                Mobs.removeDoodads(null, doodadId);
                Mobs.addDoodad([...groundDoodad]);
                Graphics.redrawBackground();
                config.objects.bases[team] = [posX, posY];   
            } else if (cmd == 'load') {
                loadMap(params.mapId);
            } else if (cmd == 'export') {
                if (params.file == 'map.json')
                    exportJson();
                else if (params.file.includes('mask'))
                    exportMask(params.file);
                else if (params.file == 'gui.png')
                    exportMinimap();
            }
        }
        document.querySelectorAll('.cmd_detail').forEach(x=>x.style.display='none');
        (document.querySelector('.'+cmd)||{style:{}}).style.display = 'unset';
    }
};

function addMountain(x, y) {
    let doodad = [x, y, 1, editorState.mountain_scale];
    Mobs.addDoodad(doodad);
    config.doodads.push([x, y, 1, editorState.mountain_scale]);
    config.walls.push([x, y, editorState.mountain_scale*radiusToScaleRatio]);
    doodad[8].visible = true;
    Graphics.redrawBackground();
}

function deleteMountain() {
    Mobs.removeDoodads(null, editorState.selected_mountain[0]);
    config.doodads.splice(editorState.selected_mountain[0], 1);
    config.walls.splice(editorState.selected_mountain[0], 1);
    Graphics.redrawBackground();
}

function drawPolygonsOverlay([x, y]) {
    const {sprites:pixiTextureByName, layers:pixiContainerByName} = game.graphics;
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
    Graphics.redrawBackground();
};

function drawPolygon(status, [x, y]) {
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

        addPolygon();

        editorState.drawing = false;
        editorState.points = null;
    }

    Graphics.redrawBackground();
};

function addPolygon() {
    if (!editorState.polygons)
        editorState.polygons = JSON.parse(JSON.stringify(config.polygons));

    let points = new Array(editorState.points.length*2);
    points[0] = editorState.points[0][0];
    points[1] = -editorState.points[0][1];
    for (let i=1; i<editorState.points.length; i++) {
        points[i*2] = editorState.points[i][0] - editorState.points[i-1][0];
        points[i*2+1] = -editorState.points[i][1] + editorState.points[i-1][1];
    }

    config.polygons.splice(0, 0, [points]);
    // adjust next polygon (all points coordinates are relative to first point of first polygon)
    config.polygons[1][0][0] -= editorState.points[0][0];
    config.polygons[1][0][1] -= -editorState.points[0][1];

    Graphics.createMapFromJson(JSON.stringify({doodads: config.doodads, groundDoodads:config.groundDoodads, walls: config.walls, polygons: config.polygons}));
    reloadMinimap();
};

function deletePolygon() {
    if (editorState.selected_polygon === null) return;
    if (!editorState.polygons)
        editorState.polygons = JSON.parse(JSON.stringify(config.polygons));

    const {sprites:pixiTextureByName, layers:pixiContainerByName} = game.graphics;

    let sum_xy = [0, 0];
    config.polygons[editorState.selected_polygon].forEach((x,i)=>{
        // sum only first point (assumes first point is the same as last point (check..))
        sum_xy[0] += x[0];
        sum_xy[1] += x[1];
    });

    config.polygons.splice(editorState.selected_polygon, 1);

    // adjust next polygon (all points coordinates are relative to first point of first polygon)
    if (editorState.selected_polygon < config.polygons.length) {
        config.polygons[editorState.selected_polygon][0][0] += sum_xy[0];
        config.polygons[editorState.selected_polygon][0][1] += sum_xy[1];
    }

    editorState.selected_polygon = null;

    Graphics.createMapFromJson(JSON.stringify({doodads: config.doodads, groundDoodads: config.groundDoodads, walls: config.walls, polygons: config.polygons}));
    reloadMinimap();
    pixiContainerByName.map.removeChild(pixiTextureByName.polygons_overlay);
    pixiTextureByName.polygons_overlay.destroy();
    pixiTextureByName.polygons_overlay = null;
    
    Graphics.redrawBackground();
};

function reloadMinimap() {
    const dataUrl = exportMinimap(true);
    Textures.delete("gui");
    Textures.delete("ui_minimap");
    Textures.add("gui", dataUrl);
    UI.setupMinimap();
    UI.maskMinimap();
}

function paintMask(x, y) {
    x += 16384;
    y += 8192;
    x = Math.round(x/8);
    y = Math.round(y/8);

    const texture_name = (editorState.paint_type || '+rock').replace('+','').replace('-', '');
    const container_name = texture_name == 'sea' ? 'sea' : 'map';

    if (!editorState[`${texture_name}_canvas`]) {
        const img = game.graphics.sprites[`${texture_name}_mask`].texture.baseTexture.source;
        const canvas = document.createElement('canvas');
        canvas.width = 4096;
        canvas.height = 2048;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        editorState[`${texture_name}_canvas`] = canvas;

        game.graphics.layers[container_name].removeChild(texture_name == 'sea' ? game.graphics.sprites[texture_name+'_mask'] : game.graphics.sprites[texture_name].mask);
        game.graphics.sprites[texture_name].mask = null;
        const texture = new PIXI.Texture.fromCanvas(canvas);
        const sprite = new PIXI.Sprite(texture);
        sprite.scale.set(8 * game.scale, 8 * game.scale);
        if (texture_name == 'sea') {
            sprite.blendMode = PIXI.BLEND_MODES.MULTIPLY;
            sprite.alpha = .5;
        }
        game.graphics.sprites[`${texture_name}_mask`] = sprite;
        if (texture_name != 'sea')
            game.graphics.sprites[texture_name].mask = game.graphics.sprites[`${texture_name}_mask`];
        game.graphics.layers[container_name].addChild(game.graphics.sprites[`${texture_name}_mask`]);
    }

    if (x < 0 || y < 0) return;

    const canvas = editorState[`${texture_name}_canvas`];
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0,0, 4096, 2048);
    const radius = editorState.brush.radius;
    const alpha_step = editorState.brush.step * (editorState.paint_type?.startsWith('-') ? -1 : 1);
    for (let j = Math.max(0, y-radius); j < Math.min(2048, y+radius); j++) {
        for (let i = Math.max(0, x-radius); i < Math.min(4096, x+radius); i++) {
            const _x = i - x, _y = j - y;
            const distance = Math.sqrt(_x*_x + _y*_y);
            if (distance > radius)
                continue;
            const idx = (i + j * imageData.width) * 4;
            const _alpha = editorState.brush.gradient ? Math.round(alpha_step * (1 - distance/radius)) : alpha_step;
            imageData.data[idx + 0] = Math.min(255, imageData.data[idx + 0] + _alpha);
            imageData.data[idx + 1] = Math.min(255, imageData.data[idx + 1] + _alpha);
            imageData.data[idx + 2] = Math.min(255, imageData.data[idx + 2] + _alpha);
            imageData.data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
    game.graphics.sprites[`${texture_name}_mask`].texture.update();

    Graphics.redrawBackground();
};

async function loadMap(mapId) {
    game.server.config.mapId = mapId;
    const {bounds, objects} = await Graphics.fetchMapJson();
    game.server.config.playerBounds = bounds || {MIN_X: -16352, MIN_Y: -8160, MAX_X: 16352, MAX_Y: 8160};
    game.server.config.mapBounds = bounds || {MIN_X: -16384, MIN_Y: -8192, MAX_X: 16384, MAX_Y: 8192};
    document.getElementById('min_x').value = bounds.MIN_X;
    document.getElementById('min_y').value = bounds.MIN_Y;
    document.getElementById('max_x').value = bounds.MAX_X;
    document.getElementById('max_y').value = bounds.MAX_Y;
    Games.networkFlag({flag:1, type:1, posX:objects.bases[1][0], posY:objects.bases[1][1]});
    Games.networkFlag({flag:2, type:1, posX:objects.bases[2][0], posY:objects.bases[2][1]});
    Graphics.replaceMap();
}

function exportJson() {
    const json = JSON.stringify({
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
    }, null, 4);

    const link = document.createElement('a');
    link.download = 'map.json';
    link.href = "data:application/json;base64," + window.btoa(json);
    link.click();
}

function exportMask(file) {
    const type = file.match(/_(.*)_/)[1];//rock,sand,sea
    let canvas = editorState[`${type}_canvas`];
    if (!canvas) {
        editorState.paint_type = '+' + type;
        paintMask(-Infinity, -Infinity);
        canvas = editorState[`${type}_canvas`];
    }
    const link = document.createElement('a');
    link.download = file;
    link.href = canvas.toDataURL("image/jpeg");
    link.click();
}

function exportMinimap(nodownload=false) {
    const polygons = config.polygons;
    const width = 512, height = 256;//minimap texture size

    // draw only minimap
    // const canvas = document.createElement('canvas');
    // canvas.width = 512;
    // canvas.height = 256;
    // const ctx = canvas.getContext('2d');
    // const offset_x = 0, offset_y = 0;

    // update gui.png
    const offset_x = 4, offset_y = 4;
    const img = Textures.get('gui').baseTexture.source;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    // copy the bottom part of gui.png
    ctx.drawImage(img, 
        0, offset_y+height, 1024, 1024-offset_y-height, 
        0, offset_y+height, 1024, 1024-offset_y-height);

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
    
