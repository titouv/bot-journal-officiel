const CLIENT_ID = process.env.PISTE_CLIENT_ID!;
const CLIENT_SECRET = process.env.PISTE_CLIENT_SECRET!;
console.log('CLIENT_ID', CLIENT_ID);
console.log('CLIENT_SECRET', CLIENT_SECRET);

if (!CLIENT_ID || !CLIENT_SECRET) {
	throw new Error('Missing environment variables');
}

export async function getToken() {
	const res = await fetch('https://sandbox-oauth.piste.gouv.fr/api/oauth/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: CLIENT_ID,
			client_secret: CLIENT_SECRET,
			scope: 'openid',
		}),
	});
	if (!res.ok) {
		throw new Error('Failed to get token');
	}

	const data = await res.json();

	return data as {
		access_token: string;
		token_type: string;
		expires_in: number;
		scope: string;
	};
}
