import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { PasswordConfig, PasswordLoginError, PasswordRegisterError, PasswordRegisterState } from '@openauthjs/openauth/adapter/password'
import type { Oauth2WrappedConfig } from '@openauthjs/openauth/adapter/oauth2'
import type { StorageAdapter } from '@openauthjs/openauth/storage/storage'
import type { OnSuccessResponder } from '@openauthjs/openauth/dist/types/authorizer.js'

export interface UserInfo {
  id: string
  email: string
  name?: string
  createdAt: number
  updatedAt: number
}

export interface HashedPassword {
  hash: string
  salt: string
  N: number
  r: number
  p: number
}

export interface PendingUser {
  email: string
  password: string
  code: string
  expiresAt: number
}

export interface AuthResponse {
  token: string
  user: UserInfo
}

export type SubjectType = {
  user: UserInfo
}

export type AuthSubjects = {
  user: {
    '~standard': {
      version: 1
      vendor: string
      validate: (value: unknown) => Promise<StandardSchemaV1.Result<UserInfo>>
      types: {
        input: UserInfo
        output: UserInfo
      }
    }
  }
}

export interface AuthConfig {
  github: Oauth2WrappedConfig
  password: PasswordConfig
}

export type {
  PasswordConfig,
  PasswordLoginError,
  PasswordRegisterError,
  PasswordRegisterState,
  StorageAdapter,
  OnSuccessResponder,
  StandardSchemaV1
}
