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

// input: h in [0,360] and s,v in [0,255] - output: r,g,b in [0,255]
function hsl2rgb(h,s,l)
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
    let hueMap = {};
    let satMap = {};
    let lumMap = {};
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            let i = 4*(x*3*24+y*3);
            let sq = ymap[y] + xmap[x];
            if ("123".indexOf(xmap[x]) == -1) {
                //continue;
            }

            hueMap[sq] = [];
            satMap[sq] = [];
            lumMap[sq] = [];

            let C = i + 4*(+ 1 + 24);
            let TL = i;
            let TR = i + 4*(2)
            let BL = i + 4*(24*2);
            let BR = i + 4*(2 + 24*2);

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


            hueMap[sq] = [hsl[0], hsl_outer[0]];
            satMap[sq] = [hsl[1], hsl_outer[1]];
            lumMap[sq] = [hsl[2], hsl_outer[2]];

        }
    }

    //console.log(hueMap, satMap, lumMap);

    let calcDetect = document.getElementById("calcdetect");
    let finalDetect = document.getElementById("finaldetect");
    let str = "";
    let strFin = "";
    for (let x of xmap) {
        str += "<div>";
        strFin += "<div>";
        for (let y of ymap) {
            let h = hueMap[y+x][0];
            let s = 255//satMap[y+x][0];
            let l = Math.min(255,lumMap[y+x][0]*2.0);
            let rgb = hsl2rgb(h,s,l);

            let h2 = hueMap[y+x][1];
            let s2 = 255//satMap[y+x][1];
            let l2 = Math.min(255,lumMap[y+x][1]*2.0);
            let rgb2 = hsl2rgb(h2,s2,l2);

            let THRESHOLD = 60
            let isWhitePiece = l >= THRESHOLD;
            let isBlackPiece = l < THRESHOLD;
            let isWhiteTile = l2 >= THRESHOLD;
            let isBlackTile = l2 < THRESHOLD;
            if (Math.abs(h-h2) < 5 && Math.abs(l-l2) < 20 && isWhiteTile) {
                isWhitePiece = false;
            }
            if ((l>=l2 || Math.abs(l-l2) < 5) && Math.abs(s-s2) < 10 && isBlackTile) {
                isBlackPiece = false;
            }

            let border = isWhitePiece ? "1px solid white;" : (isBlackPiece ? "1px solid white;" : "1px solid transparent;");

            str += "<span style='color: rgb("+rgb[0]+","+rgb[1]+","+rgb[2]+"); background-color: rgb("+rgb2[0]+","+rgb2[1]+","+rgb2[2]+"); border: " + border + ";'>" + y + x + "</span>";


            strFin += "<span style='color: gray; background-color: " + (isWhiteTile ? "white" : (isBlackTile ? "black": "none")) + "; border: 1px solid transparent;'>" + (isWhitePiece ? "W" : (isBlackPiece ? "B" : "")) + "</span>";


        }
        str += "</div>"
        strFin += "</div>"
    }
    calcDetect.innerHTML = str;
    finalDetect.innerHTML = strFin;
}
