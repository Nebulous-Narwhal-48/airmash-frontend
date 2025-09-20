const state = {
    status: 'off',
    peer: null,
    calls: {},
    local_stream: null,
    empty_stream: null,
    muted: null,
    empty: null,
    interval: null,
}
const getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.ozGetUserMedia;
const $out = document.createElement('audio');
document.body.appendChild($out);

// called by Players.destroy
function playersDestroy(player_id) {
    if (game.myID == player_id) {
        parseCommand('off');
    } else {
        hangup(player_id);
    }
}

// called by UI.parseCommand
// commands: /voice on, /voice off, /voice mute, /voice unmute
async function parseCommand(cmd) {
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

    if (cmd === 'on') {
        if (state.status === 'on') {
            return;
        }
        state.status = 'on';
        state.peer = createPeer(game.myID);
        state.empty_stream = new MediaStream([createEmptyAudioTrack()]);
        state.local_stream = state.empty_stream;
        state.empty = true;
        state.muted = true;
        state.calls = {};
        state.interval = setInterval(loop, 2*1000);

    } else if (cmd == 'off') {
        if (state.status === 'off') {
            return;
        }
        state.status = 'off';
        state.peer.destroy();
        state.peer = null;
        state.local_stream.getTracks().forEach(track => track.stop());
        state.local_stream = null;
        state.empty_stream = null;
        state.empty = null;
        state.muted = null;
        state.calls = {};
        clearInterval(state.interval);

    } else if (cmd == 'mute') {
        if (state.status === 'off') {
            return;
        }
        state.local_stream.getTracks().forEach(track => track.enabled = false);
        state.muted = true;

    } else if (cmd == 'unmute') {
        if (state.status === 'off') {
            return;
        }
        if (state.empty) {
            state.empty = false;
            state.local_stream = await createLocalStream();
            for (let peer_id in state.calls) {
                state.calls[peer_id].peerConnection.getSenders()[0].replaceTrack(state.local_stream.etAudioTracks()[0])
            }
        }
        state.local_stream.getTracks().forEach(track => track.enabled = true);
        state.muted = false;
    }
}

function get_peer_id(player_id) {
    return 'wVRY8Oo6bgvyBwD9' + player_id;
}

function createEmptyAudioTrack() {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    const track = dst.stream.getAudioTracks()[0];
    return Object.assign(track, { enabled: false });
}

function createLocalStream() {
    return new Promise((resolve, reject) => {
        if (state.empty) {
            resolve(state.empty_stream);
        } else {
            getUserMedia({audio: true, video: false}, resolve, reject);
        }
    });
}

function createPeer(player_id) {
    const peer_id = get_peer_id(player_id);
    const peer = new Peer(peer_id, {debug:window.DEVELOPMENT ? 2 : 0});
    peer.on('open', function(id) {
        console.log('peer open ' + id);
    });
    peer.on('error', function(err){
        if (window.DEVELOPMENT) console.log('peer on error', err);
        if (err.type === 'peer-unavailable') {
            const peer_id = err.toString().match(/Could not connect to peer (.*)/)[1];
            delete state.calls[peer_id];
        }
    });
    // 'Emitted when the peer is disconnected from the signalling server'
    peer.on('disconnected', function(){
        console.log('peer on disconnected');
        peer.reconnect();
    });
    peer.on('call', function(call) {
        if (window.DEVELOPMENT) console.log('peer on call');
        if (call.peer in state.calls)
            throw "call already exists";
        state.calls[call.peer] = call;
        answer(call);
    });
    return peer;
}

function setCallListeners(call) {
    call.on('stream', function(remoteStream) {
        if (window.DEVELOPMENT) console.log("on stream");
        $out.srcObject = remoteStream;
        $out.play();
    });
    call.on('close', function() {
        if (window.DEVELOPMENT) console.log("on close");
        delete state.calls[call.peer];
    });
    call.on('error', function(err) {
        console.log("on error", err);
        delete state.calls[call.peer];
    });
}

function call(player_id) {
    const peer_id = get_peer_id(player_id);
    if (peer_id in state.calls) {
        return;
    }
    const call = state.peer.call(peer_id, state.local_stream);
    state.calls[peer_id] = call;
    setCallListeners(call);
}

function answer(call) {
    if (call.open)
        return;
    call.answer(state.local_stream);
    setCallListeners(call);
}

function hangup(player_id) {
    const peer_id = get_peer_id(player_id);
    const call = state.calls[peer_id];
    if (call) {
        call.close();
        delete state.calls[peer_id];
    }
}

function loop() {
    const players = Players.all();
    for (let player_id in players) {
        if (player_id <= game.myID) {//by convention, players with lesser id initiate the call
            continue;
        }
        const player = players[player_id];
        if (player.render) {
            call(player_id);
        } else {
            hangup(player_id);
        }
    }
}

// hooks
window.playersDestroy = playersDestroy;
window.parseCommand = parseCommand;