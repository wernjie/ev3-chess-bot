# Technical Implementation Details

## Piece Detection
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

## Transmission Mechanism

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

To confirm that the robot has performed the expected move, the AI must be able to see the whole board before allowing the user to perform the next move.
This has the consequence of requiring the robot to stop completely before the player may move.

<br/>

## EV3 Transmission Reading and Movements

Movements are coded in EV3-G. Three EV3 bricks communicate like so so:

`phone-reader` -> (`x-axis`, `y-axis`)

The reading of the transmission flashes is asynchronous, and will instantly transmit info to the two axes when possible.
Due to slow sensor response times, each flash requires a minimum amount of time to be read. This is mitigated by the
asynchronous transmission processing, as the chess movements itself are much slower than the transmission speeds.

All movements are done at ~100% large motor speeds (and about ~50% medium motor speeds which are approximately equal)
with decent acceleration and deceleration to prevent jerks, and re-synchronisation.\*

\*Re-synchronisation is based on detected degrees. However, EV3 is known to be occasionally unreliable in this aspect.

<br/>

