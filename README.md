# ev3-chess-bot

Chess Bot Client Webapp to interface intepreted camera and Stockfish results with EV3.

Message-passing done via flashing the screen and using an NXT light sensor to recognise the data.

## Installation and Usage

### Chess Engine and Message Passing

Available at: https://wernjie.github.io/ev3-chess-bot/engine/

Run the webapp on a phone in landscape mode. Initiate full screen mode if possible. Mount it with the camera pointing to the chessboard, perfectly parallel, and taking up most of the viewfinder with edges in view. Automatic cropping and normalisation of the camera footage will take over, and you should see a perfect low resolution checkerboard image from the camera shown in the second preview from top left.

You may calibrate an empty chessboard by tapping **Calibrate Detection** and mounting the phone in the
same position and lighting conditions as you would be planning to permanently mount it for chess
piece movement detection. This ensures highest possible accuracy.

If possible, utilise uniform lighting or phone torch (only supported using Chrome on Android).

Please ensure screen is at ***full brightness*** for best detection performance by the *chess_reader* EV3.

**Important caveats as of writing:**
- Safari required for camera access if you're on an iPhone.
- Chrome on Android required for toggling flash.

<br/>

### EV3 controller network

Use the legacy [EV3 Lab software](https://education.lego.com/en-us/downloads/retiredproducts/mindstorms-ev3-lab/software) to open the EV3-G code and install it on three separate EV3 bots.

All movements are on repeated LEGO Technic 1x4 geared racks (3743) with 36 tooth double bevel gears (32498).

The default names for the three 'robots' are listed below and should be self-explanatory.

---
#### chess_x_axis

- Movement using *Large Motor B*.
    - Runs in reverse direction (negative power drives movement from column A to column H), offset -75° rotation away from chessboard column A (outside of the board).
- Pickup mechanism on *Large Motor A*.
    - range of motion approx slightly under 90°. Positive rotation to move mechanism down.
- Claw mechanism on *Medium Motor D*.
    - Jammable to close and open positions at 100% power in under 0.2 seconds. Positive rotation for closing.

Run program `x-axis` and wait for calibration confirmation beep. Should rest slightly before column A.

Range of motion available from ***75° motor rotation before column A*** (jammed completely) to ***column H***.

---
#### chess_y_axis

- Movement *Medium Motor C* for left side (next to chessboard column A).
- Movement *Medium Motor B* for right side (next to chessboard column H).

Run program `y-axis` and wait for calibration confirmation beep. Should rest slightly past "row 9", ready to play as black.

Range of motion available from ***row 1*** to ***135° motor rotation past "row 9"*** (i.e. one imaginary row out of chess board, jammed completely).

---
#### chess_reader

- *NXT Light Sensor* at port 3. Mount in less than one piece distance above the screen. Ensure **screen is at full brightness**.

Run program `phone-reader` and ensure successful connection to the two other EV3s. Asyncrhonously reads screen flashes from phone and interprets as movement.

- Press Center button to calibrate black levels at any time.
- Press Left button to forcibly terminate all pending requests and request movement to top left (1,0) position, then terminate `phone-reader`. Useful in event of corrupted transmission.
- Press Right button to send an arbitrary request to move a chess piece from (2,2) to (7,6) aka b7g3 to test movement accuracy. Only initiate when idle or may cause transmission corruption.

---

<br/>

### Transmission Mechanism Details

Transmission is performed by flashing the information to the EV3 from the phone screen to an NXT light sensor as basic coordinates in three light levels.
- Black: separation gap (`_`)
- Gray : coordinate counter (`X`)
- White: coordinate separator (`|`)

A flash of `|_X_X_X_X_|_X_X_|_X_X_X_X_|_X_X_X_X_|_` is interpreted as "move piece on (4,2) to (4,4)", starting from bottom right from robots perspective (playing as black), with left+up as positive axes.

The range of values for x-axis is 1-8, and y-axis is 0-8. Note that 1-8 are within the chess board, so values outside of 1-8 are out of the chessboard.

Thus, "move piece on (4,2) to (4,4)" is equivalent to move ***d7d5***.

<br/>

### Piece Detection Details
Uses average ∆E of pixels as a metric for detecting the presence of a piece.
(with the assumption that chess pieces have a different hue from the chessboard, which is not uncommon).

∆E measures the distance between two colours, commonly used for measuring monitor colour accuracy. \[[Details](http://zschuessler.github.io/DeltaE/learn)\].

For our case, the higher the ∆E value for a particular square tile, the more likely there is for a colour difference and thus presence of a piece.
This is especially effective for detecting black pieces on dark tiles with slight hue differences.

Piece colour detection is then done with luminosity thresholds at the center of the square tile.

<br/>

### EV3 Bluetooth Failure Debugging Notes

I suffered from these issues for way too long, so hope these will help alleviate some pain points. As of writing,

- EV3 cannot simultaneously establish a connection to a computer and one or more EV3 at the same time.
    - Ensure EV3 is not actively connected to a computer to allow connections to other EV3(s).
    - Ensure EV3 is not actively connected to other EV3(s) to allow connections to a computer.
    - Closing an EV3 running program does not terminate connections to other EV3(s). Ensure to disconnect from settings if you want to connect to a computer.
    - Pressing the disconnect EV3 button on your computer does NOT guarantee that the EV3 is disconnected from your computer. Ensure to check EV3 as well.
- Pressing the back button on your EV3 while it is attempting a bluetooth connection, performing a bluetooth search etc., in a program or settings has a high chance of crashing the internal EV3 bluetooth driver. Try to wait till it completes instead.
- The program has automatic workarounds to determine whether a connection failure occured. However, it may not detect a bluetooth driver failure or a mid-transmission disconnection, in which the symptom would be an unresponsive bot when a command was sent. Since all transmissions are programmed with corresponding acknowledgements, all bots would freeze mid-action in the event of a connection failure.
- In the event of an immediate program termination with a system error, either the internal EV3 bluetooth driver likely crashed or has never paired with the target bots.
    - Ensure the bots were paired manually through EV3 settings and are of the correct name.
    - If they are already paired but the issue still occurs, restart the EV3 to resolve.
