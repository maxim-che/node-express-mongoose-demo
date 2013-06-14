/**
 * Module dependencies.
 */

var express = require('express')
  , mongoStore = require('connect-mongo')(express)
  , flash = require('connect-flash')
  , helpers = require('view-helpers')

module.exports = function (app, config, passport) {

  app.set('showStackError', true)
  // should be placed before express.static
  app.use(express.compress({
    filter: function (req, res) {
      return /json|text|javascript|css/.test(res.getHeader('Content-Type'));
    },
    level: 9
  }))
  app.use(express.favicon())
  app.use(express.static(config.root + '/public'))

  // don't use logger for test env
  if (process.env.NODE_ENV !== 'test') {
    app.use(express.logger('dev'))
  }

  // set views path, template engine and default layout
  app.set('views', config.root + '/app/views')
  app.set('view engine', 'jade')

  app.configure(function () {
    // dynamic helpers
    app.use(helpers(config.app.name))

    // cookieParser should be above session
    app.use(express.cookieParser())

    // bodyParser should be above methodOverride
    app.use(express.bodyParser())
    app.use(express.methodOverride())

    // express/mongo session storage
    app.use(express.session({
      secret: 'noobjs',
      store: new mongoStore({
        url: config.db,
        collection : 'sessions'
      })
    }))

    // connect flash for flash messages
    app.use(flash())

    // use passport session
    app.use(passport.initialize())
    app.use(passport.session())

    // adds CSRF support
    app.use(express.csrf())

    // This could be moved to view-helpers :-)
    app.use(function(req, res, next){
      res.locals.csrf_token = req.session._csrf
      next()
    })

    // Render mobile views
    // if the request is coming from mobile and if you have a view
    // with users.mobile.jade, then that view will be rendered
    app.use(function (req, res, next) {
      var ua = req.header('user-agent')
      var fs = require('fs')

      res._render = res.render
      req.isMobile = /mobile/i.test(ua)

      res.render = function (template, locals, cb) {
        var view = template + '.mobile.' + app.get('view engine')
        var file = app.get('views') + '/' + view

        if (/mobile/i.test(ua) && fs.existsSync(file)) {
          res._render(view, locals, cb)
        } else {
          res._render(template, locals, cb)
        }
      }

      next()
    })

    // routes should be at the last
    app.use(app.router)

    // assume "not found" in the error msgs
    // is a 404. this is somewhat silly, but
    // valid, you can do whatever you like, set
    // properties, use instanceof etc.
    app.use(function(err, req, res, next){
      // treat as 404
      if (~err.message.indexOf('not found')) return next()

      // log it
      console.error(err.stack)

      // error page
      res.status(500).render('500', { error: err.stack })
    })

    // assume 404 since no middleware responded
    app.use(function(req, res, next){
      res.status(404).render('404', { url: req.originalUrl, error: 'Not found' })
    })

  })
}
