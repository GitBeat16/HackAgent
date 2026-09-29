import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rejectProposal } from '../lib/server/procurement';
import * as serverAuth from '../lib/supabase/server';

vi.mock('../lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('../lib/server/audit', () => ({
  writeAuditLog: vi.fn(),
}));

type MockSupabaseClient = {
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

describe('rejectProposal', () => {
  let mockSupabase: MockSupabaseClient;

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
    (serverAuth.createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);
  });

  it('rejects successfully when officerId matches department_id', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        status: 'evaluated',
        report_id: 'rep-123',
        challenges: { department_id: 'officer-123' }
      }
    });
    mockSupabase.single.mockResolvedValueOnce({
      data: { verdict: 'Reject' }
    });

    await expect(rejectProposal('officer-123', 'prop-123', 'does not fit')).resolves.toBeUndefined();
  });
});
