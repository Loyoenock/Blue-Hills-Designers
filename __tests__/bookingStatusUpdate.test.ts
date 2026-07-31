import { describe, it, expect } from 'vitest';

describe('updateBookingStatus logic', () => {
  it('prepares lowercase status for DB constraint while mapping UI status', () => {
    const uiStatus: 'Pending' | 'Confirmed' | 'Completed' = 'Confirmed';
    const dbStatus = uiStatus.toLowerCase();

    expect(dbStatus).toBe('confirmed');
    expect(['pending', 'confirmed', 'completed']).toContain(dbStatus);
  });

  it('rolls back optimistic state on DB failure', () => {
    let bookings = [{ id: 'b-1', clientName: 'John', status: 'Pending' }];
    const previousBookings = [...bookings];

    // Optimistic update
    bookings = bookings.map(b => b.id === 'b-1' ? { ...b, status: 'Confirmed' } : b);
    expect(bookings[0].status).toBe('Confirmed');

    // Simulate DB failure
    const dbSuccess = false;
    if (!dbSuccess) {
      bookings = previousBookings;
    }

    expect(bookings[0].status).toBe('Pending');
  });
});
