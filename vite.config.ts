import type { UserConfig } from 'vite'
import wasm from "vite-plugin-wasm";

export default {
	plugins: [wasm()]
} satisfies UserConfig;
