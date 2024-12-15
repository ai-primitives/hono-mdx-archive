import { authorizer } from '@openauthjs/openauth'
import { GithubAdapter } from '@openauthjs/openauth/adapter/github'
import { PasswordAdapter } from '@openauthjs/openauth/adapter/password'
import { PasswordUI } from '@openauthjs/openauth/ui/password'
import { createSubjects } from '@openauthjs/openauth'
import { StandardSchemaV1 } from '@standard-schema/spec'
import { D1Storage } from './storage/d1'
import type { AuthEnv } from '../types/env'
import type { GitHubUserResponse, SubjectType } from './types'

// Define subject types for tokens using StandardSchema
const userSchema: StandardSchemaV1<SubjectType['user']> = {
  '~standard': {
    version: 1,
    vendor: 'hono-mdx',
    validate: async (value: unknown) => {
      const user = value as SubjectType['user']
      if (!user.userID || !user.email) {
        return { issues: [{ message: 'Invalid user data' }] }
      }
      return { value: user }
    },
    types: {
      input: {} as SubjectType['user'],
      output: {} as SubjectType['user'],
    },
  },
}

export const subjects = createSubjects({
  user: userSchema,
})

// Configure auth providers
const providers = {
  github: GithubAdapter({
    clientID: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    scopes: ['user:email'],
  }),
  password: PasswordAdapter(
    PasswordUI({
      sendCode: async (email, code) => {
        // TODO: Implement email sending
        console.log('Verification code for', email, ':', code)
      },
    })
  ),
}

// Create auth server configuration
export const createAuthServer = (env: AuthEnv) => {
  return authorizer({
    providers,
    subjects,
    storage: new D1Storage(env.Bindings.AUTH_DB),
    async success(ctx, value) {
      let userID: string
      let email: string
      let name: string | undefined

      if (value.provider === 'password') {
        email = value.email
        userID = value.email // Use email as userID for password auth
      } else if (value.provider === 'github') {
        const response = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${value.tokenset.access}`,
          },
        })
        const userInfo = (await response.json()) as GitHubUserResponse
        email = userInfo.email
        userID = userInfo.id.toString()
        name = userInfo.name
      } else {
        throw new Error('Unsupported provider')
      }

      return ctx.subject('user', {
        userID,
        email,
        name,
      })
    },
  })
}
