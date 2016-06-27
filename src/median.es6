function deriveMedianColor(data) {
  let length = data.data.length

  let i = -4
  let rgb = {r:0,g:0,b:0}
  let blockSize = 5
  let count = 0

  while ((i += blockSize * 4) < length) {
    ++count
    rgb.r += data.data[i]
    rgb.g += data.data[i+1]
    rgb.b += data.data[i+2]
  }

  rgb.r = ~~(rgb.r/count)
  rgb.g = ~~(rgb.g/count)
  rgb.b = ~~(rgb.b/count)

  return rgb;
}
