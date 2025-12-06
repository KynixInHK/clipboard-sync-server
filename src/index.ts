import { Hono } from 'hono';

type Bindings = {
	CLIPBOARD_DO: DurableObjectNamespace;
	API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// === 安全验证 (保持不变) ===
async function safeCompare(userToken: string, secretKey: string): Promise<boolean> {
	if (!userToken || !secretKey) return false;
	const encoder = new TextEncoder();
	const aBuf = await crypto.subtle.digest('SHA-256', encoder.encode(userToken));
	const bBuf = await crypto.subtle.digest('SHA-256', encoder.encode(secretKey));
	const a = new Uint8Array(aBuf);
	const b = new Uint8Array(bBuf);
	let result = 0;
	for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
	return result === 0;
}

app.use('*', async (c, next) => {
	const token = c.req.query('token');
	const apiKey = c.env.API_KEY;
	if (!await safeCompare(token || "", apiKey || "")) return c.text('Unauthorized', 401);
	await next();
});

// 1. WebSocket (Mac用)
app.get('/ws', async (c) => {
	if (c.req.header('Upgrade') !== 'websocket') return c.text('Expected Upgrade', 426);
	const id = c.env.CLIPBOARD_DO.idFromName('GLOBAL_SECURE_ROOM');
	return c.env.CLIPBOARD_DO.get(id).fetch(c.req.raw);
});

// 2. HTTP POST (Android 发送用)
app.post('/api/send', async (c) => {
	const id = c.env.CLIPBOARD_DO.idFromName('GLOBAL_SECURE_ROOM');
	return c.env.CLIPBOARD_DO.get(id).fetch(c.req.raw);
});

// 3. 【新增】HTTP GET (Android 拉取用)
app.get('/api/latest', async (c) => {
	const id = c.env.CLIPBOARD_DO.idFromName('GLOBAL_SECURE_ROOM');
	return c.env.CLIPBOARD_DO.get(id).fetch(c.req.raw);
});

export default app;

// === Durable Object ===
export class ClipboardRoom implements DurableObject {
	state: DurableObjectState;
	sessions: Set<WebSocket>;

	constructor(state: DurableObjectState, env: Bindings) {
		this.state = state;
		this.sessions = new Set();
	}

	async fetch(request: Request) {
		const url = new URL(request.url);

		// WebSocket 处理
		if (request.headers.get('Upgrade') === 'websocket') {
			const pair = new WebSocketPair();
			const [client, server] = Object.values(pair);
			await this.handleSession(server);
			return new Response(null, { status: 101, webSocket: client });
		}

		// 【新增】处理 GET /api/latest (拉取)
		if (request.method === 'GET' && url.pathname === '/api/latest') {
			const content = await this.state.storage.get<string>('lastContent') || "";
			return new Response(JSON.stringify({ type: 'text', content: content }), {
				headers: { "Content-Type": "application/json" }
			});
		}

		// 处理 POST /api/send (发送)
		if (request.method === 'POST' && url.pathname === '/api/send') {
			try {
				const body = await request.json() as any;
				const content = body.content;
				if (content) {
					await this.state.storage.put('lastContent', content);
					this.broadcast(JSON.stringify({ type: 'text', content: content }));
					return new Response("Synced", { status: 200 });
				}
			} catch (e) {}
			return new Response("Error", { status: 400 });
		}

		return new Response('Not found', { status: 404 });
	}

	async handleSession(ws: WebSocket) {
		ws.accept();
		this.sessions.add(ws);
		// 连接即发送最新数据
		const last = await this.state.storage.get<string>('lastContent');
		if (last) ws.send(JSON.stringify({ type: 'text', content: last }));

		ws.addEventListener('message', async (msg) => {
			try {
				const data = JSON.parse(msg.data as string);
				if (data.type === 'text') {
					await this.state.storage.put('lastContent', data.content);
					this.broadcast(JSON.stringify(data), ws);
				}
			} catch(e) {}
		});
		ws.addEventListener('close', () => this.sessions.delete(ws));
	}

	broadcast(message: string, exclude?: WebSocket) {
		this.sessions.forEach(s => {
			if (s !== exclude && s.readyState === WebSocket.READY_STATE_OPEN) s.send(message);
		});
	}
}
