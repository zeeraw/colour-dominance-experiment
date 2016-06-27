"use strict"

import gulp from "gulp"
import gulpLoadPlugins from "gulp-load-plugins"
import del from "del"

let gp = gulpLoadPlugins({
  pattern: ["gulp-*", "imagemin-*", "webpack-*"],
  replaceString: /^gulp-|^imagemin-|-stream$/,
  camelize: true,
  lazy: true
})

const IMAGEMIN_OPTS = {
  optimizationLevel: 2,
  interlaced: true,
  multipass: true,
  use:[
    gp.mozjpeg({ quality: 75, dcScanOpt: 2, smooth: 15 }),
    gp.pngquant({ quality: 50-65, speed: 9 })
  ]
}

const SASS_OPTS = {
  sourceComments: true,
  outputStyle: "compact"
}

const WEBPACK_OPTS = {
  target:"web",
  devtool: "inline-source-map",
  output: {
    filename: "[name].js",
    pathinfo: true,
    comments: false
  },
  module: {
    loaders: [ {
      loader: "babel-loader",
      test: /\.(jsx?|es6?)$/,
      exclude: /(node_modules)/,
      query: {
        cacheDirectory: true,
        presets: ["es2015"],
      }
    } ],
    cache: true
  },
  resolve: {
      modulesDirectories: [
        "node_modules/",
        "src/",
      ]
  }
}

const PATHS = {
  js: ["src/main.es6"],
  css: ["src/style.scss"],
  img: ["images/**"],
}

gulp.task("clean", ()=> {
  return del(["dist"])
})

gulp.task("img", ()=> {
  return gulp.src(PATHS.img)
    .pipe(gp.cached("images", { optimizeMemory: true }))
    .pipe(gp.imagemin(IMAGEMIN_OPTS))
    .pipe(gulp.dest("dist/img"))
})

gulp.task("js", ()=> {
  return gulp.src(PATHS.js)
    .pipe(gp.webpack(WEBPACK_OPTS).on("error", ()=> { pipe.end() }))
    .pipe(gp.sourcemaps.init())
    .pipe(gp.uglify())
    .pipe(gp.sourcemaps.write())
    .pipe(gp.rename({ extname: ".js" }))
    .pipe(gulp.dest("dist"))
    .pipe(gp.livereload())
})

gulp.task("css", ()=> {
  return gulp.src(PATHS.css)
    .pipe(gp.sourcemaps.init())
    .pipe(gp.sass(SASS_OPTS))
    .pipe(gp.csso())
    .pipe(gp.sourcemaps.write())
    .pipe(gp.rename({ extname: ".css" }))
    .pipe(gulp.dest("dist"))
    .pipe(gp.livereload())
})

gulp.task("watch", ()=> {
  gp.livereload.listen()
  gulp.watch(PATHS.js, ["js"]);
  gulp.watch(PATHS.css, ["css"]);
})

gulp.task("default", ["watch", "clean", "js", "css", "img"])
