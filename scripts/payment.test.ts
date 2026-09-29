import { describe, it, expect, vi, beforeEach } from 'vitest';
import { markPaymentPaid } from '../lib/server/procurement';
import * as serverAuth from '../lib/supabase/server';

vi.mock('../lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('../lib/server/audit', () => ({ writeAuditLog: vi.fn() }));

describe('markPaymentPaid', () => {
  let mockSupabase: Record<string, ReturnType<typeof vi.fn>>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;
  let updatedPayload: any = null;

  beforeEach(() => {
    vi.clearAllMocks();
    updatedPayload = null;
    
    mockSingle = vi.fn();
    mockEq = vi.fn().mockImplementation(() => ({ single: mockSingle }));
    mockSelect = vi.fn().mockImplementation(() => ({ eq: mockEq }));

    mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'milestones') {
          return {
            select: mockSelect,
            update: vi.fn().mockImplementation((payload) => {
              updatedPayload = payload;
              return { eq: vi.fn().mockResolvedValue({ error: null }) };
            })
          };
        }
        return { select: mockSelect, update: vi.fn() };
      }),
    };
    (serverAuth.createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);
  });

  const setupMock = (approvedDaysAgo: number | null) => {
    mockSingle.mockResolvedValueOnce({
      data: {
        payment_status: 'processing',
        approved_at: approvedDaysAgo !== null 
          ? new Date(Date.now() - (approvedDaysAgo * 24 * 60 * 60 * 1000)).toISOString() 
          : null
      }
    });
  };

  it('computes on-time correctly for early payment', async () => {
    setupMock(5); // Approved 5 days ago
    await markPaymentPaid('admin-123', 'ms-1', 'REF1');
    expect(updatedPayload.payment_status).toBe('paid');
    expect(updatedPayload.days_to_payment).toBe(5);
    expect(updatedPayload.is_on_time).toBe(true);
  });

  it('computes on-time correctly exactly on the SLA boundary', async () => {
    setupMock(30); // Approved 30 days ago
    await markPaymentPaid('admin-123', 'ms-1', 'REF2');
    expect(updatedPayload.days_to_payment).toBe(30);
    expect(updatedPayload.is_on_time).toBe(true);
  });

  it('flags payment as late if it exceeds SLA', async () => {
    setupMock(40); // Approved 40 days ago
    await markPaymentPaid('admin-123', 'ms-1', 'REF3');
    expect(updatedPayload.days_to_payment).toBe(40);
    expect(updatedPayload.is_on_time).toBe(false);
  });

  it('handles missing approved_at timestamp', async () => {
    setupMock(null); // Missing timestamp
    await markPaymentPaid('admin-123', 'ms-1', 'REF4');
    expect(updatedPayload.days_to_payment).toBe(null);
    expect(updatedPayload.is_on_time).toBe(null);
  });

  it('throws error if payment_status is not processing', async () => {
    mockSingle.mockResolvedValueOnce({ data: { payment_status: 'unpaid' } });
    await expect(markPaymentPaid('admin-123', 'ms-1', 'REF5')).rejects.toThrow('Payment not released');
  });
});
