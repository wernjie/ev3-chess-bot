# ev3-chess-bot

Chess Bot Client Webapp to interface intepreted camera and Stockfish results with EV3.

Message-passing done via flashing the screen and using an NXT light sensor to recognise the data.

## Installation and Usage

### Chess Engine and Message Passing

[wernjie.github.io/ev3-chess-bot/engine](https://wernjie.github.io/ev3-chess-bot/engine/)

Run the webapp on a phone in landscape mode. Initiate full screen mode if possible.

You may calibrate an empty chessboard by tapping **Calibrate Detection** and mounting the phone in the
same position and lighting conditions as you would be planning to permanently mount it for chess
piece movement detection. This ensures highest possible accuracy.

If possible, utilise uniform lighting or phone torch (only supported using Chrome on Android).

Please ensure screen is at **full brightness** for best detection performance by the *chess_reader* EV3.

Important caveats:
- Safari required for camera access if you're on an iPhone.
- Chrome on Android required for toggling flash as of writing.

### EV3 controller network

Use the legacy [EV3 Lab software](https://education.lego.com/en-us/downloads/retiredproducts/mindstorms-ev3-lab/software) to open the EV3-G code and install it on three separate EV3 bots.

All movements are on repeated 1x4 geared racks (3743) with 36 tooth double bevel gears (32498).

The default names for the three 'robots' are listed below and should be self-explanatory.

---
#### chess_x_axis

- Movement using *Large Motor B*.
    - Runs in reverse direction (negative power drives movement from column A to column H), offset -75° rotation away from chessboard column A (outside of the board).
- Pickup mechanism on *Large Motor A*.
    - range of motion approx slightly under 90°. Positive movement to move mechanism down.
- Claw mechanism on *Medium Motor D*.
    - Jammable to close and open positions at 100% power in under 0.2 seconds. Positive movement for closing.

Run program `x-axis` and wait for calibration confirmation beep. Should rest slightly before column A.

Range of motion available from *75° motor rotation before column A* (jammed completely) to *column H*.

#### chess_y_axis

- Movement *Medium Motor C* for left side (next to chessboard column A).
- Movement *Medium Motor B* for right side (next to chessboard column H).

Run program `y-axis` and wait for calibration confirmation beep. Should rest slightly past "row 9", ready to play as black.

Range of motion available from *row 1* to *135° motor rotation past "row 9"* (out of chess board, jammed completely).

#### chess_reader

- *NXT Light Sensor* at port 3. Mount in less than one piece distance above the screen. Ensure **screen is at full brightness**.

Run program `phone reader` and ensure successful connection to the two other EV3s. Asyncrhonously reads screen flashes from phone and interprets as movement.

- Press Center button to calibrate black levels at any time.
- Press Left button to forcibly terminate all pending requests and request movement to top left (1,0) position, then terminate `phone_reader`. Useful in event of corrupted transmission.
- Press Right button to send an arbitrary request to move a chess piece from (2,2) to (7,6) aka b7g3 to test movement accuracy. Only initiate when idle or may cause transmission corruption.
---

#### EV3 Bluetooth Failure Debugging Notes
- EV3 cannot simultaneously establish a connection to a computer and one or more EV3 at the same time.
    - Ensure EV3 is not actively connected to a computer to allow connections to other EV3(s).
    - Ensure EV3 is not actively connected to other EV3(s) to allow connections to a computer.
    - Pressing the back button on your EV3 while it is attempting a bluetooth connection, performing a bluetooth search etc., has a high chance of crashing the internal EV3 bluetooth driver.
    - Closing an EV3 running program does not terminate connections to other EV3(s). Ensure to disconnect from settings if you want to connect to a computer.
    - Pressing the disconnect EV3 button on your computer does NOT guarantee that the EV3 is disconnected from your computer. Ensure to check EV3 as well.
    - The program has automatic workarounds to determine whether a connection failure occured. However, it may not detect a bluetooth driver failure.
- In the event of an immediate program termination with a system error, the internal EV3 bluetooth driver likely crashed.
    - Restart the EV3 to resolve.
