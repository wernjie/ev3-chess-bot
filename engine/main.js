let robotSignalElement = document.getElementById('robotsignal');
let statusTextElement = document.getElementById('statustext');
let progressBarInnerElement = document.getElementById('progressbar-inner');

let video = document.getElementById("campreviewfeed");
let stream;

let resultCanvasElement = document.getElementById("camcrop");
let sobelCanvas = document.getElementById('edgedetect');

let stockfish = new Worker("stockfish.js");
let chess = Chess();
let board = Chessboard('board', {
    position: 'start',
    pieceTheme: 'chesspieces/{piece}.png',
    showNotation: false
});

let skill = 0;
let max_err = 10;
let err_prob = 1;
let depth = 1;
let moves = [];
let movesSAN = [];
let promotion_pref = 'q';

/* INIT */
window.onload = async function () {

    sendCmds(["uci"]);
    setDifficulty(10);

    try {
        let c = JSON.parse(getCookie("cachedGameMoves"));
        console.log(c);
        if (c) resetGame(c);
    } catch (e) {
        resetGame();
    }

    resetRobotSignal();
    setStatusText('Accessing camera...');

    console.log(navigator, navigator.mediaDevices, navigator.getUserMedia);

    try {
        console.log("attempting to use back camera...");
        stream = await navigator.mediaDevices.getUserMedia({ video: {
            aspectRatio: 1,
            facingMode: { exact: "environment" }
        }});
    } catch(err) {
        console.log("falling back camera...");
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (err) {
            console.log("failed to get camera stream");
            setStatusText('Camera access denied or not available.\nReload page to retry.');
            progressBarInnerElement.style.width = "0%";
            return;
        }
    }
    progressBarInnerElement.style.width = "100%";

    //enable torch
    setTorch(true, true);

    var canvas = document.createElement("canvas");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    video.play();
    video.addEventListener( "loadedmetadata", function (e) {
        const
        width = this.videoWidth,
            height = this.videoHeight;
        canvas.width = width;
        canvas.height = height;

        console.log("video dimensions", width, height);

        function scheduleNextDetection() {
            setTimeout((timeout) => {
                canvas.getContext('2d').drawImage(video, 0, 0, width, height);
                let image = new Image();
                image.src = canvas.toDataURL('image/jpeg');

                image.addEventListener('load', function() {
                    if (!signallingRobotMove) {
                        processLoadedImage(image, resultCanvasElement, sobelCanvas);
                        let result = locateChessPiecesInCanvas(resultCanvasElement, referenceBlankBoardRawADE);
                        processChessPiecesResult(result);
                    }
                    scheduleNextDetection();
                });
            }, 500);
        }
        setTimeout(scheduleNextDetection, 1000);
    }, false);
}
window.onresize = function() {
    updateMovesListDisplay();
}

/* COOKIES */
function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  let expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}
function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

/* STOCKFISH CONFIG */
stockfish.onmessage = function(event) {
    let response = (event.data ? event.data : event);
    console.log("-> RESPONSE: ", response);
    processReply(response);
}

function sendCmds(instructions) {
    for (let instruction of instructions) {
        console.log("<- REQUEST : ", instruction);
        stockfish.postMessage(instruction);
    }
}
let thinkingForPlayer = false;
function processReply(response) {
    if (typeof response === 'string' || response instanceof String) {
        let msg = response.split(" ");
        if (msg[0] == "bestmove") {
            if (!thinkingForPlayer) {
                (async () => {
                    setStatusText("AI move " + msg[1], true);
                    robotMove(
                        splitInstSquares(msg[1]),
                        msg[2] == "ponder" ? splitInstSquares(msg[3]) : undefined
                    );
                })();
            } else {
                thinkingForPlayer = false;
            }
        } else if (msg[0] == "info") {
            let info = msg.slice(1);
            let info_dict = {};
            for (let i = 0; i < info.length; i += 2) {
                if (info[i] == "score") {
                    i--;
                    continue;
                } else if (info[i] == "pv") {
                    info_dict["pv"] = info.slice(i + 1);
                } else {
                    info_dict[info[i]] = info[i+1];
                }
            }
            processInfo(info_dict);
        }
    }
}

/* display config */
let moveListElement = document.getElementById('movelist');
let evalbarInner = document.getElementById('evalbar-inner');
let evalbarDesc = document.getElementById('evalbar-desc');
function processInfo(info) {
    let cp = info["cp"];
    let mate = info["mate"];
    let depth = info["depth"];

    let description = "";
    if (depth) {
        description += "<sup>Depth " + depth + "</sup> ";
    }
    if (mate !== undefined) {
        if (mate == 0) {
            description = "--";
        } else {
            description += (mate > 0 ? "+M" : "-M") + Math.abs(mate);
        }
    } else if (cp) {
        if (cp > 0) {
            description += "+" + (cp/100).toFixed(1) + " ";
        } else {
            description += (cp/100).toFixed(1) + " ";
        }
    }

    let MAX_CAP = 8;
    if (mate === 0) {
        let loser = chess.turn();
        evalbarInner.style.height = loser == "w" ? "100%" : "0%";
    } else {
        evalbarInner.style.height = Math.max(0, Math.min(-cp/100/2/MAX_CAP+0.5, 1))*100 + "%";
    }
    evalbarDesc.innerHTML = description;
}
function updateMovesListDisplay() {
    moveListElement.innerHTML = "<b><u>Moves</u></b>";
    for (let i = 0; i < movesSAN.length; i+=2) {
        let moveW = movesSAN[i];
        let moveB = movesSAN[i+1];
        let moveElement = document.createElement('li');
        if (moveW) {
            moveElement.innerText = moveW;
        }
        if (moveB) {
            moveElement.innerText += " " + moveB;
        }
        moveListElement.appendChild(moveElement);
    }
    moveListElement.scrollTop = moveListElement.scrollHeight;
    setCookie("cachedGameMoves", JSON.stringify(moves), 365);
}

/* USER CONFIG */
function setPromotionPref(piece) {
    promotion_pref = piece;
}

/* CHESSJS CONFIG */
function moveHasCapture(m) {
    var arr = [];
    m = splitInstSquares(m);

    for (row of chess.board()) for (e of row) arr.push(e);
    let start = arr; arr = [];
    let end = start;
    if (chess.move({from: m[0], to: m[1]})) {
        for (row of chess.board()) for (e of row) arr.push(e);
        end = arr; arr = [];
        chess.undo();
    }

    console.log(start,end);
    start = start.map((x)=>{return x == null ? 0 : 1}).reduce((a, b) => {return a + b}, 0);
    end   = end.map((x)=>{return x == null ? 0 : 1}).reduce((a, b) => {return a + b}, 0);

    console.log(start,end);
    if (end >= start) return null;

    if (chess.get(m[0]).type == 'p' && chess.get(m[1]) === null) {
        //en passant
        return m[1][0] + m[0][1];
    } else {
        return m[1];
    }
}

function moveHasCastleMove(m) {
    m = splitInstSquares(m);
    if (!chess.get(m[0])) {
        return null;
    }
    if (chess.get(m[0]).type != 'k') return null;

    let row = m[0][1];
    if (row != m[1][1] || (row != '1' && row != '8')) return null;

    let from = m[0][0];
    let to   = m[1][0];

    if (from != "e") return null;
    if (to == "g") return "h" + row + "f" + row;
    if (to == "c") return "a" + row + "d" + row;
    return splitInstSquares(m);
}
function moveHasPromotion(m) {
    m = splitInstSquares(m);
    if (!chess.get(m[0])) {
        return null;
    }
    if (chess.get(m[0]).type != 'p') return null;

    let from = m[0][1] - 0;
    let to   = m[1][1] - 0;

    if ((to == 8 || to == -1) && Math.abs(from-to) == 1) {
        if (m.length > 2) {
            return m[2];
        }
        return promotion_pref;
    }
    return null;
}

/* GENERAL HELPERS */
function splitInstSquares(move) {
    if (typeof move === 'string' || move instanceof String) {
        let ans = [move[0] + move[1], move[2] + move[3]];
        if (move.length > 4) ans.push(move[4]);
        return ans;
    }
    return move
}
function setDifficulty(d) {
    skill = d;

    if (skill < 5) {
        depth = "1";
    } else if (skill < 10) {
        depth = "5";
    } else if (skill < 15) {
        depth = ""+skill;
    } else {
        depth = ""+skill;
    }

    sendCmds([
        "setoption name Skill Level value " + skill,
        "setoption name MultiPV value 5",
    ]);
}
function resetGame(resetMoveList) {
    sendCmds([
        "isready",
        "ucinewgame",
    ]);
    chess.reset();
    board.start();
    console.log("Setting to start position.");

    let resetMoveListSAN = [];
    if (resetMoveList) {
        chess.reset();
        for (let move of resetMoveList) {
            let result = chess.move(move, {sloppy: true});
            if (!result) {
                chess.reset();
                resetMoveList = [];
                break;
            }
            resetMoveListSAN.push(result.san);
        }
        board.position(chess.fen());
    } else {
        resetMoveList = [];
    }

    console.log(chess.ascii());
    moves = resetMoveList;
    movesSAN = resetMoveListSAN;

    updateMovesListDisplay();
    evalbarInner.style.height = "50%";
    evalbarDesc.innerHTML = "<sup>DEPTH 0</sup> +0.0";
    awaitingStartPos = true;
    awaitingRobotMove = false;
    possibleUserMove = "";
}

function toggleEval() {
    evalbarDesc.classList.toggle("hidden");
}
function toggleSpeech() {
    speakingAllowed = !speakingAllowed;
    document.getElementById("speechBtn").classList.toggle("active", speakingAllowed);
}
function toggleFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
        let exitFS = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
        exitFS.call(document);
        document.getElementById("fullscreenBtn").classList.remove("active");
    } else {
        let fs = document.documentElement.requestFullscreen || document.documentElement.mozRequestFullScreen || document.documentElement.webkitRequestFullscreen || document.documentElement.msRequestFullscreen;
        if (fs) {
            fs.call(document.documentElement);
            document.getElementById("fullscreenBtn").classList.add("active");
        } else {
            //detect iphone user
            if (navigator.userAgent.match(/iPhone/i)) {
                alert("Please use Safari, tap the 'Aa' button, then tap 'Hide Toolbar' for fullscreen use.");
            } else {
                alert("Your browser does not support fullscreen mode.");
            }
        }
    }
}

let torchState = false;
function setTorch(enabled, silent) {
    if (!stream) {
        alert("No camera stream detected. Please reload and try again.");
        return;
    }
    if ('ImageCapture' in window) {
        const track = stream.getVideoTracks()[0];
        const imageCapture = new ImageCapture(track)
        const photoCapabilities = imageCapture.getPhotoCapabilities().then(() => {
            track.applyConstraints({ advanced: [{torch: enabled}] });
        });
        torchState = enabled;
        document.getElementById("torchBtn").classList.toggle("enabled", enabled);
    } else if (!silent) {
        alert("Your browser does not support setting flashlight mode. Use Chrome for Android if you need to use flash to light up the chessboard.");
    }
}
function toggleTorch() {
    setTorch(!torchState);
}

function calibrateBlank() {
    if (!stream) {
        alert("No camera stream detected. Please reload and try again.");
        return;
    }
    if (calibrationMode) {
        calibrationMode = false;
        alert("Cancelled calibration.");
        return;
    }
    let cal = confirm("Please REMOVE ALL chess pieces from the chessboard. When ready, press OK to begin calibration.");
    if (cal) {
        cachedDetectedBoardStateConfidence = 0;
        calibrationMode = "BLANK";
    }
}
function calibratePart() {
    if (!stream) {
        alert("No camera stream detected. Please reload and try again.");
        return;
    }
    if (calibrationMode) {
        calibrationMode = false;
        alert("Cancelled calibration.");
        return;
    }
    let cal = confirm("This consists of two steps. Step 1: Remove chess pieces on the squares you want to calibrate, then press OK to begin.");
    if (cal) {
        cachedDetectedBoardStateConfidence = 0;
        calibrationMode = "PART_NOPC";
    }
}

//
// Movement processing
//

let calibrationMode = false;
let partCalibrationCacheNoPiece = {};
let partCalibrationCacheHasPiece = {};
let awaitingStartPos = true;
let signallingRobotMove = false;
let awaitingRobotMove = false;
let possibleUserMove = "";
let cachedDetectedBoardState = {};
let cachedDetectedBoardStateConfidence = 0;
let cachedDetectedBoardRawADE = {};
let referenceBlankBoardRawADE = {};

let tts;
let synth = window.speechSynthesis;
let speakingAllowed = false;

async function waitMS(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}
function objectKeyPairEqual(obj1, obj2) {
    let keys1 = Object.keys(obj1);
    let keys2 = Object.keys(obj2);
    if (keys1.length != keys2.length) return false;
    for (let key of keys1) {
        if (obj1[key] != obj2[key]) return false;
    }
    return true;
}
function objectKeyPairMaxDiff(obj1, obj2) {
    let keys1 = Object.keys(obj1);
    let keys2 = Object.keys(obj2);
    if (keys1.length != keys2.length) return Infinity;
    let maxDiff = 0;
    for (let key of keys1) {
        let diff = Math.abs(obj1[key] - obj2[key]);
        if (diff > maxDiff) maxDiff = diff;
    }
    return maxDiff;
}
async function sendRobotMoves(moves) {
    awaitingRobotMove = true;
    await waitMS(500);
    for (let move of moves) {
        let m = splitInstSquares(move);
        await signalMove(m);
    }
    resetRobotSignal();
}
async function signalMove(m) {
    console.log("Signalling robot move message: " + m);
    signallingRobotMove = true;
    m = splitInstSquares(m);
    let from = m[0];
    let to   = m[1];

    if (to.indexOf("9") != -1) {
        setStatusText("AI discarding " + from, true);
    } else {
        setStatusText("AI moving " + from + to, true);
    }

    let val1 = "abcdefgh".indexOf(from[0]) + 1;
    let val2 = 9 - from[1];
    let val3 = "abcdefgh".indexOf(to[0]) + 1;
    let val4 = 9 - to[1];

    if (val1 > 8 || val2 > 8 || val3 > 8 || val4 > 8) {
        console.log("attempted signal invalid move");
        return;
    }
    if (val1 < 1 || val2 < 1 || val3 < 0 || val4 < 0) {
        console.log("attempted signal invalid move");
        return;
    }

    console.log(val1, val2, val3, val4);

    //transmit move to robot by flashing signal element
    let sepColor = "#ffffff";
    let dataColor = "#aaaaaa";
    let minTime = 100;
    let vals = [val1, val2, val3, val4];
    let el = robotSignalElement;

    let coloursToFlash = [];
    let transmitColor = function(w) {
        coloursToFlash.push(w ? dataColor: sepColor);
        if (!w) coloursToFlash.push(sepColor);
        coloursToFlash.push("black");
    }

    transmitColor(0);
    for (let val of vals) {
        for (let i = 0; i < val; i++) {
            transmitColor(1);
        }
        transmitColor(0);
    }

    let totalFlashes = coloursToFlash.length;

    progressBarInnerElement.style.transitionDuration = minTime + "ms";
    progressBarInnerElement.style.width = "0%";
    return new Promise((resolve, reject) => {
        let timer = setInterval(() => {
            progressBarInnerElement.style.width = (100 - coloursToFlash.length / totalFlashes * 100) + "%";

            if (coloursToFlash.length == 0) {
                clearInterval(timer);
                signallingRobotMove = false;
                console.log("Signal complete");
                progressBarInnerElement.style.transitionDuration = "";
                resolve();
                return;
            }
            let color = coloursToFlash.shift();
            el.style.backgroundColor = color;
        }, minTime);
    });
}
function resetRobotSignal() {
    robotSignalElement.style.backgroundColor = "black";
}

function setStatusText(text, speak, interrupt) {
    statusTextElement.innerText = text;
    if (speak || interrupt) {
        speakText(speak ? text : undefined, interrupt);
    }
}
function speakText(text, interrupt) {
    if (!speakingAllowed) return;
    if (tts && tts.text != text && synth && interrupt) {
        console.log("Cancelling speech", tts.text, text);
        synth.cancel();
        tts = undefined;
    }
    if (synth && text) {
        if (tts && tts.text == text) {
            return;
        }
        tts = new SpeechSynthesisUtterance(text);
        tts.lang = "en-US";
        tts.onerror = function (event) {
            console.error('SpeechSynthesisUtterance.onerror', event);
        }
        synth.speak(tts);
        console.log("Speaking:", text);
    }
}

function processChessPiecesResult(result) {
    if (signallingRobotMove) {
        return;
    }

    if (chess.game_over()) {
        if (chess.in_checkmate()) {
            if (chess.turn() != "w") { //white checkmated
                setStatusText("Checkmate - you won!", true);
            } else {
                setStatusText("Checkmate - you lose!", true);
            }
        } else if (chess.in_stalemate()) {
            setStatusText("Stalemate!", true);
        } else if (chess.in_draw()) {
            setStatusText("Draw!", true);
        } else if (chess.in_threefold_repetition()) {
            setStatusText("Threefold repetition!", true);
        } else if (chess.in_insufficient_material()) {
            setStatusText("Insufficient material!", true);
        } else if (chess.in_repetition()) {
            setStatusText("Repetition!", true);
        } else if (chess.in_draw()) {
            setStatusText("Draw!", true);
        } else {
            setStatusText("Game over!", true);
        }
        if (calibrateMode) {
            //forcibly reset game on calibration
            resetGame();
        }
        progressBarInnerElement.style.width = "100%";
        return;
    }

    let detectedBoard = result.board;

    let boardValidFraction = result.validFraction;
    let boardValid = boardValidFraction > 0.95;

    if ((
        (!calibrationMode && objectKeyPairEqual(detectedBoard, cachedDetectedBoardState)) ||
        (calibrationMode && objectKeyPairMaxDiff(result.boardRawADE, cachedDetectedBoardRawADE) < 2)
    ) && boardValid) {
        cachedDetectedBoardStateConfidence++;
        cachedDetectedBoardState = detectedBoard;
        cachedDetectedBoardRawADE = result.boardRawADE;
    } else {
        cachedDetectedBoardStateConfidence = 0;
        cachedDetectedBoardState = detectedBoard;
        cachedDetectedBoardRawADE = result.boardRawADE;
    }

    const boardStableThreshold = 3;
    let boardStable = cachedDetectedBoardStateConfidence >= boardStableThreshold;

    const calibrationWaitThreshold = 10;
    if (calibrationMode) {
        progressBarInnerElement.style.width = cachedDetectedBoardStateConfidence/calibrationWaitThreshold*100 + "%";
        if (boardValid) {
            if (boardStable) {
                if (calibrationMode == "BLANK") {
                    setStatusText("Calibrating blank chessboard...");
                } else if (calibrationMode == "PART_NOPC") {
                    setStatusText("Calibrating empty squares...");
                } else if (calibrationMode == "PART_WITHPC") {
                    setStatusText("Calibrating squares with new pieces...");
                }
            } else {
                setStatusText("Calibration interference detected...", false, true);
            }
            if (cachedDetectedBoardStateConfidence >= calibrationWaitThreshold) {

                if (calibrationMode == "BLANK") {
                    calibrationMode = false;
                    referenceBlankBoardRawADE = result.boardRawADE;
                    setStatusText("Calibration complete!", true);

                } else if (calibrationMode == "PART_NOPC") {
                    calibrationMode = "PART_WITHPC";
                    partCalibrationCacheNoPiece = result.boardRawADE;
                    cachedDetectedBoardStateConfidence = 0;
                    setStatusText("Step 1 complete!");
                    let res = confirm("Step 1 complete! Now, place some chess pieces on the squares you'd like to calibrate, then press OK to continue.");
                    if (!res) {
                        calibrationMode = false;
                        setStatusText("Calibration cancelled!");
                    }

                } else if (calibrationMode == "PART_WITHPC") {
                    calibrationMode = false;
                    if (!partCalibrationCacheNoPiece) {
                        alert("Error: Unexpected missing calibration data");
                        return;
                    }
                    partCalibrationCacheHasPiece = result.boardRawADE;
                    let selectedDict = {};
                    for (let key of Object.keys(partCalibrationCacheNoPiece)) {
                        let diff = partCalibrationCacheHasPiece[key] - partCalibrationCacheNoPiece[key];
                        if (Math.abs(diff) >= 1.5) {
                            selectedDict[key] = Math.min(partCalibrationCacheNoPiece[key], partCalibrationCacheHasPiece[key]);
                        }
                    }
                    partCalibrationCacheNoPiece = undefined;
                    partCalibrationCacheHasPiece = undefined;

                    if (Object.keys(selectedDict).length == 0) {
                        setStatusText("Calibration failed!");
                        alert("Calibration failed! No changes were detected. You should remove all pieces from squares you like to calibrate first, then put them back on the squares on the second step.");
                        return;
                    }
                    let res = confirm("Calibrated " + Object.keys(selectedDict) + ". Confirm?");
                    if (res) {
                        referenceBlankBoardRawADE = {...referenceBlankBoardRawADE, ...selectedDict};
                        setStatusText("Calibration complete!", true);
                    } else {
                        setStatusText("Calibration cancelled.");
                    }
                }
            }
        } else {
            setStatusText("Waiting for board visibility");
        }
        return;
    }


    if (!boardValid) {
        progressBarInnerElement.style.width = "0%";
        if (awaitingRobotMove) {
            setStatusText("AI moving, do not interfere...", true);
        } else {
            setStatusText("Chessboard not in view", false, true);
        }
        return;
    }

    if (awaitingRobotMove || awaitingStartPos) {
        progressBarInnerElement.style.width = "0%";
        if (awaitingRobotMove) {
            setStatusText("AI moving, do not interfere...", true);
        } else {
            setStatusText("Waiting for start position...", true, true);
        }

        let countDiff = 0;
        for (let x of "12345678") {
            for (let y of "abcdefgh") {
                let square = y + x;
                let detectedPieceColor = detectedBoard[square];
                let currentPieceColor = chess.get(square) ? chess.get(square).color.toUpperCase() : undefined;
                if (detectedPieceColor != currentPieceColor) {
                    countDiff++;
                }
            }
        }

        if (awaitingRobotMove) {
            progressBarInnerElement.style.width = Math.max(0, 5-countDiff)/5*100 + "%";
        } else {
            progressBarInnerElement.style.width = Math.max(0, 32-countDiff)/32*100 + "%";
        }
        if (countDiff) return;

        if (awaitingRobotMove) {
            setStatusText("AI move complete", true, true);
        }

        awaitingRobotMove = false;
        awaitingStartPos = false;
        return;
    }

    progressBarInnerElement.style.width = cachedDetectedBoardStateConfidence/boardStableThreshold*100 + "%";

    if (!boardStable) {
        setStatusText("Chessboard interference detected");
        return;
    }


    let blackLost = [];
    let whiteLost = [];
    let blackGain = [];
    let whiteGain = [];

    for (let x of "12345678") {
        for (let y of "abcdefgh") {
            let square = y + x;
            let detectedPieceColor = detectedBoard[square] ? detectedBoard[square].toLowerCase() : undefined;
            let currentPieceColor = chess.get(square) ? chess.get(square).color.toLowerCase() : undefined;
            if (detectedPieceColor != currentPieceColor) {
                if (currentPieceColor == "b") {
                    blackLost.push(square);
                } else if (currentPieceColor == "w") {
                    whiteLost.push(square);
                }

                if (detectedPieceColor == "b") {
                    blackGain.push(square);
                } else if (detectedPieceColor == "w") {
                    whiteGain.push(square);
                }
            }
        }
    }

    //Assume white to move only
    if (whiteLost.length != whiteGain.length) {
        console.log("white inconsistency detected: " + whiteLost + " to " + whiteGain);
        if (whiteLost.length > whiteGain.length) {
            setStatusText("Invalid move - missing white piece(s) within " + whiteLost);
        } else {
            setStatusText("Invalid move - extra white piece(s) within " + whiteGain);
        }
        speakText("Invalid move");
        possibleUserMove = "";
        return;
    }
    if (blackGain.length > 0 || blackLost.length >= 2) {
        console.log("non-white legal move detected: " + whiteLost + " to " + whiteGain + "; " + blackLost + " to " + blackGain);
        if (blackLost.length == 0) {
            setStatusText("Invalid move - unexpected black piece(s) gain: " + blackGain);
        } else if (blackGain.length == 0) {
            setStatusText("Invalid move - unexpected black pieces removed: " + blackLost);
        } else {
            setStatusText("Invalid move - unexpected black pieces moved: " + blackLost + " to " + blackGain);
        }
        speakText("Invalid move");

        possibleUserMove = "";
        return;
    }

    let move = "";
    if (whiteGain.length == 0) {
        setStatusText("Waiting for player move...", true, true);
        return;
    } else if (whiteGain.length == 1) {
        move = whiteLost[0] + whiteGain[0];
        if ((move == "e1g1" || move == "e1c1")) {
            if (chess.get("e1").type == "k") {
                setStatusText("Illegal move - " + move, true);
                possibleUserMove = "";
                return;
            }
        }
    } else if (whiteGain.length == 2) {
        let kingMoved = whiteLost.indexOf("e1") != -1;
        let hRookMoved = whiteLost.indexOf("h1") != -1;
        let aRookMoved = whiteLost.indexOf("a1") != -1;

        let queenSideGain = whiteGain.indexOf("d1") != -1 && whiteGain.indexOf("c1") != -1;
        let kingSideGain = whiteGain.indexOf("f1") != -1 && whiteGain.indexOf("g1") != -1;

        let queenSideCastle = kingMoved && aRookMoved && queenSideGain;
        let kingSideCastle = kingMoved && hRookMoved && kingSideGain;

        if (queenSideCastle) {
            move = "e1c1";
        } else if (kingSideCastle) {
            move = "e1g1";
        }
    }

    let moveCapture = moveHasCapture(move);
    if (moveCapture) {
        if (blackLost.length == 0) {
            setStatusText("Invalid move - extra unexpected black piece detected");
            speakText("Invalid move");
            possibleUserMove = "";
            return;
        } else if (blackLost.length == 1) {
            if (moveCapture != blackLost[0]) {
                setStatusText("Illegal move - " + move + " cannot capture " + blackLost);
                speakText("Illegal move");
                possibleUserMove = "";
                return;
            }
        }
    } else {
        if (blackLost.length > 0) {
            setStatusText("Illegal move - " + move + " cannot capture " + blackLost);
            speakText("Illegal move");
            possibleUserMove = "";
            return;
        }
    }

    if (move == "") {
        console.log("non-valid white move detected: " + whiteLost + " to " + whiteGain + "; " + blackLost + " to " + blackGain);
        setStatusText("Illegal move - too many pieces moved at once");
        speakText("Illegal move");
        possibleUserMove = "";
        return;
    }

    if (possibleUserMove != move) {
        possibleUserMove = move
        if (playerMove(move)) {
            setStatusText("Player moved " + move + "; thinking...");
            speakText("Player moved " + move);
            awaitingRobotMove = true;
            possibleUserMove = "";
        } else {
            if (chess.in_check()) {
                setStatusText("Illegal move " + move + "; currently in check", true);
            } else {
                setStatusText("Illegal move " + move, true);
            }
        }
    } else {
        //Do nothing until something changes
    }
}

//
// Movement handlers
//
let ponderingMove;
function playerMove(m, ignore) {
    if (!m) return false;
    m = splitInstSquares(m);
    let promotion = moveHasPromotion(m);

    if (chess.turn() != "w") return false;

    let moveResult = chess.move({from: m[0], to: m[1], promotion: promotion});
    if (!moveResult) return false;

    let SAN = moveResult.san;

    moves.push(m.join(""));
    movesSAN.push(SAN);
    updateMovesListDisplay();
    board.position(chess.fen())

    console.log("Player moved " + m);
    console.log(chess.ascii());

    if (ignore) return true;
    if (chess.game_over()) {
        handleGameOver();
        return true;
    }
    let pM = splitInstSquares(ponderingMove)
    if (!pM || pM[0] !== m[0] || pM !== m[1]) {
        if (+depth > 10) {
        }
        thinkingForPlayer = false;
        sendCmds([
            "position startpos moves " + moves.join(" "),
            "eval",
            "go depth " + depth + " wtime 300000 winc 3000 btime 300000 binc 3000",
        ]);
    } else {
        ponderingMove = undefined;
        sendCmds([
            "ponderhit",
        ]);
    }
    return true;
}
async function robotMove(m, ponderM) {
    m = splitInstSquares(m);
    let captures = moveHasCapture(m);
    let promotion = moveHasPromotion(m);
    let castles = splitInstSquares(moveHasCastleMove(m));
    /* Temporarily disabled to reduce cpu usage
    ponderingMove = ponderM;
    if (ponderM) {
        sendCmds([
            "go ponder"
        ]);
    }*/
    if (chess.turn() != "b") return false;

    let moveResult = chess.move({from: m[0], to: m[1], promotion: promotion});
    if (!moveResult) return false;

    let SAN = moveResult.san

    console.log(
        "Robot to move " + m
        + ", capture=" + captures
        + ", castle=" + castles
        + ", promotion=" + promotion
    );

    if (captures)
        sendRobotMoves([captures + m[0][0] + '9', m[0] + m[1]]);
    else if (castles)
        sendRobotMoves([m[0] + m[1], castles[0] + castles[1]]);
    else
        sendRobotMoves([m[0] + m[1]]);

    moves.push(m.join(""));
    movesSAN.push(SAN);
    updateMovesListDisplay();
    board.position(chess.fen())

    console.log("Robot moved " + m);
    console.log(chess.ascii());

    thinkingForPlayer = true;
    sendCmds([
        "position startpos moves " + moves.join(" "),
        "eval",
        "go depth 14 wtime 300000 winc 3000 btime 300000 binc 3000",
    ]);

    if (chess.game_over()) {
        handleGameOver();
        return true;
    }
}
function handleGameOver() {
    console.log("Game Over");
}
