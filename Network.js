import Vector from './Vector.js';
import { load_assets } from './assets.js';

var primarySock = null,
    backupSock = null,
    backupSockIsConnected = false,
    currentSockUrl = "",
    shouldSendNextAckOnBackupSock = false,
    ackIntervalId = null,
    baseDivClk = -1,
    baseDivClkLastResetTime = -1,
    jitterMemory = 0,
    messageTombstoneMap = {},
    lastTombstoneGcTime = 0,
    sendKeyCount = 0,
    oldTimeNetwork = 0,
    lastReceivedError = false,
    f = 2e3,
    g = 2e3;

let _WebSocket = window.WebSocket;

Network.sendKey = function(keyCode, isPressed) {
    if (game.state == Network.STATE.PLAYING) {
        sendKeyCount++;
        var msg = {
            c: ClientPacket.KEY,
            seq: sendKeyCount,
            key: KeyCodes[keyCode],
            state: isPressed
        };
        null != game.spectatingID && isPressed && ("RIGHT" == keyCode ? Network.spectatePrev() : "LEFT" == keyCode && Network.spectateNext()),
        sendMessageDict(msg),
        backupSock && backupSockIsConnected && sendMessageDict(msg, true)
    }
};

Network.sendChat = function(text) {
    game.state == Network.STATE.PLAYING && sendMessageDict({
        c: ClientPacket.CHAT,
        text: text
    })
};

Network.sendWhisper = function(playerId, text) {
    game.state == Network.STATE.PLAYING && sendMessageDict({
        c: ClientPacket.WHISPER,
        id: playerId,
        text: text
    })
};

Network.sendSay = function(text) {
    game.state == Network.STATE.PLAYING && sendMessageDict({
        c: ClientPacket.SAY,
        text: text
    })
};

Network.sendTeam = function(text) {
    game.state == Network.STATE.PLAYING && sendMessageDict({
        c: ClientPacket.TEAMCHAT,
        text: text
    })
};

Network.sendCommand = function(com, data) {
    game.state == Network.STATE.PLAYING && ("flag" === com && (game.lastFlagSet = data),
    sendMessageDict({
        c: ClientPacket.COMMAND,
        com: com,
        data: data
    }))
};

Network.voteMute = function(playerId) {
    game.state == Network.STATE.PLAYING && sendMessageDict({
        c: ClientPacket.VOTEMUTE,
        id: playerId
    })
};

Network.force = function(repelMsg) {
    Players.network(ServerPacket.PLAYER_UPDATE, repelMsg);
    for (let player of repelMsg.players) {
        Players.network(ServerPacket.PLAYER_UPDATE, player);
    }
    for (let mob of repelMsg.mobs) {
        Mobs.network(mob, repelMsg.id);
    }
    let pos = new Vector(repelMsg.posX, repelMsg.posY);
    game.renderer.particles_spirit_shockwave(pos);
    Sound.effectRepel(pos);
};

Network.getScores = function() {
    game.state == Network.STATE.PLAYING && sendMessageDict({
        c: ClientPacket.SCOREDETAILED
    })
};

Network.resizeHorizon = function() {
    game.state == Network.STATE.PLAYING && sendMessageDict({
        c: ClientPacket.HORIZON,
        horizonX: Math.ceil(game.halfScreenX / game.scale),
        horizonY: Math.ceil(game.halfScreenY / game.scale)
    })
};

Network.detectConnectivity = function() {
    game.lagging = game.timeNetwork - oldTimeNetwork > 1300
};

Network.shutdown = function() {
    null != ackIntervalId && clearInterval(ackIntervalId),
    null != primarySock && primarySock.close(),
    null != backupSock && backupSock.close(),
    backupSockIsConnected = false,
    shouldSendNextAckOnBackupSock = false,
    baseDivClk = -1,
    baseDivClkLastResetTime = -1,
    jitterMemory = 0,
    messageTombstoneMap = {},
    lastTombstoneGcTime = 0,
    sendKeyCount = 0,
    oldTimeNetwork = 0,
    lastReceivedError = false,
    f = 2e3,
    g = 2e3
};

Network.receivedError = function(errorText) {
    lastReceivedError = errorText
};

Network.spectateNext = function() {
    game.state == Network.STATE.PLAYING && Network.sendCommand("spectate", "-1")
};

Network.spectatePrev = function() {
    game.state == Network.STATE.PLAYING && Network.sendCommand("spectate", "-2")
};

Network.spectateForce = function() {
    game.state == Network.STATE.PLAYING && (Players.amIAlive() ? Network.sendCommand("spectate", "-3") : Network.spectateNext())
};

var sendRegularAckMsg = function() {
    game.lagging || game.state == Network.STATE.PLAYING && (shouldSendNextAckOnBackupSock ? backupSock && backupSockIsConnected && sendMessageDict({
        c: ClientPacket.ACK
    }, true) : sendMessageDict({
        c: ClientPacket.ACK
    }),
    shouldSendNextAckOnBackupSock = !shouldSendNextAckOnBackupSock)
};

var resetJitterMemoryEvery5Mins = function(packetDivClk) {
    if(Math.abs(packetDivClk - baseDivClk) > 36e5) {
        baseDivClk = packetDivClk;
        baseDivClkLastResetTime = performance.now();
        jitterMemory = 0;
    }
};

var dispatchIncomingMessage = function(msg) {
    if (game.state == Network.STATE.PLAYING || msg.c == ServerPacket.LOGIN || msg.c == ServerPacket.ERROR) {
        if ((msg.c == ServerPacket.PLAYER_UPDATE || msg.c == ServerPacket.PLAYER_FIRE || msg.c == ServerPacket.EVENT_BOOST || msg.c == ServerPacket.EVENT_BOUNCE) && msg.id == game.myID || msg.c == ServerPacket.PING) {
            if (msg.c != ServerPacket.PING && shouldDiscardTimestampedMessage(msg))
                return;
            game.timeNetwork = performance.now(),
            oldTimeNetwork = game.timeNetwork,
            function(curPacketDivClk) {
                game.jitter = 0;
                if (-1 != baseDivClk) {
                    resetJitterMemoryEvery5Mins(curPacketDivClk);
                    var curTime = game.timeNetwork;
                    var delta = (curPacketDivClk - baseDivClk) - (curTime - baseDivClkLastResetTime);
                    var newJitter = delta - (jitterMemory = (.8 * jitterMemory) + (delta / 5));
                    if(Math.abs(newJitter) < 100) {
                        game.jitter = newJitter;
                    }
                }
            }(msg.clock / 100)
        } else
            game.timeNetwork = performance.now(),
            oldTimeNetwork = game.timeNetwork,
            null != msg.clock && function(curPacketDivClk) {
                -1 != baseDivClk && (resetJitterMemoryEvery5Mins(curPacketDivClk),
                game.jitter = curPacketDivClk - baseDivClk - (game.timeNetwork - baseDivClkLastResetTime) - jitterMemory)
            }(msg.clock / 100);
        switch (msg.c) {
        case ServerPacket.PLAYER_UPDATE:
        case ServerPacket.PLAYER_FIRE:
        case ServerPacket.CHAT_SAY:
        case ServerPacket.PLAYER_RESPAWN:
        case ServerPacket.PLAYER_FLAG:
        case ServerPacket.EVENT_BOOST:
        case ServerPacket.EVENT_BOUNCE:
            Players.network(msg.c, msg);
            if (msg.c === ServerPacket.PLAYER_FIRE) {
                for (let projectile of msg.projectiles) {
                    projectile.c = ServerPacket.PLAYER_FIRE;
                    Mobs.add(projectile, false, msg.id);
                }
                if (msg.projectiles.length > 0) {
                    Sound.missileLaunch(new Vector(msg.projectiles[0].posX, msg.projectiles[0].posY), msg.projectiles[0].type);
                }
            }
            break;
        case ServerPacket.LOGIN:
            // this is the first message after the player joins
            !function(msg) {
                ackIntervalId = setInterval(sendRegularAckMsg, 50);
                game.myID = msg.id;
                game.myTeam = msg.team;
                game.myToken = msg.token;
                game.state = Network.STATE.PLAYING;
                game.roomName = UI.escapeHTML(msg.room);
                game.gameType = msg.type;
                game.spectatingID = null;
                game.myLevel = 0;
                handleServerConfigUpdate(msg.serverConfiguration);
                Games.prep();
                baseDivClk = msg.clock / 100;
                baseDivClkLastResetTime = performance.now();
                initBackupSock();
            }(msg),
            UI.loggedIn(msg);
            let botIds = msg.bots ? msg.bots.map(b => b.id) : [];
            for (let player of msg.players) {
                player.isBot = botIds.includes(player.id);
                Players.add(player, true);
            }
            Players.updateFFATeams();
            break;
        case ServerPacket.ERROR:
            UI.errorHandler(msg);
            break;
        case ServerPacket.PLAYER_NEW:
            Players.add(msg);
            break;
        case ServerPacket.PLAYER_LEAVE:
            Players.destroy(msg.id);
            break;
        case ServerPacket.PLAYER_TYPE:
            Players.changeType(msg);
            break;
        case ServerPacket.PLAYER_HIT:
            Players.impact(msg),
            200 != msg.type && Mobs.destroy(msg);
            break;
        case ServerPacket.PLAYER_KILL:
            Players.kill(msg);
            break;
        case ServerPacket.PLAYER_UPGRADE:
            UI.updateUpgrades([msg.speed, msg.defense, msg.energy, msg.missile], msg.upgrades, msg.type);
            break;
        case ServerPacket.PLAYER_POWERUP:
            Players.powerup(msg);
            break;
        case ServerPacket.PLAYER_LEVEL:
            Players.updateLevel(msg);
            break;
        case ServerPacket.PLAYER_RETEAM:
            Players.reteam(msg);
            break;
        case ServerPacket.EVENT_REPEL:
            Network.force(msg);
            break;
        case ServerPacket.EVENT_LEAVEHORIZON:
            0 == msg.type ? Players.leaveHorizon(msg) : Mobs.destroy(msg);
            break;
        case ServerPacket.EVENT_STEALTH:
            Players.stealth(msg);
            break;
        case ServerPacket.MOB_UPDATE:
        case ServerPacket.MOB_UPDATE_STATIONARY:
            if (msg.type >= 97 && msg.type <= 99) {
                Games.networkControlpoint(msg);
            } else {
                Mobs.network(msg, msg.ownerId);
            }
            break;
        case ServerPacket.MOB_DESPAWN:
            Mobs.despawn(msg);
            break;
        case ServerPacket.MOB_DESPAWN_COORDS:
            Mobs.destroy(msg);
            break;
        case ServerPacket.GAME_FLAG:
            Games.networkFlag(msg);
            break;
        case ServerPacket.GAME_PLAYERSALIVE:
            Games.playersAlive(msg.players);
            break;
        case ServerPacket.SCORE_UPDATE:
            UI.newScore(msg);
            break;
        case ServerPacket.SCORE_BOARD:
            UI.scoreboardUpdate(msg.data, msg.rankings, config.maxScoreboard),
            Players.updateBadges(msg.data);
            break;
        case ServerPacket.SCORE_DETAILED:
        case ServerPacket.SCORE_DETAILED_CTF:
        case ServerPacket.SCORE_DETAILED_BTR:
            UI.updateScore(msg);
            break;
        case ServerPacket.PING:
            !function(num) {
                sendMessageDict({
                    c: ClientPacket.PONG,
                    num: num
                })
            }(msg.num);
            break;
        case ServerPacket.PING_RESULT:
            UI.updateStats(msg);
            break;
        case ServerPacket.CHAT_PUBLIC:
            if (config.mobile)
                return;
            Players.chat(msg);
            break;
        case ServerPacket.CHAT_TEAM:
            if (config.mobile)
                return;
            Players.teamChat(msg);
            break;
        case ServerPacket.CHAT_WHISPER:
            if (config.mobile)
                return;
            Players.whisper(msg);
            break;
        case ServerPacket.CHAT_VOTEMUTEPASSED:
            if (config.mobile)
                return;
            Players.votemutePass(msg);
            break;
        case ServerPacket.CHAT_VOTEMUTED:
            if (config.mobile)
                return;
            return void UI.chatMuted();
        case ServerPacket.SERVER_MESSAGE:
            UI.serverMessage(msg);
            break;
        case ServerPacket.SERVER_CUSTOM:
            handleCustomMessage(msg);
            break;
        case ServerPacket.GAME_SPECTATE:
            Games.spectate(msg.id);
            break;
        case ServerPacket.GAME_FIREWALL:
            Games.handleFirewall(msg);
            break;
        case ServerPacket.COMMAND_REPLY:
            UI.showCommandReply(msg)
        }
    }
};

var handleCustomMessage = function(msg) {
    try {
        var parsedData = JSON.parse(msg.data)
    } catch (e) {
        return
    }
    switch (msg.type) {
        case 1:
            Games.showBTRWin(parsedData);
            break;
        case 2:
            Games.showCTFWin(parsedData);
            break;
        case 100:
            showSwitchGameSuggestion(parsedData);
            break;
        case 200:
            // see server/responses/broadcast/custom-data.ts
            const { player_id, custom_data } = parsedData;
            if (custom_data.url) {
                const player = Players.get(player_id);
                player.changeSkin(custom_data.url, custom_data.hash);
            }
            break;
        case 201:
            // see server/responses/broadcast/custom-data.ts
            const { players, skins } = parsedData;
            if (players) {
                for (let {id, custom_data} of players) {
                    if (custom_data.url) {
                        const player = Players.get(id);
                        player.changeSkin(custom_data.url, custom_data.hash);
                    }
                }
            } else if (skins) {
                localStorage.setItem("my_skins", JSON.stringify(skins));
            }
            break;
        case 202:
            // change game mode
            game.myTeam = parsedData.team;
            game.gameType = parsedData.type;
            game.force_update_teams = true;
            Games.prep();
            break;
        case 203:
            // change map
            if (parsedData.setParentMapId) {
                game.server.config.parentMapId = parsedData.setParentMapId;
                config.manifest.parentMapId = parsedData.setParentMapId;
                return;    
            }
            game.server.config.playerBounds = parsedData.playerBounds;
            game.server.config.mapBounds = parsedData.mapBounds;
            game.server.config.mapId = parsedData.mapId;
            game.server.config.parentMapId = parsedData.parentMapId;
            game.server.config.mapVersion = parsedData.mapVersion;
            game.renderer.apply_bounds(game.server.config.mapBounds);
            load_assets({...game.server.config, ships: parsedData.ships});
            break;
        case 204:
            // editor
            Network.editorCmd(parsedData.command, parsedData.params);
            break;
    }
};

var isValidGameServerId = function(gameServerId) {
    const re = /^[a-z0-9]+-[a-z0-9]+$/m;
    return re.test(gameServerId);
};

var showSwitchGameSuggestion = function(data) {
    /* 
       On the original Airmash servers, this was sent in a SERVER_MESSAGE packet, as HTML. Example:
    
         Battle Royale: Goliath round starting in 1 minute<br><span class="button" onclick="Games.switchGame(&quot;btr1&quot;)">JOIN BTR #1</span>
    */
    if (data && data.message && data.button && isValidGameServerId(data.server)) {
        const html = `${UI.escapeHTML(data.message)}<br><span class="button" onclick="Games.switchGame(&quot;${data.server}&quot;)">${UI.escapeHTML(data.button)}</span>`;
        UI.showMessage('alert', html, 5000);
    }
};

var handleServerConfigUpdate = function(data) {
    console.log(data)
    let config = {};
    try {
        config = JSON.parse(data)
    } catch (e) {}
    game.server.config = config;
    if (!config.playerBounds)
        game.server.config.playerBounds = {MIN_X: -16352, MIN_Y: -8160, MAX_X: 16352, MAX_Y: 8160};
    if (!config.mapBounds)
        game.server.config.mapBounds = {MIN_X: -16384, MIN_Y: -8192, MAX_X: 16384, MAX_Y: 8192};
    if (!config.mapId)
        game.server.config.mapId = 'vanilla';
    if (!config.mapVersion)
        game.server.config.mapVersion = [0,0,0,0,0,0,0,0];
    
    if (config.ships) {
        game.renderer.apply_bounds(game.server.config.mapBounds);
        load_assets({...game.server.config, ships: config.ships});
    } else
        UI.setupAircraft();//backwards compat with legacy servers
}

var shouldDiscardTimestampedMessage = function(msg) {
    var msgTombstone = msg.c + "_" + msg.clock + "_" + msg.posX + "_" + msg.posY + "_" + msg.rot + "_" + msg.speedX + "_" + msg.speedY;
    var now = performance.now();

    if((now - lastTombstoneGcTime) > 15e3) {
        for(var key in messageTombstoneMap) {
            if((now - messageTombstoneMap[key]) > 3e4) {
                delete messageTombstoneMap[key];
            }
        }
        lastTombstoneGcTime = now;
    }

    if(messageTombstoneMap[msgTombstone] != null) {
        return true;
    } else {
        messageTombstoneMap[msgTombstone] = now;
        return false;
    }
};

Network.reconnectMessage = function() {
    game.reloading || UI.showMessage("alert", '<span class="info">DISCONNECTED</span>Connection reset<br><span class="button" onclick="Network.reconnect()">RECONNECT</span>', 6e5)
};

Network.reconnect = function() {
    UI.showMessage("alert", "", 100),
    Games.switchGame()
};

Network.setup = function() {
    // if (DEVELOPMENT && (game.customServerUrl||game.playHost.includes('127.0.0.1'))) {
    //     currentSockUrl = game.customServerUrl || ("ws://" + game.playHost + "/" + game.playPath);
    // } else {
    //     currentSockUrl = "wss://" + game.playHost + "/" + game.playPath;
    // }
    currentSockUrl = game.serverUrl;
    wrap_websocket();
    backupSock && backupSockIsConnected && backupSock.close(),
    (primarySock = new _WebSocket(currentSockUrl)).binaryType = "arraybuffer",
    primarySock.onopen = function() {
        let session = {};
        if (config.auth.tokens && config.auth.tokens.game) {
            session.token = config.auth.tokens.game;
        }
        if (true) {
            const my_skins = localStorage.getItem('my_skins');
            session.custom_data = {url:game.skin, my_skins_len: my_skins && JSON.parse(my_skins).length};
            if (window.DEVELOPMENT && location.href.includes('localhost') && ["a","b"].includes(game.myName)) session.token = game.myName;//test logged in user (must be enabled in server (enableTestAccounts))
        }
        sendMessageDict({
            c: ClientPacket.LOGIN,
            protocol: game.protocol,
            name: game.myName,
            session: JSON.stringify(session), //"none",
            horizonX: Math.ceil(game.halfScreenX / game.scale),
            horizonY: Math.ceil(game.halfScreenY / game.scale),
            flag: game.myFlag.toUpperCase()
        });
    }
    ,
    primarySock.onclose = function() {
        if (ackIntervalId != null) {
            clearInterval(ackIntervalId)
        }

        if (game.state !== Network.STATE.CONNECTING) {
            game.server = {};
            game.state = Network.STATE.CONNECTING;
            if (lastReceivedError === false) { 
                Network.reconnectMessage();
            }
        }
    }
    ,
    primarySock.onerror = function(event) {
        console.error("WebSocket error observed:", event);
        UI.serverMessage({
            type: 1,
            text: "WebSocket connection failed. Try disabling AdBlock!",
            duration: 30000
        });
    };
    if (config.debug.log_packets) {
        primarySock.onmessage = function(e) {
            let msg = decodeMessageToDict(e.data);
            log_packet(msg);
            dispatchIncomingMessage(msg)
        }
    } else {
        primarySock.onmessage = function(e) {
            dispatchIncomingMessage(decodeMessageToDict(e.data))
        }
    }
};

var initBackupSock = function() {
    if (!currentSockUrl?.startsWith('ws'))
        return;
    (backupSock = new _WebSocket(currentSockUrl)).binaryType = "arraybuffer";
    backupSock.onopen = function() {
        sendMessageDict({
            c: ClientPacket.BACKUP,
            token: game.myToken
        }, true)
    }
    ,
    backupSock.onclose = function() {
        backupSockIsConnected = false
    }
    ,
    backupSock.onerror = function(event) {
        console.error("WebSocket error observed:", event);
        UI.serverMessage({
            type: 1,
            text: "WebSocket connection failed. Try disabling AdBlock!",
            duration: 30000
        });
    }
    ,
    backupSock.onmessage = function(sockMsg) {
        var msg = decodeMessageToDict(sockMsg.data);
        msg.c === ServerPacket.BACKUP && (backupSockIsConnected = true),
        msg.backup = true,
        dispatchIncomingMessage(msg)
    }
};

var encodeNetworkMessage = function(msg, t) {
    var n, msgLen = 1, encodedStrings = [], schema = ClientMessageSchema[msg.c];
    if (null == schema)
        return null;
    for (n = 0; n < schema.length; n++)
        switch (schema[n][1]) {
        case FieldType.text:
            var s = Tools.encodeUTF8(msg[schema[n][0]]);
            encodedStrings.push(s),
            msgLen += 1 + s.length;
            break;
        case FieldType.array:
        case FieldType.arraysmall:
            break;
        case FieldType.uint8:
            msgLen += 1;
            break;
        case FieldType.uint16:
            msgLen += 2;
            break;
        case FieldType.uint32:
        case FieldType.float32:
            msgLen += 4;
            break;
        case FieldType.float64:
            msgLen += 8;
            break;
        case FieldType.boolean:
            msgLen += 1
        }
    var buf = new ArrayBuffer(msgLen),
        dataView = new DataView(buf),
        curEncodedString = 0,
        outputOffset = 1;
    for (dataView.setUint8(0, msg.c, true),
    n = 0; n < schema.length; n++)
        switch (schema[n][1]) {
        case FieldType.text:
            var h = encodedStrings[curEncodedString].length;
            dataView.setUint8(outputOffset, h, true),
            outputOffset += 1;
            for (var d = 0; d < h; d++)
                dataView.setUint8(outputOffset + d, encodedStrings[curEncodedString][d], true);
            encodedStrings[curEncodedString],
            curEncodedString++,
            outputOffset += h;
            break;
        case FieldType.array:
        case FieldType.arraysmall:
            break;
        case FieldType.uint8:
            dataView.setUint8(outputOffset, msg[schema[n][0]], true),
            outputOffset += 1;
            break;
        case FieldType.uint16:
            dataView.setUint16(outputOffset, msg[schema[n][0]], true),
            outputOffset += 2;
            break;
        case FieldType.uint32:
            dataView.setUint32(outputOffset, msg[schema[n][0]], true),
            outputOffset += 4;
            break;
        case FieldType.float32:
            dataView.setFloat32(outputOffset, msg[schema[n][0]], true),
            outputOffset += 4;
            break;
        case FieldType.float64:
            dataView.setFloat64(outputOffset, msg[schema[n][0]], true),
            outputOffset += 8;
            break;
        case FieldType.boolean:
            dataView.setUint8(outputOffset, false === msg[schema[n][0]] ? 0 : 1),
            outputOffset += 1;
            break;
        default:
            console.error('encodeNetworkMessage', schema[n])
        }
    return buf
};

var decodeMessageToDict = function(encoded, t) {
    var dataView = new DataView(encoded),
        msg = {
            c: dataView.getUint8(0, true)
        },
        inputPos = 1,
        schema = ServerMessageSchema[msg.c];
    if (null == schema)
        return null;
    try {
        for (var fieldIdx = 0; fieldIdx < schema.length; fieldIdx++) {
            if (inputPos >= dataView.byteLength) {
                break;
            }
            var fieldName = schema[fieldIdx][0];
            switch (schema[fieldIdx][1]) {
            case FieldType.text:
            case FieldType.textbig:
                if (schema[fieldIdx][1] == FieldType.text) {
                    var l = dataView.getUint8(inputPos, true);
                    inputPos += 1
                } else {
                    l = dataView.getUint16(inputPos, true);
                    inputPos += 2
                }
                for (var u = new Uint8Array(l), c = 0; c < l; c++)
                    u[c] = dataView.getUint8(inputPos + c, true);
                var h = Tools.decodeUTF8(u);
                msg[fieldName] = h,
                inputPos += l;
                break;
            case FieldType.array:
            case FieldType.arraysmall:
                if (schema[fieldIdx][1] == FieldType.arraysmall) {
                    var d = dataView.getUint8(inputPos, true);
                    inputPos += 1
                } else {
                    d = dataView.getUint16(inputPos, true);
                    inputPos += 2
                }
                msg[fieldName] = [];
                for (var p = schema[fieldIdx][2], f = 0; f < d; f++) {
                    for (var g = {}, m = 0; m < p.length; m++) {
                        var v = p[m][0];
                        switch (p[m][1]) {
                        case FieldType.text:
                        case FieldType.textbig:
                            if (p[m][1] == FieldType.text) {
                                l = dataView.getUint8(inputPos, true);
                                inputPos += 1
                            } else {
                                l = dataView.getUint16(inputPos, true);
                                inputPos += 2
                            }
                            for (u = new Uint8Array(l),
                            c = 0; c < l; c++)
                                u[c] = dataView.getUint8(inputPos + c, true);
                            h = Tools.decodeUTF8(u);
                            g[v] = h,
                            inputPos += l;
                            break;
                        case FieldType.uint8:
                            g[v] = dataView.getUint8(inputPos, true),
                            inputPos += 1;
                            break;
                        case FieldType.uint16:
                            g[v] = dataView.getUint16(inputPos, true),
                            inputPos += 2;
                            break;
                        case FieldType.uint24:
                            var y = 256 * dataView.getUint16(inputPos, true);
                            inputPos += 2,
                            msg[v] = y + dataView.getUint8(inputPos, true),
                            inputPos += 1;
                            break;
                        case FieldType.uint32:
                            g[v] = dataView.getUint32(inputPos, true),
                            inputPos += 4;
                            break;
                        case FieldType.float32:
                            g[v] = dataView.getFloat32(inputPos, true),
                            inputPos += 4;
                            break;
                        case FieldType.float64:
                            g[v] = dataView.getFloat64(inputPos, true),
                            inputPos += 8;
                            break;
                        case FieldType.boolean:
                            g[v] = 0 != dataView.getUint8(inputPos, true),
                            inputPos += 1;
                            break;
                        case FieldType.speed:
                            g[v] = Tools.decodeSpeed(dataView.getUint16(inputPos, true)),
                            inputPos += 2;
                            break;
                        case FieldType.accel:
                            g[v] = Tools.decodeAccel(dataView.getUint16(inputPos, true)),
                            inputPos += 2;
                            break;
                        case FieldType.coordx:
                            g[v] = Tools.decodeCoordX(dataView.getUint16(inputPos, true)),
                            inputPos += 2;
                            break;
                        case FieldType.coordy:
                            g[v] = Tools.decodeCoordY(dataView.getUint16(inputPos, true)),
                            inputPos += 2;
                            break;
                        case FieldType.coord24:
                            y = 256 * dataView.getUint16(inputPos, true);
                            inputPos += 2,
                            msg[v] = Tools.decodeCoord24(y + dataView.getUint8(inputPos, true)),
                            inputPos += 1;
                            break;
                        case FieldType.rotation:
                            g[v] = Tools.decodeRotation(dataView.getUint16(inputPos, true)),
                            inputPos += 2;
                            break;
                        case FieldType.regen:
                            g[v] = Tools.decodeRegen(dataView.getUint16(inputPos, true)),
                            inputPos += 2;
                            break;
                        case FieldType.healthnergy:
                            g[v] = Tools.decodeHealthnergy(dataView.getUint8(inputPos, true)),
                            inputPos += 1
                        }
                    }
                    msg[fieldName].push(g)
                }
                break;
            case FieldType.uint8:
                msg[fieldName] = dataView.getUint8(inputPos, true),
                inputPos += 1;
                break;
            case FieldType.uint16:
                msg[fieldName] = dataView.getUint16(inputPos, true),
                inputPos += 2;
                break;
            case FieldType.uint24:
                y = 256 * dataView.getUint16(inputPos, true);
                inputPos += 2,
                msg[fieldName] = y + dataView.getUint8(inputPos, true),
                inputPos += 1;
                break;
            case FieldType.uint32:
                msg[fieldName] = dataView.getUint32(inputPos, true),
                inputPos += 4;
                break;
            case FieldType.float32:
                msg[fieldName] = dataView.getFloat32(inputPos, true),
                inputPos += 4;
                break;
            case FieldType.float64:
                msg[fieldName] = dataView.getFloat64(inputPos, true),
                inputPos += 8;
                break;
            case FieldType.boolean:
                msg[fieldName] = 0 != dataView.getUint8(inputPos, true),
                inputPos += 1;
                break;
            case FieldType.speed:
                msg[fieldName] = Tools.decodeSpeed(dataView.getUint16(inputPos, true)),
                inputPos += 2;
                break;
            case FieldType.accel:
                msg[fieldName] = Tools.decodeAccel(dataView.getUint16(inputPos, true)),
                inputPos += 2;
                break;
            case FieldType.coordx:
                msg[fieldName] = Tools.decodeCoordX(dataView.getUint16(inputPos, true)),
                inputPos += 2;
                break;
            case FieldType.coordy:
                msg[fieldName] = Tools.decodeCoordY(dataView.getUint16(inputPos, true)),
                inputPos += 2;
                break;
            case FieldType.coord24:
                y = 256 * dataView.getUint16(inputPos, true);
                inputPos += 2,
                msg[fieldName] = Tools.decodeCoord24(y + dataView.getUint8(inputPos, true)),
                inputPos += 1;
                break;
            case FieldType.rotation:
                msg[fieldName] = Tools.decodeRotation(dataView.getUint16(inputPos, true)),
                inputPos += 2;
                break;
            case FieldType.regen:
                msg[fieldName] = Tools.decodeRegen(dataView.getUint16(inputPos, true)),
                inputPos += 2;
                break;
            case FieldType.healthnergy:
                msg[fieldName] = Tools.decodeHealthnergy(dataView.getUint8(inputPos, true)),
                inputPos += 1;
                break;
            default:
                console.error('decodeMessageToDict', schema[fieldIdx]);
                return null
            }
        }
    } catch(e) {};
    return msg
};

var sendMessageDict = function(msg, useBackupConn) {
    if(useBackupConn) {
        backupSock.send(encodeNetworkMessage(msg));
    } else {
        primarySock.send(encodeNetworkMessage(msg));
    }
};

var KeyCodes = {
    UP: 1,
    DOWN: 2,
    LEFT: 3,
    RIGHT: 4,
    FIRE: 5,
    SPECIAL: 6
};

var FieldType = {
    text: 1,
    textbig: 2,
    array: 3,
    arraysmall: 4,
    uint8: 5,
    uint16: 6,
    uint24: 7,
    uint32: 8,
    float32: 9,
    float64: 10,
    boolean: 11,
    speed: 12,
    accel: 13,
    coordx: 14,
    coordy: 15,
    coord24: 16,
    rotation: 17,
    healthnergy: 18,
    regen: 19
};

var ClientPacket = {
    LOGIN: 0,
    BACKUP: 1,
    HORIZON: 2,
    ACK: 5,
    PONG: 6,
    KEY: 10,
    COMMAND: 11,
    SCOREDETAILED: 12,
    CHAT: 20,
    WHISPER: 21,
    SAY: 22,
    TEAMCHAT: 23,
    VOTEMUTE: 24,
    LOCALPING: 255
};

var ClientMessageSchema = {
    [ClientPacket.LOGIN]: [["protocol", FieldType.uint8], ["name", FieldType.text], ["session", FieldType.text], ["horizonX", FieldType.uint16], ["horizonY", FieldType.uint16], ["flag", FieldType.text]],
    [ClientPacket.BACKUP]: [["token", FieldType.text]],
    [ClientPacket.HORIZON]: [["horizonX", FieldType.uint16], ["horizonY", FieldType.uint16]],
    [ClientPacket.ACK]: [],
    [ClientPacket.PONG]: [["num", FieldType.uint32]],
    [ClientPacket.KEY]: [["seq", FieldType.uint32], ["key", FieldType.uint8], ["state", FieldType.boolean]],
    [ClientPacket.COMMAND]: [["com", FieldType.text], ["data", FieldType.text]],
    [ClientPacket.SCOREDETAILED]: [],
    [ClientPacket.CHAT]: [["text", FieldType.text]],
    [ClientPacket.WHISPER]: [["id", FieldType.uint16], ["text", FieldType.text]],
    [ClientPacket.SAY]: [["text", FieldType.text]],
    [ClientPacket.TEAMCHAT]: [["text", FieldType.text]],
    [ClientPacket.VOTEMUTE]: [["id", FieldType.uint16]],
    [ClientPacket.LOCALPING]: [["auth", FieldType.uint32]]
};

var ServerPacket = {
    LOGIN: 0,
    BACKUP: 1,
    PING: 5,
    PING_RESULT: 6,
    ACK: 7,
    ERROR: 8,
    COMMAND_REPLY: 9,
    PLAYER_NEW: 10,
    PLAYER_LEAVE: 11,
    PLAYER_UPDATE: 12,
    PLAYER_FIRE: 13,
    PLAYER_HIT: 14,
    PLAYER_RESPAWN: 15,
    PLAYER_FLAG: 16,
    PLAYER_KILL: 17,
    PLAYER_UPGRADE: 18,
    PLAYER_TYPE: 19,
    PLAYER_POWERUP: 20,
    PLAYER_LEVEL: 21,
    PLAYER_RETEAM: 22,
    GAME_FLAG: 30,
    GAME_SPECTATE: 31,
    GAME_PLAYERSALIVE: 32,
    GAME_FIREWALL: 33,
    EVENT_REPEL: 40,
    EVENT_BOOST: 41,
    EVENT_BOUNCE: 42,
    EVENT_STEALTH: 43,
    EVENT_LEAVEHORIZON: 44,
    MOB_UPDATE: 60,
    MOB_UPDATE_STATIONARY: 61,
    MOB_DESPAWN: 62,
    MOB_DESPAWN_COORDS: 63,
    CHAT_PUBLIC: 70,
    CHAT_TEAM: 71,
    CHAT_SAY: 72,
    CHAT_WHISPER: 73,
    CHAT_VOTEMUTEPASSED: 78,
    CHAT_VOTEMUTED: 79,
    SCORE_UPDATE: 80,
    SCORE_BOARD: 81,
    SCORE_DETAILED: 82,
    SCORE_DETAILED_CTF: 83,
    SCORE_DETAILED_BTR: 84,
    SERVER_MESSAGE: 90,
    SERVER_CUSTOM: 91
};

var ServerMessageSchema = {
    [ServerPacket.LOGIN]: [["success", FieldType.boolean], ["id", FieldType.uint16], ["team", FieldType.uint16], ["clock", FieldType.uint32], ["token", FieldType.text], ["type", FieldType.uint8], ["room", FieldType.text], ["players", FieldType.array, [["id", FieldType.uint16], ["status", FieldType.uint8], ["level", FieldType.uint8], ["name", FieldType.text], ["type", FieldType.uint8], ["team", FieldType.uint16], ["posX", FieldType.coordx], ["posY", FieldType.coordy], ["rot", FieldType.rotation], ["flag", FieldType.uint16], ["upgrades", FieldType.uint8]]],["serverConfiguration", FieldType.textbig],["bots", FieldType.array, [["id", FieldType.uint16]]]],
    [ServerPacket.BACKUP]: [],
    [ServerPacket.PING]: [["clock", FieldType.uint32], ["num", FieldType.uint32]],
    [ServerPacket.PING_RESULT]: [["ping", FieldType.uint16], ["playerstotal", FieldType.uint32], ["playersgame", FieldType.uint32]],
    [ServerPacket.ACK]: [],
    [ServerPacket.ERROR]: [["error", FieldType.uint8]],
    [ServerPacket.COMMAND_REPLY]: [["type", FieldType.uint8], ["text", FieldType.textbig]],
    [ServerPacket.PLAYER_NEW]: [["id", FieldType.uint16], ["status", FieldType.uint8], ["name", FieldType.text], ["type", FieldType.uint8], ["team", FieldType.uint16], ["posX", FieldType.coordx], ["posY", FieldType.coordy], ["rot", FieldType.rotation], ["flag", FieldType.uint16], ["upgrades", FieldType.uint8], ["isBot", FieldType.boolean]],
    [ServerPacket.PLAYER_LEAVE]: [["id", FieldType.uint16]],
    [ServerPacket.PLAYER_UPDATE]: [["clock", FieldType.uint32], ["id", FieldType.uint16], ["keystate", FieldType.uint8], ["upgrades", FieldType.uint8], ["posX", FieldType.coord24], ["posY", FieldType.coord24], ["rot", FieldType.rotation], ["speedX", FieldType.speed], ["speedY", FieldType.speed]],
    [ServerPacket.PLAYER_FIRE]: [["clock", FieldType.uint32], ["id", FieldType.uint16], ["energy", FieldType.healthnergy], ["energyRegen", FieldType.regen], ["projectiles", FieldType.arraysmall, [["id", FieldType.uint16], ["type", FieldType.uint8], ["posX", FieldType.coordx], ["posY", FieldType.coordy], ["speedX", FieldType.speed], ["speedY", FieldType.speed], ["accelX", FieldType.accel], ["accelY", FieldType.accel], ["maxSpeed", FieldType.speed]]]],
    [ServerPacket.PLAYER_RESPAWN]: [["id", FieldType.uint16], ["posX", FieldType.coord24], ["posY", FieldType.coord24], ["rot", FieldType.rotation], ["upgrades", FieldType.uint8]],
    [ServerPacket.PLAYER_FLAG]: [["id", FieldType.uint16], ["flag", FieldType.uint16]],
    [ServerPacket.PLAYER_HIT]: [["id", FieldType.uint16], ["type", FieldType.uint8], ["posX", FieldType.coordx], ["posY", FieldType.coordy], ["owner", FieldType.uint16], ["players", FieldType.arraysmall, [["id", FieldType.uint16], ["health", FieldType.healthnergy], ["healthRegen", FieldType.regen]]]],
    [ServerPacket.PLAYER_KILL]: [["id", FieldType.uint16], ["killer", FieldType.uint16], ["posX", FieldType.coordx], ["posY", FieldType.coordy]],
    [ServerPacket.PLAYER_UPGRADE]: [["upgrades", FieldType.uint16], ["type", FieldType.uint8], ["speed", FieldType.uint8], ["defense", FieldType.uint8], ["energy", FieldType.uint8], ["missile", FieldType.uint8]],
    [ServerPacket.PLAYER_TYPE]: [["id", FieldType.uint16], ["type", FieldType.uint8]],
    [ServerPacket.PLAYER_POWERUP]: [["type", FieldType.uint8], ["duration", FieldType.uint32]],
    [ServerPacket.PLAYER_LEVEL]: [["id", FieldType.uint16], ["type", FieldType.uint8], ["level", FieldType.uint8]],
    [ServerPacket.PLAYER_RETEAM]: [["players", FieldType.array, [["id", FieldType.uint16], ["team", FieldType.uint16]]]],
    [ServerPacket.GAME_FLAG]: [["type", FieldType.uint8], ["flag", FieldType.uint8], ["id", FieldType.uint16], ["posX", FieldType.coord24], ["posY", FieldType.coord24], ["blueteam", FieldType.uint8], ["redteam", FieldType.uint8]],
    [ServerPacket.GAME_SPECTATE]: [["id", FieldType.uint16]],
    [ServerPacket.GAME_PLAYERSALIVE]: [["players", FieldType.uint16]],
    [ServerPacket.GAME_FIREWALL]: [["type", FieldType.uint8], ["status", FieldType.uint8], ["posX", FieldType.coordx], ["posY", FieldType.coordy], ["radius", FieldType.float32], ["speed", FieldType.float32]],
    [ServerPacket.EVENT_REPEL]: [["clock", FieldType.uint32], ["id", FieldType.uint16], ["posX", FieldType.coordx], ["posY", FieldType.coordy], ["rot", FieldType.rotation], ["speedX", FieldType.speed], ["speedY", FieldType.speed], ["energy", FieldType.healthnergy], ["energyRegen", FieldType.regen], ["players", FieldType.arraysmall, [["id", FieldType.uint16], ["keystate", FieldType.uint8], ["posX", FieldType.coordx], ["posY", FieldType.coordy], ["rot", FieldType.rotation], ["speedX", FieldType.speed], ["speedY", FieldType.speed], ["energy", FieldType.healthnergy], ["energyRegen", FieldType.regen], ["playerHealth", FieldType.healthnergy], ["playerHealthRegen", FieldType.regen]]], ["mobs", FieldType.arraysmall, [["id", FieldType.uint16], ["type", FieldType.uint8], ["posX", FieldType.coordx], ["posY", FieldType.coordy], ["speedX", FieldType.speed], ["speedY", FieldType.speed], ["accelX", FieldType.accel], ["accelY", FieldType.accel], ["maxSpeed", FieldType.speed]]]],
    [ServerPacket.EVENT_BOOST]: [["clock", FieldType.uint32], ["id", FieldType.uint16], ["boost", FieldType.boolean], ["posX", FieldType.coord24], ["posY", FieldType.coord24], ["rot", FieldType.rotation], ["speedX", FieldType.speed], ["speedY", FieldType.speed], ["energy", FieldType.healthnergy], ["energyRegen", FieldType.regen]],
    [ServerPacket.EVENT_BOUNCE]: [["clock", FieldType.uint32], ["id", FieldType.uint16], ["keystate", FieldType.uint8], ["posX", FieldType.coord24], ["posY", FieldType.coord24], ["rot", FieldType.rotation], ["speedX", FieldType.speed], ["speedY", FieldType.speed]],
    [ServerPacket.EVENT_STEALTH]: [["id", FieldType.uint16], ["state", FieldType.boolean], ["energy", FieldType.healthnergy], ["energyRegen", FieldType.regen]],
    [ServerPacket.EVENT_LEAVEHORIZON]: [["type", FieldType.uint8], ["id", FieldType.uint16]],
    [ServerPacket.MOB_UPDATE]: [["clock", FieldType.uint32], ["id", FieldType.uint16], ["type", FieldType.uint8], ["posX", FieldType.coordx], ["posY", FieldType.coordy], ["speedX", FieldType.speed], ["speedY", FieldType.speed], ["accelX", FieldType.accel], ["accelY", FieldType.accel], ["maxSpeed", FieldType.speed], ["ownerId", FieldType.uint16]],
    [ServerPacket.MOB_UPDATE_STATIONARY]: [["id", FieldType.uint16], ["type", FieldType.uint8], ["posX", FieldType.float32], ["posY", FieldType.float32]],
    [ServerPacket.MOB_DESPAWN]: [["id", FieldType.uint16], ["type", FieldType.uint8]],
    [ServerPacket.MOB_DESPAWN_COORDS]: [["id", FieldType.uint16], ["type", FieldType.uint8], ["posX", FieldType.coordx], ["posY", FieldType.coordy]],
    [ServerPacket.SCORE_UPDATE]: [["id", FieldType.uint16], ["score", FieldType.uint32], ["earnings", FieldType.uint32], ["upgrades", FieldType.uint16], ["totalkills", FieldType.uint32], ["totaldeaths", FieldType.uint32]],
    [ServerPacket.SCORE_BOARD]: [["data", FieldType.array, [["id", FieldType.uint16], ["score", FieldType.uint32], ["level", FieldType.uint8]]], ["rankings", FieldType.array, [["id", FieldType.uint16], ["x", FieldType.uint8], ["y", FieldType.uint8]]]],
    [ServerPacket.SCORE_DETAILED]: [["scores", FieldType.array, [["id", FieldType.uint16], ["level", FieldType.uint8], ["score", FieldType.uint32], ["kills", FieldType.uint16], ["deaths", FieldType.uint16], ["damage", FieldType.float32], ["ping", FieldType.uint16]]]],
    [ServerPacket.SCORE_DETAILED_CTF]: [["scores", FieldType.array, [["id", FieldType.uint16], ["level", FieldType.uint8], ["captures", FieldType.uint16], ["score", FieldType.uint32], ["kills", FieldType.uint16], ["deaths", FieldType.uint16], ["damage", FieldType.float32], ["ping", FieldType.uint16]]]],
    [ServerPacket.SCORE_DETAILED_BTR]: [["scores", FieldType.array, [["id", FieldType.uint16], ["level", FieldType.uint8], ["alive", FieldType.boolean], ["wins", FieldType.uint16], ["score", FieldType.uint32], ["kills", FieldType.uint16], ["deaths", FieldType.uint16], ["damage", FieldType.float32], ["ping", FieldType.uint16]]]],
    [ServerPacket.CHAT_TEAM]: [["id", FieldType.uint16], ["text", FieldType.text]],
    [ServerPacket.CHAT_PUBLIC]: [["id", FieldType.uint16], ["text", FieldType.text]],
    [ServerPacket.CHAT_SAY]: [["id", FieldType.uint16], ["text", FieldType.text]],
    [ServerPacket.CHAT_WHISPER]: [["from", FieldType.uint16], ["to", FieldType.uint16], ["text", FieldType.text]],
    [ServerPacket.CHAT_VOTEMUTEPASSED]: [["id", FieldType.uint16]],
    [ServerPacket.CHAT_VOTEMUTED]: [],
    [ServerPacket.SERVER_MESSAGE]: [["type", FieldType.uint8], ["duration", FieldType.uint32], ["text", FieldType.textbig]],
    [ServerPacket.SERVER_CUSTOM]: [["type", FieldType.uint8], ["data", FieldType.textbig]]
};

Network.KEYPACKET = KeyCodes;

Network.KEYLOOKUP = {
    1: "UP",
    2: "DOWN",
    3: "LEFT",
    4: "RIGHT",
    5: "FIRE",
    6: "SPECIAL"
};

Network.CLIENTPACKET = ClientPacket;
Network.SERVERPACKET = ServerPacket;

Network.STATE = {
    LOGIN: 1,
    CONNECTING: 2,
    PLAYING: 3
};


const ServerPacketInverse = Object.keys(ServerPacket).reduce((acc, key) => {
    acc[ServerPacket[key]] = key;
    return acc;
}, {});

function log_packet(msg) {
    if (msg.backup) 
        return;
    if (['PING', 'PING_RESULT'].includes(ServerPacketInverse[msg.c]))
        return;
    console.log(ServerPacketInverse[msg.c], msg);
};


Network.peer_id = crypto.randomUUID();
let local_server, peer;
let id_count = 0;
let connections = [];

function start_server(callback) {
    const worker = new Worker('/server.js?'+new Date().getTime(), { type: "module" });
    const server = new Proxy(worker, {
        get(target, method) {
            const ret = Reflect.get(...arguments);
            if (typeof ret === 'function' && method != 'constructor') {
                return function (...args) { return ret.apply(worker, args); };
            } else if (!ret) {
                return (...args)=> {worker.postMessage({id: args[0].id, method, args:args.slice(1)})};
            }
            return ret;
        } 
    });
    server.addEventListener('message', ({data:{id, data}}) => {
        callback(id, data);
    });
    server.postMessage({init:true, config, KEYLOOKUP:Network.KEYLOOKUP, KeyCodes, ServerPacket, mapBounds:game.server.config?.mapBounds});
    window._server = server;
    return server;
}

function close_server() {
    console.log('closing local server');
    local_server?.terminate();
    local_server = null;
}

async function start_peer() {
    if (!window.Peer) {
        console.log('loading peerjs.js');
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'; 
        script.async = true;
        document.head.appendChild(script);
        await new Promise((resolve,reject)=>{
            script.onload = resolve;
        });
    }

    return new Promise((resolve, reject)=>{
        const peer_id = Network.peer_id; //crypto.randomUUID();
        const peer = new window.Peer(peer_id, {debug:2});
        peer.on('open', function(id) {
            console.log('peer open ' + id);
            resolve(peer);
        });
        peer.on('error', function(err){
            console.log('peer on error', err);
        });
        // 'Emitted when the peer is disconnected from the signaling server'
        // 'When a peer is disconnected, its existing connections will stay alive, but the peer cannot accept or create any new connections.'
        peer.on('disconnected', function(){
            console.log('peer on disconnected');
            peer.reconnect();
        });
    });
}

function close_peer() {
    console.log('closing peer');
    peer?.destroy();
    peer = null;
    Network.server_id = null;
    connections = [];
}


// manage these 3 scenarios
// A) normal ws connection (passthrough)
// B) connection using peerjs (client)
// C) create and connect to local server (web worker) + start peerjs server and forward client requests to local server
function wrap_websocket() {

    function dispatch(conn, msg) {
        if (msg.c !== 5)
            console.log(`send${conn.backup?'(backup)':''}`, msg);

        if (false) {

        //ACK
        } else if (msg.c === ClientPacket.ACK) {
            local_server.ack(conn);

        //ACK
        } else if (msg.c === ClientPacket.PONG) {
            local_server.pong(conn, msg);

        //LOGIN
        } else if (msg.c === ClientPacket.LOGIN) {
            local_server.login(conn, msg);

            // if (game.editorMode) {
            //     setTimeout(()=>{
            //         // show flags
            //         conn.callback({data:{c:ServerPacket.GAME_FLAG, type:1, flag:1, posX:config.objects.bases[1][0], posY:config.objects.bases[1][1]}});
            //         conn.callback({data:{c:ServerPacket.GAME_FLAG, type:1, flag:2, posX:config.objects.bases[2][0], posY:config.objects.bases[2][1]}});
            //     }, 500);
            // }

        //KEY
        } else if (msg.c === ClientPacket.KEY) {
            local_server.key(conn, msg);

        //COMMAND: respawn
        } else if (msg.c === ClientPacket.COMMAND && msg.com == 'respawn') {
            local_server.respawn(conn, parseInt(msg.data));

        } else if (msg.c === ClientPacket.COMMAND) {
            local_server.command(conn, msg.com, msg.data);

        } else if (msg.c === ClientPacket.CHAT) {
            // local_server.chat(conn, msg.text);
            const text = msg.text;
            for (const connection of connections) {
                if (!connection) continue;
                connection.callback({data:{
                    c: ServerPacket.CHAT_PUBLIC,
                    id: conn.player_id,
                    text,
                }});
            }
        }
    }
 
    _WebSocket = class {
        constructor(url) {
            this.id = id_count++;
            console.log('WebSocket', url, this.id);
            connections.push(this);

            if (!url) {
                // scenario C

                setTimeout(()=>this.onopen_callback(), 100);

                if (local_server)
                    return;

                function beacon({players, type}) {
                    fetch(`https://server-manager.airmash.workers.dev/add_peer`, {
                        method: "POST",
                        headers: {
                          "content-type": "application/json"
                        },
                        body: JSON.stringify({peer_id: peer.id, players, type, name: `${game.myName}'s Server`, region_name: Intl.DateTimeFormat().resolvedOptions().timeZone?.replace(/\/.*/, '').replace('America','US')})
                    });
                }
                
                local_server = start_server((id, data)=>{
                    if (id === -1 && peer) {
                        const {players, type} = data;
                        beacon({players, type});
                    } else {
                        const conn = connections[id];
                        if (conn) {
                            if (!data) {
                                // server closed connection
                                conn.onclose_callback();
                            } else {
                                if (data.c === ServerPacket.LOGIN) {
                                    conn.player_id = data.id;
                                }
                                conn.callback({data});
                            }
                        } else
                            console.log('server msg ignored (client disconnected?)', id);
                    }
                });

                // todo: peer serialization raw..
                // const _encodeNetworkMessage = encodeNetworkMessage;
                // const _decodeMessageToDict = decodeMessageToDict;
                encodeNetworkMessage = function(msg) { return msg; }; 
                decodeMessageToDict = function(msg) { return msg; };
                const _encodeNetworkMessage = encodeNetworkMessage;
                const _decodeMessageToDict = decodeMessageToDict;

                // start_peer (server)
                (async ()=>{
                    if (!peer)
                        peer = await start_peer();
                    Network.server_id = peer.id;
                    beacon({players:0, type:6});
                    peer.on('connection', function(conn) {
                        console.log('peer on connection');
                        if (!local_server) {
                            console.error('local_server null');
                            return;
                        }

                        conn.callback = ({data}) => {
                            const buffer = _encodeNetworkMessage(data);
                            conn.send(buffer);
                        };
                        conn.onclose_callback = () => {
                            conn.close();
                        };

                        conn.on('data', (data)=>{
                            //console.log("conn data(1)");
                            const msg = _decodeMessageToDict(data);
                            dispatch(conn, msg);
                        });
                        conn.on("open", () => {
                            console.log("conn open(1)");
                            conn.id = id_count++;
                            connections.push(conn);
                        });
                        conn.on('error', (...args)=>{
                            console.log("conn error(1)", ...args);
                        });
                        conn.on("close", () => {
                            console.log("conn close(1)");
                            local_server.close(conn);
                            connections[conn.id] = undefined;
                        });
                    });
                })();

            } else if (!url.startsWith('ws')) {
                // scenario B

                // server shutdown
                close_server();

                // todo: peer serialization raw..
                encodeNetworkMessage = function(msg) { return msg; }; 
                decodeMessageToDict = function(msg) { return msg; };

                // start_peer (client) and connect to peer server
                (async ()=>{
                    if (!peer)
                        peer = await start_peer();
                    peer.on('connection', function(conn) {});
                    const conn = peer.connect(url);
                    conn.on('data', (data)=>{
                        //console.log("conn data", data);
                        this.callback({data});
                    });
                    conn.on('open', ()=>{
                        console.log("conn open");
                        Network.server_id = url;
                        conn.id = id_count++;
                        this.conn = conn;
                        this.onopen_callback();
                    });
                    conn.on('error', (...args)=>{
                        console.log("conn error", ...args);
                        this.onerror_callback();
                    });
                    conn.on('close', ()=>{
                        console.log("conn close");
                        this.onclose_callback();
                    });                    
                })();

            } else {
                // scenario A
                this.ws = new WebSocket(url);
                this.ws.binaryType = "arraybuffer";

                // peer and server shutdown
                close_peer();
                close_server();
            }
        }

        set onopen(fn) {
            if (this.ws) //scenario A
                this.ws.onopen = fn;
            else {//scenario B-C
                this.onopen_callback = fn;
            }
        }
    
        set onclose(fn) {
            if (this.ws)
                this.ws.onclose = fn;
            else
                this.onclose_callback = fn;
        } 
    
        set onerror(fn) {
            if (this.ws)
                this.ws.onerror = fn;
            else
                this.onerror_callback = fn;
        }
    
        set onmessage(fn) {
            if (this.ws) //scenario A
                this.ws.onmessage = fn;
            else //scenario B-C
                this.callback = fn;
        }

        close() {
            if (this.ws)
                this.ws.close();
        }

        send(msg) {
            if (this.ws) {
                // scenario A
                this.ws.send(msg);
            } else if (this.conn) {
                // scenario B
                this.conn.send(msg);
            } else {
                // scenario C
                dispatch(this, msg);
            }
        }
    };
}

function connect(client, url) {
    const is_backup = !!client.socket;
    const socket = new _WebSocket(url);
    socket.binaryType = "arraybuffer";
    if (!is_backup) {
        client.socket = socket;
    }
    let shouldSendNextAckOnBackupSock = false;
    let ack_timer;

    const _send = socket.send;
    socket.send = function(obj) {
        obj = encodeNetworkMessage(obj);
        _send.call(socket, obj);
    };

    socket.onopen = function() {
        if (is_backup) {
            socket.send({c:ClientPacket.BACKUP, token: client.token});

            ack_timer = setInterval(()=>{
                (shouldSendNextAckOnBackupSock ? socket : client.socket).send({c: ClientPacket.ACK});;
                shouldSendNextAckOnBackupSock = !shouldSendNextAckOnBackupSock;
            }, 50);
        } else {
            socket.send({
                c: ClientPacket.LOGIN,
                protocol: 5,
                name: client.name,
                session: 'none',
                horizonX: 1200,
                horizonY: 650,
                flag: 'US'
            });
        }
    };

    socket.onclose = function() {
        //console.log(is_backup ? 'BACKUP' : '', 'socket close');
        clearInterval(ack_timer);
        if (!is_backup)
            client.socket = null;
        //client.destroy();
    };

    socket.onerror = function() {
        //console.log(is_backup ? 'BACKUP' : '', 'socket error');
    };

    socket.onmessage = function(e) {
        const msg = decodeMessageToDict(e.data);

        if (msg.c == ServerPacket.PING) {
			socket.send({ c: ClientPacket.PONG, num: msg.num });
		} else if (msg.c == ServerPacket.LOGIN) { 
			client.token = msg.token;
			// this.state.my_id = obj.id;
			// this.state.players = obj.players;
            if (url.startsWith('ws')) {
			    connect(client, url);
            } else {
                ack_timer = setInterval(()=>{
                    socket.send({c: ClientPacket.ACK});
                }, 100);
            }
		} else if (msg.c == ServerPacket.PLAYER_NEW) {
		} else if (msg.c == ServerPacket.PLAYER_LEAVE) {
		} else if (msg.c == ServerPacket.CHAT_PUBLIC) {
		}
    };

    return client;
}

class Client {
    sendKeyCount = 0

    constructor({name}) {
        this.name = name;
    }

    destroy() {

    }

    // state: true=starts firing, false=stop
    fire(state) {
        this.socket.send({c:ClientPacket.KEY, seq:++this.sendKeyCount, key:KeyCodes.FIRE, state});
    }
}

window.test_connect = (url)=>{
    const client = new Client({name:'x'});
    window.client = client;
    connect(client, url);
};