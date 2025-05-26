import { env } from 'cloudflare:workers';

export async function fetch(url: string, options: RequestInit = {}): Promise<Response> {
	const cacheKey = JSON.stringify({ url, body: options.body }); // dont use header because auth token changes
	const cached = await env.KV_BINDING.get(cacheKey);

	if (cached) {
		console.log(`Cache hit for: ${url}`);
		return new Response(cached);
	}

	console.log(`Cache miss for: ${url}`);
	const response = await globalThis.fetch(url, options);

	if (!response.ok) {
		return response;
	}

	const contentType = response.headers.get('content-type');
	if (contentType && contentType.includes('application/json')) {
		const data = await response.clone().json();
		await env.KV_BINDING.put(cacheKey, JSON.stringify(data));
		return new Response(JSON.stringify(data), {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
		});
	} else {
		const data = await response.clone().text();
		await env.KV_BINDING.put(cacheKey, data);
		return new Response(data, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
		});
	}
}
