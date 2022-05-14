# ev3-chess-bot

Chess Bot Client Webapp to interface intepreted camera and Stockfish results with EV3.

Message-passing done via flashing the screen and using an NXT light sensor to recognise the data.

## Setup, Installation and Usage

### Chess Engine and Message Passing

Available at: [https://wernjie.github.io/ev3-chess-bot/engine/](https://wernjie.github.io/ev3-chess-bot/engine/)

**Get it up and running:**
1. Run the webapp on a phone in landscape mode. 
2. Initiate full screen mode if possible. 
3. Ensure screen is at ***full brightness*** for best detection performance by the *chess_reader* EV3 later.
4. Enable the camera (tap "Enable Camera" and "Toggle Camera" until your desired one).
5. Mount it with the camera pointing to a white-green chessboard.
6. Ensure the camera sees the entire chessboard in parallel, and is not rotated.
7. Automatic cropping, calibration and normalisation of the camera footage will take over.

While the app detects chess pieces best with uniform lighting, the app can automatically calibrate against shadows spanned completely horizontally, so not to worry about that.

**Understanding the top indicators (left-to-right):**
1. Camera view with auto-crop detection overlay.
2. Auto-cropped output of the camera.
3. Normalised detection. Highlights background colour and piece colours found.
4. Detection interpretation preview:

    | Indicator | Interpretation |
    | --- | --- |
    | 🔴 Red circle | Black chess piece (Black) |
    | 🔵 Blue circle | White chess piece (Beige) |
    | Dark background | Dark chess tile (Green) |
    | Light background | Light chess tile (White) | 
    | Gray background | Chess tile (but detected mix of Green and White) |
    | Orange background | No tile detected |
    | Orange background w/ H | Human hand covers tile completely |
    | Orange outline | Current interpretation is uncertain |

**Important caveats as of writing:**
- Chrome on Android required for toggling flash.
- On iPhone, Safari might be necessary for fullscreen-like functionality using the Hide Toolbar option.

<br/>

### EV3 controller network

Use the legacy [EV3 Lab software](https://education.lego.com/en-us/downloads/retiredproducts/mindstorms-ev3-lab/software) to open the EV3-G code and install it on three separate EV3 bots.

All movements are on repeated LEGO Technic 1x4 geared racks (3743) with 36 tooth double bevel gears (32498).

The default names for the three 'robots' are listed below and should be self-explanatory.

---
#### chess_x_axis

- Movement using *Large Motor B*.
    - Runs in reverse direction (negative power drives movement from column A to column H), offset -80° rotation away from chessboard column A (outside of the board).
- Pickup mechanism on *Large Motor A*.
    - range of motion approx slightly under 90°. Positive rotation to move mechanism down.
- Claw mechanism on *Medium Motor D*.
    - Jammable to close and open positions at 100% power in under 0.2 seconds. Positive rotation for closing.

Run program `x-axis` and wait for calibration confirmation beep. Should rest slightly before column A.

Range of motion available from ***80° motor rotation before column A*** (jammed completely at full power) to ***column H***.

---
#### chess_y_axis

- Movement *Medium Motor C* for left side (next to chessboard column A; clockwise goes from rows 8-1)
- Movement *Medium Motor B* for right side (next to chessboard column H; anticlockwise goes from rows 8-1).

Run program `y-axis` and wait for calibration confirmation beep. Should rest slightly past "row 9", ready to play as black.

Range of motion available from ***row 1*** to ***95° motor rotation past "row 9"*** (i.e. one imaginary row out of chess board, jammed completely).

---
#### chess_reader

- *NXT Light Sensor* at port 3. Mount in less than one piece distance above the screen. Ensure **screen is at full brightness**.

Run program `phone-reader` and ensure successful connection to the two other EV3s. Asynchronously reads screen flashes from phone and interprets as movement.

- Press Center button to calibrate black levels at any time.
- Press Left button to forcibly terminate all pending requests and request movement to top left (1,0) position, then terminate `phone-reader`. Useful in event of corrupted transmission. If this does not work, you'll need to manually terminate all robot programs.
- Press Right button to send an arbitrary request to perform move b7g3 or g7b3 to test movement accuracy. Warning: Only initiate when idle or may cause transmission corruption.

---

<br/>

### Transmission Mechanism Details

Transmission is performed by flashing the information to the EV3 from the phone screen to an NXT light sensor as basic coordinates in three light levels.
- Black: separation gap (`_`)
- Gray : coordinate counter (`X`)
- White: coordinate separator (`|`) (twice as long in transmission time as well)

A flash of `|_X_X_X_X_|_X_X_|_X_X_X_X_|_X_X_X_X_|_` is interpreted as "move piece on (4,2) to (4,4)", starting from bottom right from robots perspective (playing as black), with left+up as positive axes.

The range of values for x-axis is 1-8, and y-axis is 0-8. Note that 1-8 are within the chess board, so values outside of 1-8 are out of the chessboard.

Thus, "move piece on (4,2) to (4,4)" is equivalent to move ***d7d5***.

The above format and translation to d7d5 is considered a single move.
A move consists of 5 coordinate separators, terminates with a separation gap, and has the desired amount of coordinate counters in between.

Transmission information is processed asynchronously, so the robot starts moving as soon as the starting coordinate pair of the first move is received to save time.

Currently, a maximum of two moves in total can be queued asynchronously to allow for captures and castling. Any extra moves result in undefined behaviour.

<br/>

### Piece Detection Details
For each row of horizontal pixels, normalize them in HSL so that the max luminosity must be 100% (implicitly calibrates against brightness, and any horizontal-spanning shadows).

For each 3x3 pixel square tile, group the 9 pixels by similar colours (grouping those where ∆E ≤ 12).

∆E measures the perceived distance between two colours, commonly used for measuring monitor colour accuracy \[[Details](http://zschuessler.github.io/DeltaE/learn)\].

For each unique colour, consider:
- presence of green hue with average luminosity as a dark tile.
- presence of white colour with high luminosity as a light tile.
- presence of orange hue with average luminosity as a white piece.
- presence of dark colour with low luminosity as a black piece.
- presence of ONLY human skin hue as a tile completely blocked by human intervention.

Tie-breakers:
- Chess tile colours are not tie-breaked. If both tile colours are found, they are both considered to be true.
- Chess piece colours are tie-breaked by whichever colour is found more frequently by pixel count in the given square tile.
- Colours already classified as chess tiles won't also be classified as chess pieces.
- Human skin hue is not considered at all if the square tile is already classified as a chess tile or piece.

The exact piece is assumed to be matching a standard chess config, and that the same pieces have been moving since the starting position via legal chess moves.

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
