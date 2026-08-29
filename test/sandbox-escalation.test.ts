import { describe, expect, it, vi } from 'vitest'
import { approveEscalation } from '@deepseek-ai/dsh-sandbox'

describe('sandbox escalation normalization', () => {
  it('treats a repeated danger-full-access request as a no-op', async () => {
    const request = vi.fn()
    await expect(approveEscalation({
      requestedMode: 'danger-full-access',
      effectiveMode: 'danger-full-access',
      justification: 'already granted',
      subject: 'command'
    }, { approver: { request } as never, agent: undefined, callId: 'call', toolName: 'pwsh' })).resolves.toBe('danger-full-access')
    expect(request).not.toHaveBeenCalled()
  })

  it('keeps same-level escalation strict for confined modes', async () => {
    await expect(approveEscalation({
      requestedMode: 'workspace-write',
      effectiveMode: 'workspace-write',
      justification: 'same level',
      subject: 'command'
    }, { approver: undefined, agent: undefined, callId: 'call', toolName: 'pwsh' })).rejects.toThrow('not strictly wider')
  })
})
