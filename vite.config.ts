import type { UserConfig } from 'vite'
import wasm from "vite-plugin-wasm";

export default {
	plugins: [wasm()],
	base: "/ICG/",
	build: {
		target: 'esnext' //browsers can handle the latest ES features
	},
} satisfies UserConfig;
