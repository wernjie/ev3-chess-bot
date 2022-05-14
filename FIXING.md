# Disaster Recovery Plan

How to resolve common issues.

---
## Chess Engine Webapp

### A1. Chessboard detection warped/disrupted

Observe the cropped output from the camera and the engine's final detection results to diagnose the issue.

This may not be fatal as the app can try to auto-compensate for them. However, it is not perfect, and if you encounter problems A2-A5, you may have to resolve this issue.

**Symptom:**
| Cropped Output | Engine Interpretation | Problem | Resolution |
| --- | --- | --- | --- |
| | | Chessboard cannot be cropped correctly as it is rotated (notice corner(s) have tiles not correctly aligned) | Rotate the chessboard slightly until you get a fix (in this case, rotate camera counterclockwise) |
| | | Chessboard is cropped too far in (notice the bottom row of tiles being shrunken to smaller than a 3x3 pixel square) | Move camera slightly "towards" the area that's cropped off (in this case, move camera downwards) |
| | | Chessboard is cropped too far out (notice a line of non-chessboard pixels spanning through the right edge) | Move camera slightly "away" from the error (in this case, move camera left) |

In some cases, any of the above symptoms can also appear if the phone screen (and thus camera) is not parallel to the chessboard surface. Ensure that is the case before checking for other issues.

### A2. "Chessboard Interference Detected" or "Chessboard blocked"

If occuring occasionally:
- Ensure nobody has their hand in front of the camera.
- Ensure nobody is disrupting the view with shadows.

If fluctuating or displayed persistently:
- Ensure chessboard detection is not warped or disrupted (see point A1).

### A3. Piece(s) NOT detected or is detected of the wrong colour

- Ensure the piece is in the square. If it already is, ensure it is in the centre.
- Ensure chessboard detection is not warped or disrupted (see point A1).

### A4. Ghost piece(s) detected

Singular ghost piece:
- Ensure neighbouring pieces are not too close to the edge of the square.
- Ensure chessboard detection is not warped or disrupted (see point A1).

Multiple ghost pieces:
- Ensure chessboard detection is not warped or disrupted (see point A1).

### A5. "Chessboard not in view"

- Ensure chessboard is correctly aligned and visible in the **centre** of the camera.
- Ensure chessboard is oriented such that the **`a1` corner** is positioned at the **bottom left**.
- Ensure chessboard detection is not warped or disrupted (see point A1).

### A6: "Camera is OFF"

- Enable the camera by tapping 'Enable Camera'. Ensure you have granted permissions.

### A7: "Please match start position"

- Match the start position to the one shown on the diagram in the bottom left. Note: Start position ≠ Position of the start of a new chess game. It may be a resumption of a previous game.

If you are certain the start position has been matched:
- Ensure the phone is in the correct landscape orientation (screen should be oriented such that the human player can read it, and the camera sees the board from white's perspective).
- Check for extra, missing or wrong piece detections, then see point A3 or A4.

### A8: "AI moving, do not interfere"

- Ensure that the webapp sees the AI's move completed successfully before the player makes a move. This means waiting for the robot to fully back up.

If the EV3s have finished their move:
- Ensure it's correct by matching the diagram shown on the bottom left. If not, you'll need to correct it manually.
- Ensure the player has not made the next move. If so, you'll have to first undo the move, let the webapp proceed till it says "Waiting for player move" before redoing the move.

---
## EV3 Program

### B1. Claw not raised on Program Start

The claw is jammed.

- Help the robot raise the claw, hold it, then start the program. The robot should now be able to automatically lock it up.

### B2. X-axis or Y-axis Motor Jammed mid-move

If it's X-axis jammed at h-column:

- Nudge the robot to allow the wheel to slip slightly. There's only about 5-10 degrees of movement left but it got stuck.

All other cases:

- The robot is likely unrecoverable due to EV3 imprecision. **Restart ALL 3 robot programs.**

### B3. Does not detect flash transmission

- Ensure you have done your first-time screen-black-level calibration.
- Ensure screen is at maximum brightness.

### B4. "Error: Increase screen brightness to maximum"

If this occurs, you must **stop ALL programs**, ensure the following, then **restart ALL 3 programs**:

- Ensure screen is at maximum brightness.
- Ensure colour sensor is within less than a lego technic piece distance away from the screen.

### B5. Bluetooth Failure

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
