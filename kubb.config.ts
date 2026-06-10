import { defineConfig } from '@kubb/core';
import { pluginOas } from '@kubb/plugin-oas';
import { pluginTs } from '@kubb/plugin-ts';
import { pluginClient } from '@kubb/plugin-client';
import { pluginReactQuery } from '@kubb/plugin-react-query';

export default defineConfig({
	input: {
		path: './openapi/spec.json',
	},
	output: {
		path: './src/generated',
		clean: true,
	},
	plugins: [
		pluginOas(),
		pluginTs({
			output: { path: 'types' },
		}),
		pluginClient({
			output: { path: 'clients' },
			importPath: '../../api/kubbClient',
		}),
		pluginReactQuery({
			output: { path: 'hooks' },
		}),
	],
});
