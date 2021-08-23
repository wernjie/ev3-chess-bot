//Computes HSL from RGB, https://css-tricks.com/converting-color-spaces-in-javascript/
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

// input: h in [0,360] and s,v in [0,255] - output: r,g,b in [0,255]
function hslTrgb(h,s,l)
{
  s /= 255; l /= 255;
  let a= s*Math.min(l,1-l);
  let f= (n,k=(n+h/30)%12) => l - a*Math.max(Math.min(k-3,9-k,1),-1);
  return [f(0)*255,f(8)*255,f(4)*255];
}

//Locates presence of pieces in a 256x256 canvas.
function locateChessPiecesInCanvas(canvas) {
    let pixelData = Filters.getPixels(canvas);
    if (pixelData.height != pixelData.width || pixelData.height != 24) {
        //console.log("Invalid pixel data provided: ", pixelData);
        return;
    }


    let xmap = "87654321";
    let ymap = "abcdefgh";
    let rgbMap = {};
    let hslCenterMap = {};
    let hslSideMap = {};
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
                rgbMap[sq] = [TL, T, TR, CL, C, CR, BL, B, BR].map((x) => {return [pixelData.data[x], pixelData.data[x+1], pixelData.data[x+2]]});

                let r = pixelData.data[C];
                let g = pixelData.data[C+1];
                let b = pixelData.data[C+2];
                let hsl = rgb2hsl(r,g,b);

                let tmpR = 0;
                let tmpG = 0;
                let tmpB = 0;
                let j;

                if (y <= 3 && x <= 3) { j = BR; }
                if (y >= 4 && x <= 3) { j = BL; }
                if (y <= 3 && x >= 4) { j = TR; }
                if (y >= 4 && x >= 4) { j = TL; }

                tmpR += pixelData.data[j];
                tmpG += pixelData.data[j+1];
                tmpB += pixelData.data[j+2];
                let hsl_outer = rgb2hsl(tmpR, tmpG, tmpB);

                hslCenterMap[sq] = hsl;
                hslSideMap[sq] = hsl_outer;

            } catch (e) {
                console.log(e);
            }
            
        }
    }


    let calcDetect = document.getElementById("calcdetect");
    let finalDetect = document.getElementById("finaldetect");
    let str = "";
    let strFin = "";
    for (let x of xmap) {
        str += "<div>";
        strFin += "<div>";
        for (let y of ymap) {
            let h = hslCenterMap[y+x][0];
            let s = 255//satMap[y+x];
            let l = Math.min(255,hslCenterMap[y+x][2]*2.0);
            let rgb = hslTrgb(h,s,l);

            let hT = hslSideMap[y+x][0];
            let sT = 255//satMap[y+x];
            let lT = Math.min(255,hslSideMap[y+x][2]*2.0);
            let rgb2 = hslTrgb(hT,sT,lT);

            let isWhiteTile = lT >= 100;
            let isBlackTile = lT < 100;

            let isWhitePiece = l >= 90 || (Math.abs(l-lT) > 10 && l > 50);
            let isBlackPiece = isBlackTile ? (l < 25) : (l < 75);

            if (Math.abs(h-hT) < 5 && Math.abs(l-lT) < 20 && isWhiteTile) {
                isWhitePiece = false;
            }
            if ((Math.abs(l-lT) < 5) && isBlackTile) {
                isBlackPiece = false;
            }

            let diff = 0;
            let rgbList = rgbMap[y+x];
            for (var i = 0; i < rgbList.length; i++) {
                let dE = deltaE(rgbList[i], rgbList[(i+1) % rgbList.length]);
                diff += dE;
            }
            diff /= rgbList.length;
            if (diff <= 5) {isWhitePiece = false; isBlackPiece = false;}

            let border = isWhitePiece ? "1px solid white;" : (isBlackPiece ? "1px solid green;" : "1px solid transparent;");

            str += "<span style='color: rgb("+rgb[0]+","+rgb[1]+","+rgb[2]+"); background-color: rgb("+rgb2[0]+","+rgb2[1]+","+rgb2[2]+"); border: " + border + ";'>" + y + x + "</span>";

            let label = (isWhitePiece ? "W" : (isBlackPiece ? "B" : "")) + "<sup>" + Math.round(diff) + "</sup>";

            strFin += "<span style='color: gray; background-color: " + (isWhiteTile ? "white" : (isBlackTile ? "black": "gray")) + "; border: 1px solid transparent;'>" + label + "</span>";


        }
        str += "</div>"
        strFin += "</div>"
    }
    calcDetect.innerHTML = str;
    finalDetect.innerHTML = strFin;
}
