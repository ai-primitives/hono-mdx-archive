import { html } from 'hono/html'
import type { FC } from 'hono/jsx'
import type { PasswordRegisterError, PasswordRegisterState } from '@openauthjs/openauth/adapter/password'

interface RegisterFormProps {
  error?: PasswordRegisterError
  state?: PasswordRegisterState
}

export const RegisterForm: FC<RegisterFormProps> = ({ error, state }) => {
  const errorMessage = error?.type === 'invalid_email'
    ? 'Invalid email address'
    : error?.type === 'invalid_password'
    ? 'Password must be at least 8 characters'
    : error?.type === 'password_mismatch'
    ? 'Passwords do not match'
    : error?.type === 'email_taken'
    ? 'Email is already registered'
    : error?.type === 'invalid_code'
    ? 'Invalid verification code'
    : ''

  const isCodeState = state?.type === 'code'

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
    <form method="POST" action="/auth/register" class="container">
      <h2>Register</h2>
      ${errorMessage && html`<div class="error">${errorMessage}</div>`}
      <div class="grid">
        ${isCodeState ? html`
          <input type="hidden" name="state" value="code" />
          <input type="hidden" name="email" value="${state.email}" />
          <input type="hidden" name="password" value="${state.password}" />
          <label>
            Verification Code:
            <input type="text" name="code" value="${state.code || ''}" required />
          </label>
        ` : html`
          <input type="hidden" name="state" value="start" />
          <label>
            Email:
            <input type="email" name="email" required />
          </label>
          <label>
            Password:
            <input type="password" name="password" required minlength="8" />
          </label>
          <label>
            Confirm Password:
            <input type="password" name="confirm_password" required minlength="8" />
          </label>
        `}
      </div>
      <button type="submit" class="contrast">
        ${isCodeState ? 'Verify Code' : 'Register'}
      </button>
      <a href="/auth/login" role="button" class="outline">Back to Login</a>
    </form>
  `
}
