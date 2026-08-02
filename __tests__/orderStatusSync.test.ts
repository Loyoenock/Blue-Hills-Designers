import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStore } from '../store/useStore';

describe('updateOrderStatus - Payment Consistency & Rollback', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates pending payment to Paid when order status transitions to Delivered', async () => {
    useStore.setState({
      orders: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          orderNumber: 'BHD-1001',
          customerName: 'Alice',
          customerEmail: 'alice@example.com',
          items: [],
          amount: 150000,
          date: '2026-08-01',
          status: 'Pending',
          paymentMethod: 'Cash on Delivery'
        }
      ],
      payments: [
        {
          id: '223e4567-e89b-12d3-a456-426614174000',
          orderId: '123e4567-e89b-12d3-a456-426614174000',
          customerName: 'Alice',
          amount: 150000,
          status: 'Pending',
          paymentMethod: 'Cash on Delivery',
          transactionId: 'TXN-COD-1001',
          date: '2026-08-01'
        }
      ]
    });

    const result = await useStore.getState().updateOrderStatus(
      '123e4567-e89b-12d3-a456-426614174000',
      'Delivered',
      'Admin User',
      'Super Admin'
    );

    expect(result.success).toBe(true);
    const updatedOrder = useStore.getState().orders.find(o => o.id === '123e4567-e89b-12d3-a456-426614174000');
    const updatedPayment = useStore.getState().payments.find(p => p.id === '223e4567-e89b-12d3-a456-426614174000');

    expect(updatedOrder?.status).toBe('Delivered');
    expect(updatedPayment?.status).toBe('Paid');
  });

  it('updates pending payment to Cancelled when order status transitions to Cancelled', async () => {
    useStore.setState({
      orders: [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          orderNumber: 'BHD-1002',
          customerName: 'Bob',
          customerEmail: 'bob@example.com',
          items: [],
          amount: 200000,
          date: '2026-08-01',
          status: 'Processing',
          paymentMethod: 'Mobile Money'
        }
      ],
      payments: [
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          orderId: '123e4567-e89b-12d3-a456-426614174001',
          customerName: 'Bob',
          amount: 200000,
          status: 'Pending',
          paymentMethod: 'Mobile Money',
          transactionId: 'TXN-MM-1002',
          date: '2026-08-01'
        }
      ]
    });

    const result = await useStore.getState().updateOrderStatus(
      'BHD-1002',
      'Cancelled',
      'Admin User',
      'Super Admin'
    );

    expect(result.success).toBe(true);
    const updatedOrder = useStore.getState().orders.find(o => o.orderNumber === 'BHD-1002');
    const updatedPayment = useStore.getState().payments.find(p => p.id === '223e4567-e89b-12d3-a456-426614174001');

    expect(updatedOrder?.status).toBe('Cancelled');
    expect(updatedPayment?.status).toBe('Cancelled');
  });

  it('rolls back both orders and payments if DB update fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Database constraint failure' })
    }));

    const initialOrder = {
      id: '123e4567-e89b-12d3-a456-426614174003',
      orderNumber: 'BHD-1004',
      customerName: 'Dave',
      customerEmail: 'dave@example.com',
      items: [],
      amount: 400000,
      date: '2026-08-01',
      status: 'Pending' as const,
      paymentMethod: 'Mobile Money'
    };

    const initialPayment = {
      id: '223e4567-e89b-12d3-a456-426614174003',
      orderId: '123e4567-e89b-12d3-a456-426614174003',
      customerName: 'Dave',
      amount: 400000,
      status: 'Pending' as const,
      paymentMethod: 'Mobile Money',
      transactionId: 'TXN-MM-1004',
      date: '2026-08-01'
    };

    useStore.setState({
      orders: [initialOrder],
      payments: [initialPayment]
    });

    const result = await useStore.getState().updateOrderStatus(
      '123e4567-e89b-12d3-a456-426614174003',
      'Delivered',
      'Admin User',
      'Super Admin'
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    const rolledBackOrder = useStore.getState().orders.find(o => o.id === initialOrder.id);
    const rolledBackPayment = useStore.getState().payments.find(p => p.id === initialPayment.id);

    expect(rolledBackOrder?.status).toBe('Pending');
    expect(rolledBackPayment?.status).toBe('Pending');
  });
});
