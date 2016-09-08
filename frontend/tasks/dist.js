const gulp = require('gulp');
const config = require('../config.js');

const connect = require('gulp-connect');
const runSequence = require('run-sequence');
const RevAll = require('gulp-rev-all');

gulp.task('dist-rev-assets', function() {
  const revAll = new RevAll({
    dontRenameFile: [
      '.json',
      'favicon.ico',
      /static\/addon\/*/,
      /static\/locales\/*/,
      '.html'
    ],
    dontUpdateReference: [
      /static\/addon\/*/,
      /.*\.json/,
      'favicon.ico'
    ]
  });
  return gulp.src(config.DEST_PATH + '**')
    .pipe(revAll.revision())
    .pipe(gulp.dest(config.DIST_PATH));
});

gulp.task('dist-build', done =>
  runSequence('clean', 'build', 'dist-rev-assets', done));

gulp.task('dist-watch', ['watch'], () =>
  gulp.watch(config.DEST_PATH + '**/*', ['dist-rev-assets']));

gulp.task('dist-server', () => connect.server({
  root: config.DIST_PATH,
  livereload: false,
  host: '0.0.0.0',
  port: config.SERVER_PORT
}));

gulp.task('dist', ['dist-build', 'dist-watch', 'dist-server']);
