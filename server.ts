import {
  bold,
  cyan,
  green,
  yellow,
} from 'https://deno.land/std@0.131.0/fmt/colors.ts'

import {
  Application,
  Context,
  isHttpError,
  Status,
} from 'https://deno.land/x/oak@v10.5.1/mod.ts'
import { oakCors } from 'https://deno.land/x/cors@v1.2.2/oakCors.ts'

import router from './routes.ts'

function notFound(ctx: Context) {
  ctx.response.status = Status.NotFound
  ctx.response.body = `<html><body><h1>404 - Not Found</h1><p>Path <code>${ctx.request.url}</code> not found.`
}

const app = new Application()

// Logger
app.use(async (context, next) => {
  await next()
  const rt = context.response.headers.get('X-Response-Time')
  console.log(
    `${green(context.request.method)} ${cyan(
      context.request.url.pathname
    )} - ${bold(String(rt))}`
  )
})

// Response Time
app.use(async (context, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  context.response.headers.set('X-Response-Time', `${ms}ms`)
})

// Error handler
app.use(async (context, next) => {
  try {
    await next()
  } catch (err) {
    if (isHttpError(err)) {
      context.response.status = err.status
      const { message, status, stack } = err
      if (context.request.accepts('json')) {
        context.response.body = { message, status, stack }
        context.response.type = 'json'
      } else {
        context.response.body = `${status} ${message}\n\n${stack ?? ''}`
        context.response.type = 'text/plain'
      }
    } else {
      console.log(err)
      throw err
    }
  }
})

// Use the router
app.use(oakCors())
app.use(router.routes())
app.use(router.allowedMethods())
// A basic 404 page
app.use(notFound)

// better than console log
app.addEventListener('listen', ({ hostname, port, serverType }) => {
  console.log(bold('Start listening on ') + yellow(`${hostname}:${port}`))
  console.log(bold('  using HTTP server: ' + yellow(serverType)))
})

await app.listen({port: 8000 })
console.log(bold('Finished.'))
