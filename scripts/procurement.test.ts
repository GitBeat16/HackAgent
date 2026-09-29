import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateMilestone } from '../lib/server/procurement';
import * as serverAuth from '../lib/supabase/server';

vi.mock('../lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// We also need to mock writeAuditLog since it's imported in procurement.ts and calls DB.
vi.mock('../lib/server/audit', () => ({
  writeAuditLog: vi.fn(),
}));

describe('validateMilestone', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    };
    
    (serverAuth.createClient as any).mockResolvedValue(mockSupabase);
  });

  it('throws an error if validatorId matches the approving officer (decision_by)', async () => {
    mockSupabase.single.mockResolvedValue({
      data: {
        proposal_id: 'prop-123',
        status: 'evidence_submitted',
        procurement_proposals: { decision_by: 'validator-matching-id' }
      }
    });

    await expect(validateMilestone('validator-matching-id', 'mile-123', 'pass', 'looks good'))
      .rejects.toThrow('Approving officer cannot also validate');
  });

  it('proceeds and updates status if validatorId is different from approving officer', async () => {
    mockSupabase.single.mockResolvedValue({
      data: {
        proposal_id: 'prop-123',
        status: 'evidence_submitted',
        procurement_proposals: { decision_by: 'different-officer' }
      }
    });

    await validateMilestone('validator-different-id', 'mile-123', 'pass', 'looks good');
    
    expect(mockSupabase.from).toHaveBeenCalledWith('milestones');
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'validated',
      validated_by: 'validator-different-id',
      validator_feedback: 'looks good'
    }));
  });
});
