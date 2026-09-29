import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildProcurementPackage } from '../lib/server/export-builder';
import * as serverAuth from '../lib/supabase/server';

vi.mock('../lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('buildProcurementPackage', () => {
  let mockSupabase: any;
  let mockSingle: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSingle = vi.fn();
    mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle
          })
        })
      })
    };
    (serverAuth.createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);
  });

  it('formats a complete pilot successfully', async () => {
    mockSingle.mockResolvedValueOnce({
      error: null,
      data: {
        id: 'prop-1',
        status: 'scaled',
        ai_match_score: 95,
        officer_override_reason: 'Excellent',
        challenges: { title: 'Test Challenge', department_id: 'dept-1', budget_inr: 5000000 },
        pilot_plans: [{
          duration_weeks: 12,
          scope: 'Full scope',
          pilot_kpis: [
            { name: 'Latency', baseline: 500, target: 100, actual: 120, unit: 'ms' }
          ]
        }],
        milestones: [
          { title: 'M1', status: 'approved', payment_status: 'paid', is_on_time: true }
        ],
        scale_decisions: [
          { decision: 'scale', pathway: 'GeM', reason: 'Targets met' }
        ]
      }
    });

    const pkg = await buildProcurementPackage('prop-1');
    expect(pkg.challenge.title).toBe('Test Challenge');
    expect(pkg.pilot?.kpis[0].actual).toBe(120);
    expect(pkg.milestones[0].is_on_time).toBe(true);
    expect(pkg.scale_decision?.decision).toBe('scale');
  });

  it('handles a pilot with no KPIs and no scale decision yet', async () => {
    mockSingle.mockResolvedValueOnce({
      error: null,
      data: {
        id: 'prop-2',
        status: 'pilot_active',
        ai_match_score: 80,
        challenges: { title: 'No KPIs' },
        pilot_plans: [{ duration_weeks: 8, scope: 'Minimal', pilot_kpis: [] }],
        milestones: [],
        scale_decisions: []
      }
    });

    const pkg = await buildProcurementPackage('prop-2');
    expect(pkg.pilot?.kpis.length).toBe(0);
    expect(pkg.scale_decision).toBeNull();
  });

  it('throws an error if proposal is not found', async () => {
    mockSingle.mockResolvedValueOnce({ error: { message: 'Not found' }, data: null });
    await expect(buildProcurementPackage('missing')).rejects.toThrow('Proposal not found');
  });
});
