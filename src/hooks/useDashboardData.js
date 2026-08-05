import { useState, useEffect, useCallback } from "react";

export const useDashboardData = (fetchFn) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFn();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load dashboard metrics");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { orders, loading, error, refresh: loadData };
};
