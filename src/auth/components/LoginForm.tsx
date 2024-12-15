import { html } from 'hono/html'
import type { FC } from 'hono/jsx'
import type { PasswordLoginError } from '@openauthjs/openauth/adapter/password'

interface LoginFormProps {
  error?: PasswordLoginError
}

export const LoginForm: FC<LoginFormProps> = ({ error }) => {
  const errorMessage = error?.type === 'invalid_email'
    ? 'Invalid email address'
    : error?.type === 'invalid_password'
    ? 'Invalid password'
    : ''

  return html`
    <style>
      .error {
        color: #dc2626;
        background-color: #fee2e2;
        border: 1px solid #fecaca;
        border-radius: 0.375rem;
        padding: 0.75rem;
        margin-bottom: 1rem;
      }
    </style>
    <form method="POST" action="/auth/login" class="container">
      <h2>Login</h2>
      ${errorMessage && html`<div class="error">${errorMessage}</div>`}
      <div class="grid">
        <label>
          Email:
          <input type="email" name="email" required />
        </label>
        <label>
          Password:
          <input type="password" name="password" required minlength="8" />
        </label>
      </div>
      <button type="submit" class="contrast">Login</button>
      <div class="grid">
        <a href="/auth/register" role="button" class="outline">Register</a>
        <a href="/auth/github" role="button" class="outline">Login with GitHub</a>
      </div>
    </form>
  `
}
