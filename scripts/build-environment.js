import { loadEnv } from 'vite';

export function effectiveBuildEnvironment(mode, root = process.cwd(), processEnv = process.env) {
  return { ...loadEnv(mode, root, ''), ...processEnv };
}
