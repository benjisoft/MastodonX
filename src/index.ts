// SPDX-FileCopyrightText: (C) 2024 Ben Lewis <oss@benjilewis.dev>
//
// SPDX-License-Identifier: SSPL-1.0

import { config } from 'dotenv';
import { createStreamingAPIClient } from "masto";
import { TwitterApi } from 'twitter-api-v2';
import { stripHtml } from "string-strip-html";

config();

if (!process.env.TWITTER_CONSUMER_KEY || !process.env.TWITTER_CONSUMER_SECRET || !process.env.TWITTER_ACCESS_TOKEN || !process.env.TWITTER_ACCESS_SECRET || !process.env.MASTODON_ACCESS_TOKEN || !process.env.MASTODON_INSTANCE_URL) { throw new Error('Missing environment variables'); }

// Twitter API credentials
const twitterClient = new TwitterApi({
	appKey: process.env.TWITTER_CONSUMER_KEY,
	appSecret: process.env.TWITTER_CONSUMER_SECRET,
	accessToken: process.env.TWITTER_ACCESS_TOKEN,
	accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

// Mastodon API credentials
const mastodonConfig = {
	accessToken: process.env.MASTODON_ACCESS_TOKEN,
	streamingApiUrl: process.env.MASTODON_INSTANCE_URL,
};

const masto = createStreamingAPIClient(mastodonConfig);

const subscribe = async (): Promise<void> => {
	console.log("Application Started");

	for await (const event of masto.user.subscribe()) {
		switch (event.event) {
			case "update": {
				// Ignore replies and posts with media
				if (event.payload.inReplyToId !== null || event.payload.mediaAttachments.length > 0) break;

				console.log("new post", event.payload.content);
				try {
					await twitterClient.v2.tweet(stripHtml(event.payload.content).result);
					console.log('Posted to Twitter');
				} catch (err) {
					console.error(err);
				}
				break;
			}
			case "delete": {
				console.log("deleted post", event.payload);
				break;
			}
			default: {
				break;
			}
		}
	}
};

try {
	subscribe();
} catch (error) {
	console.error(error);
}