import { describe, expect, it } from 'vitest'
import { normalizeEscalationArgs } from '@deepseek-ai/dsh-sandbox'

describe('sandbox escalation normalization', () => {
  it('ignores escalation metadata for full-access calls', () => {
    expect(normalizeEscalationArgs(undefined, undefined, 'danger-full-access')).toEqual({})
    expect(normalizeEscalationArgs('workspace-write', 'same-level', 'danger-full-access')).toEqual({})
    expect(normalizeEscalationArgs('danger-full-access', undefined, 'danger-full-access')).toEqual({})
    expect(normalizeEscalationArgs(undefined, '', 'danger-full-access')).toEqual({})
  })

  it('keeps strict validation for confined calls', () => {
    expect(() => normalizeEscalationArgs('workspace-write', undefined, 'workspace-write')).toThrow(
      'sandbox_permissions requires a justification',
    )
    expect(normalizeEscalationArgs('danger-full-access', 'needs access', 'workspace-write')).toEqual({
      sandboxPermissions: 'danger-full-access',
      justification: 'needs access',
    })
  })
})
