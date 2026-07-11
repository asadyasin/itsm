import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketApi } from '../api/endpoints';

export function useTickets(params) {
  return useQuery({
    queryKey: ['tickets', params],
    queryFn: () => ticketApi.list(params).then((r) => r.data),
    keepPreviousData: true
  });
}

export function useTicket(id) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketApi.get(id).then((r) => r.data.data),
    enabled: !!id
  });
}

export function useTicketActions() {
  const qc = useQueryClient();
  const invalidate = (id) => {
    qc.invalidateQueries({ queryKey: ['tickets'] });
    if (id) qc.invalidateQueries({ queryKey: ['ticket', id] });
  };

  const approve = useMutation({ mutationFn: (id) => ticketApi.approve(id), onSuccess: (_, id) => invalidate(id) });
  const reject = useMutation({ mutationFn: ({ id, reason }) => ticketApi.reject(id, { rejectionReason: reason }), onSuccess: (_, { id }) => invalidate(id) });
  const assign = useMutation({ mutationFn: ({ id, assignedTo }) => ticketApi.assign(id, { assignedTo }), onSuccess: (_, { id }) => invalidate(id) });
  const resolve = useMutation({ mutationFn: (id) => ticketApi.resolve(id), onSuccess: (_, id) => invalidate(id) });
  const close = useMutation({ mutationFn: (id) => ticketApi.close(id), onSuccess: (_, id) => invalidate(id) });
  const reopen = useMutation({ mutationFn: (id) => ticketApi.reopen(id), onSuccess: (_, id) => invalidate(id) });

  return { approve, reject, assign, resolve, close, reopen };
}
