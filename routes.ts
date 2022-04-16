import { cyan, green } from 'https://deno.land/std@0.131.0/fmt/colors.ts'
import {
  Status,
  Router,
  Context,
  ServerSentEvent,
  ServerSentEventTarget,
} from 'https://deno.land/x/oak@v10.5.1/mod.ts'

const router = new Router()

let clients: ServerSentEventTarget[] = []
let activePlayer = 1

router
  .get('/', async (ctx) => {
    await ctx.send({
      root: `${Deno.cwd()}/views`,
      index: 'sseServer_index.html',
    })
  })

  // .get('/static/style.css', async (ctx) => {
  //   await ctx.send({
  //     root: `${Deno.cwd()}/public/static`,
  //     path: 'style.css',
  //   })
  // })

  .get('/sse', (ctx: Context) => {
    ctx.assert(
      ctx.request.accepts('text/event-stream'),
      Status.UnsupportedMediaType
    )
    const connection = ctx.request.ip
    const target = ctx.sendEvents()
    clients.push(target)
    console.log(`${green('SSE connection')} ${cyan(connection)}`)

    target.addEventListener('close', () => {
      console.log(`${green('SSE disconnect')} ${cyan(connection)}`)
      clients = clients.filter((el) => el != target)
      // if browser is terminated (x) there is no close event,
      // so i double check in /trigger and remove unused clients
    })
  })

  .post('/activate', async (ctx: Context) => {
    const { playerId } = await ctx.request.body().value
    activePlayer = playerId
    ctx.response.status = Status.Accepted
  })

  .post('/trigger', async (ctx: Context) => {
    const { value } = await ctx.request.body().value
    console.log( { value, activePlayer })
    const evt = new ServerSentEvent('message', { value, playerId: activePlayer })

    for (let i = 0; i < clients.length; i++) {
      console.log(i, clients[i].closed)
      if (clients[i].closed) {
        clients.splice(i, 1)
        i--
        continue
      }
      // this causes uncaught errors, cannot trycatch it
      clients[i].dispatchEvent(evt)
    }
    ctx.response.status = Status.Accepted
  })

export default router
