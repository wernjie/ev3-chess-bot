// @ts-check
// Computes weighted RGB average from two RGB colors and a weight
function rgbWeightedAvg(rgbColA, rgbColB, abWeightRatio) {
  if (abWeightRatio === undefined) {
    abWeightRatio = 0.5;
  }
  // obtain squares of values (rgb color is not linear!)
  let rA = rgbColA[0] * rgbColA[0];
  let gA = rgbColA[1] * rgbColA[1];
  let bA = rgbColA[2] * rgbColA[2];
  let rB = rgbColB[0] * rgbColB[0];
  let gB = rgbColB[1] * rgbColB[1];
  let bB = rgbColB[2] * rgbColB[2];
  // compute weighted average
  let r = Math.sqrt((rA * abWeightRatio) + (rB * (1 - abWeightRatio)));
  let g = Math.sqrt((gA * abWeightRatio) + (gB * (1 - abWeightRatio)));
  let b = Math.sqrt((bA * abWeightRatio) + (bB * (1 - abWeightRatio)));
  // return result
  return [r, g, b];
}

// Computes HSL from RGB, https://css-tricks.com/converting-color-spaces-in-javascript/
function rgb2hsl(r,g,b) {
  // Make r, g, and b fractions of 1
  r /= 255;
  g /= 255;
  b /= 255;

  // Find greatest and smallest channel values
  let cmin = Math.min(r,g,b),
    cmax = Math.max(r,g,b),
    delta = cmax - cmin,
    h = 0,
    s = 0,
    l = 0;

  // Calculate hue
  // No difference
  if (delta == 0)
    h = 0;
  // Red is max
  else if (cmax == r)
    h = ((g - b) / delta) % 6;
  // Green is max
  else if (cmax == g)
    h = (b - r) / delta + 2;
  // Blue is max
  else
    h = (r - g) / delta + 4;

  h = Math.round(h * 60);

  // Make negative hues positive behind 360°
  if (h < 0)
    h += 360;

  // Calculate lightness
  l = (cmax + cmin) / 2;

  // Calculate saturation
  s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  // Multiply l and s by 100
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return [h, s, l];
}

/**
 * Convert RGB color to LAB in array, https://gist.github.com/ryancat/44707768f1791a5938c879d85f2dd9ef
 * @param {Array} rgb RGB color in array
 */
function rgb2lab(rgb){
  var r = rgb[0] / 255,
    g = rgb[1] / 255,
    b = rgb[2] / 255,
    x, y, z;

  r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
  z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

  x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

  return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)]
}

function deltaE(rgb1, rgb2) {
  rgb1 = rgb2lab(rgb1);
  rgb2 = rgb2lab(rgb2);
  let dL = (rgb1[0]-rgb2[0]);
  let da = (rgb1[1]-rgb2[1]);
  let db = (rgb1[2]-rgb2[2]);
  return Math.sqrt(dL*dL + da*da + db*db);
}

// input: h in [0,360] and s,v in [0,100] - output: r,g,b in [0,255]
function hsl2rgb(h,s,l)
{
  s /= 100; l /= 100;
  let a= s*Math.min(l,1-l);
  let f= (n,k=(n+h/30)%12) => l - a*Math.max(Math.min(k-3,9-k,1),-1);
  return [f(0)*255,f(8)*255,f(4)*255];
}

//Locates presence of pieces in a 256x256 canvas.
function locateChessPiecesInCanvas(canvas) {
  // @ts-ignore the below is provided by filter.js
  let pixelData = Filters.getPixels(canvas);
  if (pixelData.height != pixelData.width || pixelData.height != 24) {
    //console.log("Invalid pixel data provided: ", pixelData);
    return;
  }

  // Obtain pixels
  let xmap = "87654321";
  let ymap = "abcdefgh";
  let rgbMap = {};
  let hslMap = {};
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      let i = 4*(x*3*24+y*3);
      let sq = ymap[y] + xmap[x];
      if ("123".indexOf(xmap[x]) == -1) {
        //continue;
      }

      let TL = i;
      let T  = i + 4*(1);
      let TR = i + 4*(2);
      let CL = i + 4*(24);
      let C  = i + 4*(1 + 24);
      let CR = i + 4*(2 + 24);
      let BL = i + 4*(24*2);
      let B = i + 4*(1 + 24*2);
      let BR = i + 4*(2 + 24*2);

      try {
        rgbMap[sq] = [TL, T, TR, CL, C, CR, BL, B, BR].map((x) => {
          return [
            +pixelData.data[x],
            +pixelData.data[x+1],
            +pixelData.data[x+2]
          ];
        });
        hslMap[sq] = rgbMap[sq].map((x) => rgb2hsl(x[0], x[1], x[2]));
      } catch (e) {
        console.log(e);
      }
    }
  }

  // Scale luminance to maximise 0-100 horizontally
  for (let x of xmap) {
    // for every tile vertically (1-8)
    for (let inSquareOffset of [0,3,6]) {
      // scale by considering every row of pixels separately
      // in the 3x3 grid
      for (let ymapPart of ["ab", "cd", "ef", "gh"]) {
        // consider for every 2 adjacent tiles horizontally (a-h)

        // scale to max luminance
        let maxLuminanceVal = 0.1;
        for (let y of ymapPart) {
          let sq = y + x;
          for (let i = inSquareOffset; i < inSquareOffset + 3; i++) {
            let hsl = hslMap[sq][i];
            let l = hsl[2];
            if (l > maxLuminanceVal) {
              maxLuminanceVal = l;
            }
          }
        }
        for (let y of ymapPart) {
          let sq = y + x;
          for (let i = inSquareOffset; i < inSquareOffset + 3; i++) {
            let hsl = hslMap[sq][i];
            hsl[2] = hsl[2] / maxLuminanceVal * 100;
            hslMap[sq][i] = hsl;
          }
        }
      }
    }
  }
  // Scale luminance to maximise 0-100 vertically
  for (let y of ymap) {
    // for every tile horizontally (a-h)
    for (let inSquareBeginOffset of [0,1,2]) {
      // scale by considering every column of pixels separately
      // in the 3x3 grid
      for (let xmapPart of ["12", "34", "56", "78"]) {
        // consider for every 2 adjacent tiles horizontally (a-h)

        // scale to max luminance
        let maxLuminanceVal = 0.1;
        for (let x of xmapPart) {
          let sq = y + x;
          for (let i = inSquareBeginOffset; i < 9; i += 3) {
            let hsl = hslMap[sq][i];
            let l = hsl[2];
            if (l > maxLuminanceVal) {
              maxLuminanceVal = l;
            }
          }
        }
        for (let x of xmapPart) {
          let sq = y + x;
          for (let i = inSquareBeginOffset; i < 9; i += 3) {
            let hsl = hslMap[sq][i];
            hsl[2] = hsl[2] / maxLuminanceVal * 100;
            hslMap[sq][i] = hsl;
          }
        }
      }
    }
  }

  // Map to new rgb values
  for (let sq in hslMap) {
    let hslList = hslMap[sq];
    rgbMap[sq] = hslList.map((x) => hsl2rgb(x[0], x[1], x[2]));
  }



  let piecesList = {};
  let tilesList = {};
  let chessTilesValid = 0;
  let humanInterferenceCount = 0;
  let calcDetect = document.getElementById("calcdetect");
  let finalDetect = document.getElementById("finaldetect");
  let str = "";
  let strFin = "";
  for (let x of xmap) {
    str += "<div>";
    strFin += "<div>";
    for (let y of ymap) {
      let sq = y + x;
      let rgbColorGroups = []; // [[[r,g,b], N], [[r,g,b], N], ...]
      for (let i = 0; i < 8; i++) {
        let refRgbColor = rgbMap[sq][i];
        let refHslColor = hslMap[sq][i];
        let inserted = false;
        for (let existingColorGroup of rgbColorGroups) {
          let existingRgbColor = existingColorGroup[0];
          let existingHslColor = rgb2hsl(...existingColorGroup[0]);
          let dE = deltaE(refRgbColor, existingRgbColor);
          if (dE <= 12) {
            existingColorGroup[1]++;
            existingColorGroup[0] = rgbWeightedAvg(existingRgbColor, refRgbColor, 1 - 1/existingColorGroup[1]);
            inserted = true;
            break;
          }
        }
        if (!inserted) {
          rgbColorGroups.push([refRgbColor, 1]);
        }
      }
      rgbColorGroups.sort((a,b) => {
        return b[1] - a[1];
      });

      let hslColorGroups = []; // [[[h,s,l], N], [[h,s,l], N], ...]
      hslColorGroups = rgbColorGroups.map((x) => {
        return [rgb2hsl(...x[0]), x[1]];
      });

      let sum = (array) => array.reduce((a,b) => a + b, 0);

      // -- helper HSL color checks --
      // check blue hue, very low saturation and very high luminance
      let isHslWhiteTile =  (hsl) => ((hsl[0] < 90 || hsl[0] > 140) && hsl[1] < (0.4*Math.abs(hsl[2]-50)+5) && hsl[2] > 70) || ((hsl[0] > 70 || hsl[0] < 30) && hsl[2] > 95);
      // check green hue and relatively high saturation
      let isHslBlackTile =  (hsl) => (hsl[0] > 80 && hsl[0] < 140 && hsl[1] > hsl[2]/2 && hsl[2] > 20 && hsl[2] < 80);
      // check high luminance and orange hue, plus not qualified for tile detection
      let isHslWhitePiece = (hsl) => (
        (hsl[0] > 20 && hsl[0] < 80 && hsl[1] > 10 && hsl[2] > 30) &&
        !isHslBlackTile(hsl) && !isHslWhiteTile(hsl)
      )
      // check low luminance and saturation, plus not qualified for tile detection
      let isHslBlackPiece = (hsl) => (
        ((hsl[1] < hsl[2]/3 && hsl[2] < 30) || (hsl[1] < 35 && hsl[2] < 25) || hsl[2] < 15) &&
        !isHslBlackTile(hsl) && !isHslWhiteTile(hsl)
      )

      // states of the tile

      let isWhiteTile = hslColorGroups.some((x) => isHslWhiteTile(x[0]));
      let isBlackTile = hslColorGroups.some((x) => isHslBlackTile(x[0]));
      let isUnknownTile = isWhiteTile && isBlackTile;
      if (isUnknownTile) isWhiteTile = isBlackTile = false;

      let isBlackPiece = (hslColorGroups.length > 1) && sum(hslColorGroups.filter((x) => isHslBlackPiece(x[0])).map((x) => x[1]));
      let isWhitePiece = (hslColorGroups.length > 1) && sum(hslColorGroups.filter((x) => isHslWhitePiece(x[0])).map((x) => x[1]));

      if (isBlackPiece && isWhitePiece) {
        if (isBlackPiece > isWhitePiece) {
          isWhitePiece = false;
        } else {
          isBlackPiece = false;
        }
      }
      isBlackPiece = !!isBlackPiece;
      isWhitePiece = !!isWhitePiece;

      let nonTile = !isBlackTile && !isWhiteTile && !isUnknownTile;
      let nonPiece = !isBlackPiece && !isWhitePiece;

      let hasNonFatalInterference = nonTile || (nonPiece && rgbColorGroups.length > 1);
      let hasHumanInterference = nonTile && (nonPiece || isWhitePiece) && hslColorGroups.length <= 2 && hslColorGroups.filter((x) => {
        // Skin colour detection in HSV color space:
        // > The skin in channel H is characterized by values between 0 and 50, in the channel S from 0.23 to 0.68 for Asian and Caucasian ethnics.
        // We use this approximatly in HSL - this should be decent enough.
        //
        // Source: http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.573.9432&rep=rep1&type=pdf
        let hsl = x[0];
        return hsl[0] <= 50 && hsl[1] > 20 && hsl[1] < 70 && hsl[2] > 10 && hsl[2] < 70;
      }).length === hslColorGroups.length;


      // quick access to colors
      let pieceColors = rgbColorGroups.filter((x) => {
        let hsl = rgb2hsl(...x[0]);
        return (isBlackPiece && isHslBlackPiece(hsl)) || (isWhitePiece && isHslWhitePiece(hsl))
      });
      let tileColors = rgbColorGroups.filter((x) => {
        let hsl = rgb2hsl(...x[0]);
        return (isBlackTile && isHslBlackTile(hsl)) || (isWhiteTile && isHslWhiteTile(hsl))
      });
      let mostDominantPieceColor = pieceColors.length > 0 ? pieceColors[0][0] : null;
      let mostDominantTileColor = tileColors.length > 0 ? tileColors[0][0] : null;

      let mostDominantRGB = rgbColorGroups[0][0];
      let leastDominantRGB = rgbColorGroups[Math.min(1, rgbColorGroups.length-1)][0];

      //Display contents
      let p1pieceHighlightHint = (isWhitePiece ? "#33d" : (isBlackPiece ? "red" : null));
      let p1borderPieceColor = "1px solid " + (p1pieceHighlightHint || "transparent");
      let p2fontColor = "#0c0";
      let p2bgTileColor = (isUnknownTile ? "#999" : (isWhiteTile ? "white" : (isBlackTile ? "black": "#870")));
      let p2borderTileColor = !isUnknownTile && (nonTile || hasNonFatalInterference) ? "1px solid orange" : (
        "1px solid " + (isWhiteTile ? "white" : (isBlackTile ? "black" : "#ccc"))
      );

      let rgb2ColStr = (rgb) => {
        return "rgb(" + rgb.join(",") + ")";
      };
      ((fgVal, bgVal) => {
        str += "<span style='color: "+fgVal+"; background-color: "+bgVal+"; border: " + p1borderPieceColor + ";'>" + y + x + "</span>";
      })(rgb2ColStr(mostDominantPieceColor || leastDominantRGB), rgb2ColStr(mostDominantTileColor || mostDominantRGB));

      let descriptorSubtext = rgbColorGroups.length > (1 + +!nonPiece) ? rgbColorGroups.length : "✓";
      let label = (isWhitePiece ? "🔵" : (isBlackPiece ? "🔴" : "")) + "<sup>" + descriptorSubtext + "</sup>";

      if (hasHumanInterference) {
        label = "H"
        p2fontColor = "white";
        p2bgTileColor = "orange";
        p2borderTileColor = "1px solid orange";
        humanInterferenceCount++;
      }

      strFin += "<span style='color: " + p2fontColor  + "; background-color: " + p2bgTileColor + "; border: "+p2borderTileColor+";'>" + label + "</span>"

      //Track piece position and valid tiles
      if (isWhitePiece) {
        piecesList[y+x] = "W";
      } else if (isBlackPiece) {
        piecesList[y+x] = "B";
      }
      if (hasHumanInterference) {
        tilesList[y+x] = "H";
      } else if (isUnknownTile) {
        tilesList[y+x] = "X"
      } else if (isWhiteTile) {
        tilesList[y+x] = "W"
      } else if (isBlackTile) {
        tilesList[y+x] = "B"
      }

      if ("aceg".indexOf(y) != -1) {
        if (+x % 2 == 0 && isWhiteTile || isUnknownTile) {
          chessTilesValid++;
        } else if (+x % 2 == 1 && isBlackTile || isUnknownTile) {
          chessTilesValid++;
        }
      } else {
        if (+x % 2 == 0 && isBlackTile || isUnknownTile) {
          chessTilesValid++;
        } else if (+x % 2 == 1 && isWhiteTile || isUnknownTile) {
          chessTilesValid++;
        }
      }
    }
    str += "</div>"
    strFin += "</div>"
  }
  calcDetect.innerHTML = str;
  finalDetect.innerHTML = strFin;

  // compute alignment suggestions
  let suggestion = undefined;
  let unknownTL = 0;
  let unknownTR = 0;
  let unknownBL = 0;
  let unknownBR = 0;
  let unknownL = 0;
  let unknownR = 0;
  let unknownT = 0;
  let unknownB = 0;
  let centerTilesUnknown = 0;
  for (let x of xmap) {
    for (let y of ymap) {
      let sq = y + x;
      if (tilesList[sq] != "X") continue;
      if (y == "a") unknownL++;
      if (y == "h") unknownR++;
      if (x == "8") unknownT++;
      if (x == "1") unknownB++;
      if ("abc".indexOf(y) != -1) {
        if (+x <= 3) {
          unknownBL++;
        } else if (+x >= 6) {
          unknownTL++;
        }
      } else if ("fgh".indexOf(y) != -1) {
        if (+x <= 4) {
          unknownBR++;
        } else if (+x >= 6) {
          unknownTR++;
        }
      }
      if (+x >= 3 && +x <= 6 && "cdef".indexOf(y) != -1) {
        centerTilesUnknown++;
      }
    }
  }
  let unknownMinorCornerBits = +(unknownTL >= 1)*0b1000 + +(unknownTR >= 1)*0b100 + +(unknownBR >= 1)*0b10 + +(unknownBL >= 1)*1
  let unknownMajorCornerBits = +(unknownTL >= 4)*0b1000 + +(unknownTR >= 4)*0b100 + +(unknownBR >= 4)*0b10 + +(unknownBL >= 4)*1
  let unknownSideBits   = +(unknownL  >= 5)*0b1000 + +(unknownT  >= 5)*0b100 + +(unknownR  >= 5)*0b10 + +(unknownB  >= 5)*1
  if (chessTilesValid > 50) {
    if (centerTilesUnknown > 4) {
      suggestion = "Chessboard detection may be faulty"
    } else if ((unknownMinorCornerBits ^ 0b1111) == 0 || unknownMajorCornerBits) {
      suggestion = "Chessboard appears rotated/tilted\nPlease adjust camera angle"
    } else if ((unknownSideBits ^ 0b1000) == 0) {
      suggestion = "Chessboard cropped at left side\nPlease shift camera left"
    } else if ((unknownSideBits ^ 0b0100) == 0) {
      suggestion = "Chessboard cropped at top side\nPlease shift camera upwards"
    } else if ((unknownSideBits ^ 0b0010) == 0) {
      suggestion = "Chessboard cropped at right side\nPlease shift camera right"
    } else if ((unknownSideBits ^ 0b0001) == 0) {
      suggestion = "Chessboard cropped at bottom side\nPlease shift camera downwards"
    } else if (unknownSideBits) {
      suggestion = "Chessboard is not aligned\nPlease adjust camera"
    }
  }

  return {board: piecesList, tiles: tilesList, validFraction: chessTilesValid/64, hasAdjustmentSuggestion: suggestion, hasHumanInterference: humanInterferenceCount > 0};
}
