export * from './auth';
export * from './menu';
export * from './user';


import { treaty } from '@elysiajs/eden'
import type { App } from '@/index'

// @ts-ignore
export const apiClient = treaty<App>('https://srs.threeher.cn/', {
  fetch: {
    credentials: 'include'
},
})

import { createAuthClient } from "better-auth/vue" // make sure to import from better-auth/vue


export const authClient = createAuthClient({
  //you can pass client configuration here
  baseURL: 'https://srs.threeher.cn/',
  emailAndPassword: {
    enabled: true,
  },
})
