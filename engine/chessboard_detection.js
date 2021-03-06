//Modified from https://github.com/Elucidation/ChessboardDetect
/*
MIT License

Copyright (c) 2018 Elucidation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
// Contains functions to find centered + aligned chessboards in uploaded images.
function findMax(arr, a, b) {
    // Assumes arr contains positives values.
    var maxVal = -1;
    var maxIdx = 0;
    for (var i = a; i < b; i++) {
        if (arr[i] > maxVal) {
            maxVal = arr[i];
            maxIdx = i;
        }
    }
    return {max: maxVal, idx: maxIdx};
}

// Sum up all the sobelX along rows and sobelY along colummns into 1D vectors.
function squashSobels(pixels) {
    var w = pixels.width;
    var h = pixels.height;
    var d = pixels.data;
    scoreX = new Int32Array(w);
    scoreY = new Int32Array(h);
    buffer = 0; // only use central bit of image
    for (var y=buffer; y<h-buffer; y++) {
        for (var x=buffer; x<w-buffer; x++) {
            var off = (y*w+x)*4;
            scoreX[x] += d[off];
            scoreY[y] += d[off+1]
        }
    }
    return {x:scoreX, y:scoreY}
}

function findLines(squashed) {
    sX = squashed.x; // vertical lines, along x axis, squashed sum.
    sY = squashed.y; // horizontal lines, along y axis.
    // TODO.
}

// Global ids used: resultCanvas, sobelCanvas
function processLoadedImage(img, resultCanvasElement, sobelCanvas, assumeSquare) {
    var ctx = sobelCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Resize the image to a square of size 512 pixels.
    var internalCanvas = document.createElement('canvas'),
        height = 512,
        width = Math.floor((img.width * height) / img.height);
    if (isNaN(width)) width = 512;
    internalCanvas.width = height;
    internalCanvas.height = height;
    var internalCanvasCtx = internalCanvas.getContext('2d')
    internalCanvasCtx.drawImage(img, -(width-height)/2, 0, width, height);
    // we have now done the cropping, change the width value
    width = height;

    // Blur image, then run sobel filters on it.
    // imgData = Filters.getPixels(internalCanvas);
    var d = Filters.filterImage(Filters.gaussianBlur, internalCanvas, 15); // Blur it slightly.
    d = Filters.sobel(d);

    // Visualize sobel image.
    sobelCanvas.width = d.width;
    sobelCanvas.height = d.height;
    ctx.putImageData(d, 0, 0);

    // Get squashed X and Y sobels (by summing along columns and rows respectively).
    squashed = squashSobels(d);
    // Since our image width is forced to 512px, we assume a chessboard is at least half of the image, up to exactly the image
    // This comes out to 32-64 pixels per tile, so we only look for deltas between lines in the range 31-65 pixels.

    // We will non-max supress everything more than 20 pixels away from the strongest lines.

    // Since we also assume that the user has kept the chessboard centered in the image, we can start by looking for the strongest
    // line crossing in the center area, and try and grow out from there.
    var winsize = 30;
    // Find max in center X.
    var ctrX = findMax(squashed.x, Math.floor(width/2)-winsize, Math.floor(width/2)+winsize);
    // Find next max to the right.
    var rightX = findMax(squashed.x, ctrX.idx+31, ctrX.idx+65);

    // Find max in center Y.
    var ctrY = findMax(squashed.y, Math.floor(height/2)-winsize, Math.floor(height/2)+winsize);
    // Find next max to the bottom.
    var botY = findMax(squashed.y, ctrY.idx+31, ctrY.idx+65);

    var deltaX = rightX.idx - ctrX.idx;
    var deltaY = botY.idx - ctrY.idx;

    if (assumeSquare) {
        // Assume that the chessboard is square.
        // This will override the previous deltaX and deltaY values with their average.
        let upper = Math.max(deltaX, deltaY);
        let lower = Math.min(deltaX, deltaY);
        let delta = upper - lower;
        // bias towards upper delta value
        deltaX = deltaY = upper - delta/4;
    }

    // Assumes ctrX.idx is the center, there are 4 to the left and 4 to the right.
    positionsX = Array(9).fill(0).map((e,i)=>(i-4) * deltaX + ctrX.idx);
    positionsY = Array(9).fill(0).map((e,i)=>(i-4) * deltaY + ctrY.idx);


    // Overlay lines onto sobel image.
    ctx.beginPath();
    // X
    for (var i = 0; i < positionsX.length; i++) {
        ctx.moveTo(positionsX[i], positionsY[0]);
        ctx.lineTo(positionsX[i], positionsY[positionsY.length-1]);
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ff0000';
    ctx.stroke();
    ctx.closePath()

    // Y
    ctx.beginPath();
    for (var i = 0; i < positionsY.length; i++) {
        ctx.moveTo(positionsX[0],positionsY[i]);
        ctx.lineTo(positionsX[positionsX.length-1],positionsY[i]);
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00ff00';
    ctx.stroke();

    bbox = {
        tl: {x: positionsX[0], y: positionsY[0]},
        tr: {x: positionsX[positionsX.length-1], y: positionsY[0]},
        br: {x: positionsX[positionsX.length-1], y: positionsY[positionsY.length-1]},
        bl: {x: positionsX[0], y: positionsY[positionsY.length-1]}
    };

    // Border
    ctx.beginPath();
    ctx.moveTo(bbox.tl.x, bbox.tl.y);
    ctx.lineTo(bbox.tr.x, bbox.tr.y);
    ctx.lineTo(bbox.br.x, bbox.br.y);
    ctx.lineTo(bbox.bl.x, bbox.bl.y);
    ctx.lineTo(bbox.tl.x, bbox.tl.y);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffff00';
    ctx.stroke();

    // Build bounded and aligned 24x24 px chessboard to result canvas for prediction.
    resultCanvasElement.width = 24;
    resultCanvasElement.height = 24;
    var resultCtx = resultCanvasElement.getContext('2d');
    resultCtx.imageSmoothingEnabled = false;
    resultCtx.drawImage(internalCanvas,bbox.tl.x,bbox.tl.y, deltaX*8, deltaY*8, 0, 0, 24, 24);

}
