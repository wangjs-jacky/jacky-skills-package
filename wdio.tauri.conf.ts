import type { Options } from '@wdio/types'

export const config: Options = {
  hostname: '127.0.0.1',
  port: 4444,
  path: '/',

  specs: ['./e2e/tauri/**/*.spec.ts'],
  maxInstances: 1,

  capabilities: [
    {
      'tauri:options': {
        binary: '/Users/jiashengwang/jacky-github/jacky-skills-package/src-tauri/target/debug/j-skills',
      },
    },
  ],

  runner: 'local',
  autoCompileOpts: {
    autoCompile: true,
    tsOpts: {
      transpileOnly: true,
      project: './tsconfig.e2e.json',
    },
  },

  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: '60000',
  },

  reporters: ['spec'],
}
