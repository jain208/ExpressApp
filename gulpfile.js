var gulp = require('gulp');
var path = require('path');
var minify = require('gulp-minify-css');
var $gulp = require('gulp-load-plugins')({
    lazy: false
});
var protractor = require("gulp-protractor").protractor;
var templateCache = require('gulp-angular-templatecache');
var server = require('gulp-develop-server');
var ngAnnotate = require('gulp-ng-annotate');

var prependBowerPath = function (packageName) {
    return path.join('./client/bower_components/', packageName);
};

var vendors = ['angular/angular.js',
               'angular-ui-router/release/angular-ui-router.js',
               'angular-cookies/angular-cookies.js']
               .map(prependBowerPath);

var appScripts = ['client/app/**/*.js'];

gulp.task('clean', ['clean:js', 'clean:css']);

gulp.task('jshint', function () {
    return gulp.src(['client/app/**/*.js', 'tests/**/*.js'])
        .pipe($gulp.jshint())
        .pipe($gulp.jshint.reporter('default'));

});


gulp.task('set-env:test', function () {
    return $gulp.env({
        vars: {
            NODE_ENV: 'test'
        }
    });
});

gulp.task('karma', ['set-env:test'], function() {
    // Be sure to return the stream
    return gulp.src([
        'client/bower_components/angular/angular.js',
        'client/bower_components/angular-mocks/angular-mocks.js',
        'client/bower_components/angular-ui-router/release/angular-ui-router.js',
        'client/bower_components/angular-cookies/angular-cookies.js',
        'client/app/**/*.js',
        'tests/unit/**/*.js'
    ])
        .pipe($gulp.using())
        .pipe($gulp.karma({
            configFile: 'karma.conf.js',
            action: 'watch'
        }))
        .on('error', function(err) {
            // Make sure failed tests cause gulp to exit non-zero
            throw err;
        });
});

gulp.task('protractor', function () {
    server.listen({path: 'index.js'});
    return gulp.src(["./tests/e2e/**/*e2e.spec.js"])
        .pipe(protractor({
            configFile: "protractor.config.js"
        }))
        .on('error', $gulp.util.log);
});

gulp.task('test:server', ['set-env:test'], function() {
    "use strict";
    return gulp.src('tests/server/**/*.spec.js', {read: false})
        .pipe($gulp.mocha({reporter: 'spec'}))
        .on('error', $gulp.util.log);
});

gulp.task('test:server:watch', function() {
    "use strict";
    gulp.start('test:server');
    gulp.watch([ 'index.js', 'server/**/*.js', 'tests/server/**/*spec.js'], ['test:server']);
});

gulp.task('tests', ['karma', 'test:server:watch']);

gulp.task('clean:js', function () {
    return gulp.src(['./build/js'], {read: false})
        .pipe($gulp.rimraf());
});
gulp.task('clean:css', function () {
    return gulp.src(['./build/css'], {read: false})
        .pipe($gulp.rimraf());
});

gulp.task('css', ['clean:css'], function () {
    return gulp.src(['client/app/styles/app.less'])
        .pipe($gulp.less())
        .pipe($gulp.autoprefixer())
        .pipe(minify())
        .pipe($gulp.rev())
        .pipe(gulp.dest('build/css/'))
        .pipe($gulp.size({showFiles: true}));
});

gulp.task('vendors', ['clean:js'], function () {
    return gulp.src(vendors)
        .pipe($gulp.uglify())
        .pipe($gulp.concat('vendors.min.js'))
        .pipe($gulp.rev())
        .pipe(gulp.dest('build/js/'))
        .pipe($gulp.size({showFiles: true}));
});

gulp.task('js', ['clean:js', 'jshint'], function () {
    return gulp.src(appScripts)
        .pipe(ngAnnotate())
        .pipe($gulp.uglify())
        .pipe($gulp.concat('app.min.js'))
        .pipe($gulp.rev())

        .pipe(gulp.dest('build/js/'))
        .pipe($gulp.size({showFiles: true}));
});

gulp.task('templates', ['clean:js'], function () {
    return gulp.src('client/app/**/*.html')
        .pipe(templateCache({ module: 'HousePointsApp' }))
        .pipe(ngAnnotate())
        .pipe($gulp.uglify())
        .pipe($gulp.rev())
        .pipe(gulp.dest('build/js'));
});


gulp.task('server:start', ['build'], function() {
    "use strict";
    server.listen({path: 'index.js'}, $gulp.livereload.listen);
});

// restart server if app.js changed
gulp.task('watch', function () {
    gulp.watch([ 'index.js', 'server/**/*.js', 'client/app/**/*', 'client/index.html' ], ['server:restart']);
});

// restart server if app.js changed
gulp.task('server:restart', ['build'], function () {
    function restart() {
        server.changed( function( error ) {
            if( ! error ) $gulp.livereload.changed();
        });
    }
    restart();
});

gulp.task('html', ['css', 'vendors', 'js', 'templates'], function () {
    return gulp.src('./client/index.html')
        .pipe($gulp.inject(gulp.src(['./build/css/app*'], { read: false }), {
            addRootSlash: false,
            ignorePath: 'build'
        }))
        .pipe($gulp.inject(gulp.src(['./build/js/vendors*'], { read: false }), {
            addRootSlash: false,
            ignorePath: 'build', name: 'vendors'
        }))
        .pipe($gulp.inject(gulp.src(['./build/js/templates*'], { read: false }), {
            addRootSlash: false,
            ignorePath: 'build', name: 'templates'
        }))
        .pipe($gulp.inject(gulp.src(['./build/js/app*'], { read: false }), {
            addRootSlash: false,
            ignorePath: 'build', name: 'app'
        }))
        .pipe($gulp.htmlmin({collapseWhitespace: true, removeComments: true }))
        .pipe(gulp.dest('./build/'))
        .pipe($gulp.size({showFiles: true}));
});

gulp.task('build', ['html']);

gulp.task('default', ['build', 'server:start', 'watch']);