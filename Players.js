import Player from './Player.js';
import Vector from './Vector.js';

var playersById = {},
    t = [-1, -1, -1],
    n = ["badge_gold", "badge_silver", "badge_bronze"];

Players.update = function() {
    var n;
    const all_players = [], visible_players = [], visible_objects_count = {thrusters:0, rotors:0, playernames_glyphs: 0, badges: 0, levels: 0, levels_glyphs: 0};
    let me_idx = null;
    for (const id in playersById) {
        const player = playersById[id];
        all_players.push(player);
        if (player.status == 0) {
            player.update(game.timeFactor);
            player.updateGraphics(game.timeFactor);
            if (player.render) {
                if (config.ships[player.type]) {
                    visible_players.push(player);
                    const {graphics:{thrusters, rotors}} = config.ships[player.type];
                    if (thrusters?.length && Math.abs(player.state.thrustLevel) > 0.01)
                        visible_objects_count.thrusters += thrusters.length;
                    visible_objects_count.rotors += rotors?.length || 0;
                    visible_objects_count.playernames_glyphs += Math.min(20, player.name_length);//MAX_PLAYER_NAME_GLYPHS
                    visible_objects_count.badges += player.state.hasBadge ? 1 : 0;
                    if (player.level != null || player.bot) {
                        visible_objects_count.levels_glyphs += player.bot ? 3 : (''+player.level).length;
                        visible_objects_count.levels++;
                    }
                    if (player.me()) me_idx = visible_players.length - 1;
                }
            }
        }
    }
    if (me_idx !== null) // put me at the end
        [visible_players[me_idx], visible_players[visible_players.length-1]] = [visible_players[visible_players.length-1], visible_players[me_idx]];
    if (null != game.spectatingID) {
        if (null == (n = playersById[game.spectatingID]))
            return {visible_players, visible_objects_count};
        if (game.timeNetwork - n.lastPacket > 3e3)
            return {visible_players, visible_objects_count};
        game.renderer.setCamera(n.pos.x, n.pos.y)
    } else if (null != game.myID) {
        if (null == (n = playersById[game.myID]))
            return {visible_players, visible_objects_count};
        if (0 == n.status)
            game.renderer.updateHUD(n.health, n.energy, n);
        if (!game.freeCamera)
            game.renderer.setCamera(n.pos.x, n.pos.y);
    }
    return {all_players, visible_players, visible_objects_count};
};

Players.add = function(player, fromLogin) {
    playersById[player.id] = new Player(player, fromLogin);

    if (game.state === Network.STATE.PLAYING) {
        UI.updateGameInfo();
    }
};

Players.get = function(t) {
    return playersById[t]
};

Players.getMe = function() {
    return playersById[game.myID]
};

Players.amIAlive = function() {
    var e = Players.getMe();
    return null != e && 0 == e.status
};

Players.getIDs = function() {
    var t = {};
    for (var n in playersById)
        t[n] = true;
    return t
};

Players.getByName = function(name) {
    var id;
    for (id in playersById)
        if (playersById[id].name === name)
            return playersById[id];
    return null
};

Players.network = function(type, msg) {
    let player = playersById[msg.id];
    if (null != player)
        switch (type) {
            case Network.SERVERPACKET.PLAYER_UPDATE:
            case Network.SERVERPACKET.PLAYER_FIRE:
            case Network.SERVERPACKET.EVENT_BOOST:
            case Network.SERVERPACKET.EVENT_BOUNCE:
                player.networkKey(type, msg);
                break;
            case Network.SERVERPACKET.CHAT_SAY:
                player.sayBubble(msg);
                break;
            case Network.SERVERPACKET.PLAYER_RESPAWN:
                player.respawn(msg);
                UI.updateGameInfo();
                break;
            case Network.SERVERPACKET.PLAYER_FLAG:
                if (msg.id == game.myID) {
                    game.myFlag = game.lastFlagSet;
                    Tools.setSettings({
                        flag: game.lastFlagSet
                    });
                }
                player.changeFlag(msg);
                break;
        }
};

Players.stealth = function(t) {
    var n = playersById[t.id];
    null != n && n.stealth(t)
};

Players.leaveHorizon = function(t) {
    var n = playersById[t.id];
    null != n && n.leaveHorizon()
};

Players.updateBadges = function(r) {
    for (var i, o = Tools.clamp(r.length, 0, 3), s = [], a = 0; a < o; a++) {
        i = playersById[r[a].id];
        if (i && i.sprites.badge) {
            s.push(i.id);
            i.state.badge != a && (i.state.badge = a,
            i.changeBadge(n[a])),
            i.state.hasBadge || (i.state.hasBadge = true,
            i.render && (i.sprites.badge.visible = true))
        };
    }
    for (var l = 0; l < t.length; l++)
        if (-1 == s.indexOf(t[l])) {
            if (null == (i = playersById[t[l]]))
                continue;
            if (!i.sprites.badge)
                continue;
            i.state.hasBadge && (i.state.hasBadge = false,
            i.sprites.badge.visible = false)
        }
    t = s
};

Players.chat = function(t) {
    var n = playersById[t.id];
    null != n && UI.addChatLine(n, t.text, 0)
};

Players.teamChat = function(t) {
    var n = playersById[t.id];
    null != n && UI.addChatLine(n, t.text, 3)
};

Players.votemutePass = function(t) {
    var n = playersById[t.id];
    null != n && UI.chatVotemutePass(n)
};

Players.whisper = function(t) {
    var n;
    if (t.to == game.myID) {
        if (null == (r = playersById[t.from]))
            return;
        n = 2
    } else {
        var r;
        if (null == (r = playersById[t.to]))
            return;
        n = 1
    }
    UI.addChatLine(r, t.text, n)
};

Players.impact = function(t) {
    for (var n = 0; n < t.players.length; n++) {
        var r = playersById[t.players[n].id];
        null != r && r.impact(t.type, new Vector(t.posX,t.posY), t.players[n].health, t.players[n].healthRegen)
    }
};

Players.powerup = function(e) {
    Players.getMe().powerup(e)
};

Players.updateLevel = function(packet) {
    var player = playersById[packet.id];
    if (player != null) {
        player.updateLevel(packet);
    }
};

Players.reteam = function(msg) {
    for (let {id, team} of msg.players) {
        let player = playersById[id];
        if (player != null) {
            player.reteam(team);
        }
    }
    Players.updateFFATeams();

    UI.updateGameInfo();
};

Players.kill = function(msg) {
    let player = playersById[msg.id];
    if (!player) {
        return;
    }

    if (msg.killer != 0 || msg.posX != 0 || msg.posY != 0) {
        player.kill(msg);
        if (player.me()) {
            game.renderer.visibilityHUD(false);
            let killer = playersById[msg.killer];
            if (killer) {
                UI.killedBy(killer);
            }
            UI.showSpectator('<div onclick="Network.spectateNext()" class="spectate">ENTER SPECTATOR MODE</div>');
        } 
        else if (msg.killer === game.myID) {
            UI.killed(player);
        }
        if (!player.me() && player.id === game.spectatingID && game.gameType !== GameType.BTR) {
            Games.spectatorSwitch(player.id);
        }
    } 
    else {
        player.kill({
            posX: 0,
            posY: 0,
            spectate: true
        });
        game.renderer.visibilityHUD(false);
        UI.updateGameInfo();
    }
};

Players.destroy = function(id) {
    if (id == game.spectatingID) {
        $("#spectator-tag").html("Spectating");
        Games.spectatorSwitch(id);
    }

    let player = playersById[id];
    if (player != null) {
        player.destroy();
        delete playersById[id];

        if (game.state === Network.STATE.PLAYING) {
            UI.updateGameInfo();
        }
    }
    window.playersDestroy?.(id);
};

Players.changeType = function(t) {
    var n = playersById[t.id];
    null != n && n.changeType(t)
};

Players.count = function() {
    var t, n = 0, r = 0;
    for (t in playersById)
        n++,
        playersById[t].culled && r++;
    return [n - r, n]
};

Players.categoryCounts = function() {
    let counts = {
        players: 0,
        bots: 0,
        blueTeam: 0,
        redTeam: 0,
        spectators: 0
    }

    for (let id in playersById) {
        let player = playersById[id];

        if (player.bot) {
            // Special case the ab-server bot name to exclude, as it doesn't play
            if (player.name !== 'Server') {
                counts.bots++
            }
        }
        else {
            counts.players++;

            // If player is spectating, exclude them from CTF team counts
            if (player.isSpectating()) {
                counts.spectators++;
            }
            else {
                if (player.team === 1) {
                    counts.blueTeam++;
                }
                else if (player.team === 2) {
                    counts.redTeam++;
                }
            }
        }
    }

    return counts;
}

Players.wipe = function() {
    for (let id in playersById) {
        playersById[id].destroy();
        delete playersById[id];
    }
};

Players.all = function() { // SPATIE
    return playersById;
};

Players.playersByTeam = function() {
    let teams = {};
    for (let [id, player] of Object.entries(Players.all())) {
        teams[player.team] = (teams[player.team] || []).concat(player);
    }
    return teams;
};

Players.updateFFATeams = function() {
    if (GameType.CTF == game.gameType || game.server.config?.tdmMode)
        return;
    let teams = Players.playersByTeam();
    for (let team in teams) {
        let players = teams[team];
        for (let player of players) {
            let {in_team:prev_in_team, in_my_team:prev_in_my_team} = player;
            player.in_team = players.length > 1 && Games.assign_team_color(player.team) || Games.unassign_team_color(player.team);
            player.in_my_team = player.in_team && player.team == game.myTeam;

            if (game.force_update_teams || (player.in_team != prev_in_team || player.in_my_team != prev_in_my_team)) {
                player.sprites.name.style = new PIXI.TextStyle(player.nameplateTextStyle());
                game.renderer.changeMinimapTeam(player.id, player.in_my_team ? 1 : player.team);
            }
        }                
    }
    game.force_update_teams = false;
};