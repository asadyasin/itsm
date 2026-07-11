import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryApi, categoryApi, vendorApi, purchaseApi } from '../api/endpoints';

export function useInventoryItems(params) {
  return useQuery({
    queryKey: ['inventory-items', params],
    queryFn: () => inventoryApi.list(params).then((r) => r.data),
    keepPreviousData: true
  });
}

export function useInventoryItem(id) {
  return useQuery({
    queryKey: ['inventory-item', id],
    queryFn: () => inventoryApi.get(id).then((r) => r.data.data),
    enabled: !!id
  });
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: () => categoryApi.list().then((r) => r.data.data) });
}

export function useVendors() {
  return useQuery({ queryKey: ['vendors'], queryFn: () => vendorApi.list().then((r) => r.data.data) });
}

export function usePurchases(params) {
  return useQuery({ queryKey: ['purchases', params], queryFn: () => purchaseApi.list(params).then((r) => r.data) });
}

export function useInventoryActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['inventory-items'] });

  const issue = useMutation({ mutationFn: (data) => inventoryApi.issue(data), onSuccess: invalidate });
  const returnItem = useMutation({ mutationFn: (data) => inventoryApi.return(data), onSuccess: invalidate });
  const scrap = useMutation({ mutationFn: ({ id, notes }) => inventoryApi.scrap(id, { notes }), onSuccess: invalidate });
  const transfer = useMutation({ mutationFn: ({ id, toUserId, notes }) => inventoryApi.transfer(id, { toUserId, notes }), onSuccess: invalidate });
  const updateStatus = useMutation({ mutationFn: ({ id, status, notes }) => inventoryApi.updateStatus(id, { status, notes }), onSuccess: invalidate });
  const updateDetails = useMutation({ mutationFn: ({ id, data }) => inventoryApi.update(id, data), onSuccess: invalidate });

  return { issue, returnItem, scrap, transfer, updateStatus, updateDetails };
}
