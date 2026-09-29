import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runEligibilityScreening } from '../lib/server/procurement';
import * as serverAuth from '../lib/supabase/server';
vi.mock('../lib/server/audit', () => ({ writeAuditLog: vi.fn() }));

vi.mock('../lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('runEligibilityScreening', () => {
  let mockSupabase: Record<string, ReturnType<typeof vi.fn>>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;
  let insertedChecks: any[] = [];
  let updatedStatus: string | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    insertedChecks = [];
    updatedStatus = null;
    
    mockSingle = vi.fn();
    mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'eligibility_checks') {
          return { insert: vi.fn().mockImplementation((checks) => { insertedChecks = checks; return { error: null }; }) };
        }
        if (table === 'procurement_proposals') {
          return {
            select: mockSelect,
            update: vi.fn().mockImplementation((payload) => { updatedStatus = payload.status; return { eq: vi.fn().mockResolvedValue({ error: null }) }; })
          };
        }
        if (table === 'startup_profiles') {
          return { select: mockSelect };
        }
        return { select: mockSelect, insert: vi.fn(), update: vi.fn() };
      }),
    };
    (serverAuth.createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);
  });

  const setupMocks = (proposalOverrides: any, profileOverrides: any) => {
    // First call is for procurement_proposals
    mockSingle.mockResolvedValueOnce({
      data: {
        status: 'submitted',
        startup_id: 'startup-123',
        data_protection_accepted: true,
        challenges: { department_id: 'officer-123', entity_age_max: 10, relax_turnover: false },
        proposal_documents: [{ id: 'doc-1' }],
        ...proposalOverrides
      }
    });

    // Second call is for startup_profiles
    mockSingle.mockResolvedValueOnce({
      data: {
        dpiit_number: 'DIPP12345',
        incorporation_date: new Date(new Date().getTime() - (5 * 365.25 * 24 * 60 * 60 * 1000)).toISOString(), // 5 years ago
        meets_turnover_threshold: true,
        ...profileOverrides
      }
    });
  };

  it('passes all checks for a compliant startup', async () => {
    setupMocks({}, {});

    await runEligibilityScreening('officer-123', 'prop-123');

    expect(insertedChecks.length).toBe(5);
    expect(insertedChecks.every(c => c.passed)).toBe(true);
    expect(updatedStatus).toBe('screened');
  });

  it('fails if DPIIT format is invalid', async () => {
    setupMocks({}, { dpiit_number: 'INVALID123' });

    await runEligibilityScreening('officer-123', 'prop-123');

    const dpiitCheck = insertedChecks.find(c => c.rule_name === 'DPIIT Recognition Format');
    expect(dpiitCheck.passed).toBe(false);
    expect(updatedStatus).toBe('ineligible');
  });

  it('fails if entity age exceeds limit', async () => {
    setupMocks({}, { incorporation_date: new Date(new Date().getTime() - (15 * 365.25 * 24 * 60 * 60 * 1000)).toISOString() });

    await runEligibilityScreening('officer-123', 'prop-123');

    const ageCheck = insertedChecks.find(c => c.rule_name === 'Entity Age');
    expect(ageCheck.passed).toBe(false);
    expect(ageCheck.reason).toContain('Exceeds 10 years limit');
    expect(updatedStatus).toBe('ineligible');
  });

  it('passes entity age and turnover if relax_turnover is true, even if old and low turnover', async () => {
    setupMocks(
      { challenges: { department_id: 'officer-123', entity_age_max: 10, relax_turnover: true } },
      { incorporation_date: new Date(new Date().getTime() - (15 * 365.25 * 24 * 60 * 60 * 1000)).toISOString(), meets_turnover_threshold: false }
    );

    await runEligibilityScreening('officer-123', 'prop-123');

    const ageCheck = insertedChecks.find(c => c.rule_name === 'Entity Age');
    expect(ageCheck.passed).toBe(true);
    expect(ageCheck.reason).toBe('Waived (Relaxation active)');

    const turnoverCheck = insertedChecks.find(c => c.rule_name === 'Turnover / Experience');
    expect(turnoverCheck.passed).toBe(true);
    expect(turnoverCheck.reason).toBe('Waived for startups');
    
    expect(updatedStatus).toBe('screened');
  });

  it('fails if no documents uploaded', async () => {
    setupMocks({ proposal_documents: [] }, {});

    await runEligibilityScreening('officer-123', 'prop-123');

    const docCheck = insertedChecks.find(c => c.rule_name === 'Required Documents');
    expect(docCheck.passed).toBe(false);
    expect(updatedStatus).toBe('ineligible');
  });

  it('fails if data protection not accepted', async () => {
    setupMocks({ data_protection_accepted: false }, {});

    await runEligibilityScreening('officer-123', 'prop-123');

    const dpCheck = insertedChecks.find(c => c.rule_name === 'Data Protection Declaration');
    expect(dpCheck.passed).toBe(false);
    expect(updatedStatus).toBe('ineligible');
  });
});
