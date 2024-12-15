import { MDXRenderError } from './errors'

interface CloudflareAPIConfig {
  accountId: string
  apiToken: string
  scriptName: string
}

interface UploadWorkerResponse {
  success: boolean
  errors: string[]
  messages: string[]
  result: {
    id: string
    etag: string
    size: number
  }
}

/**
 * Uploads a worker script to Cloudflare Workers for Platforms
 * @see https://developers.cloudflare.com/api/operations/namespace-worker-script-upload-worker-module
 */
export async function uploadWorkerScript(
  script: string,
  config: CloudflareAPIConfig
): Promise<UploadWorkerResponse> {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/workers/scripts/${config.scriptName}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${config.apiToken}`,
          'Content-Type': 'application/javascript',
        },
        body: script,
      }
    )

    const result = await response.json()

    if (!result.success) {
      throw new MDXRenderError(`Failed to upload worker script: ${result.errors.join(', ')}`)
    }

    return result
  } catch (error) {
    throw new MDXRenderError(`Error uploading worker script: ${error}`)
  }
}
