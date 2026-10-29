import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getPatientId } from '../global/helpers';

const patientKey = patient => String(getPatientId(patient)).trim().toLowerCase();

export default function usePatientPagination({ patientsData, setPatientsData, fetchPatientsPaginated, isGlobalLoading, viewStateRef, onQueryChange }) {
  const [saved] = useState(() => viewStateRef?.current || {});
  const [search, setSearch] = useState(saved.search || '');
  const [sortConfig, setSortConfig] = useState(saved.sortConfig || { key: 'id', direction: 'desc' });
  const [ids, setIds] = useState(() => saved.ids || patientsData.map(patientKey));
  const [hasMore, setHasMore] = useState(saved.hasMore ?? !!fetchPatientsPaginated);
  const [totalCount, setTotalCount] = useState(saved.totalCount ?? null);
  const [isServerSearching, setIsServerSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pageError, setPageError] = useState(false);
  const queryKey = JSON.stringify([search.trim(), sortConfig.key, sortConfig.direction]);
  const activeQuery = useRef(saved.queryKey || queryKey);
  const offset = useRef(saved.offset || 0);
  const initialized = useRef(!!saved.initialized && saved.queryKey === queryKey);
  const generation = useRef(0);
  const request = useRef(null);
  const mounted = useRef(true);
  const firstQuery = useRef(queryKey);

  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current = null; };
  }, []);

  useLayoutEffect(() => {
    if (activeQuery.current === queryKey) return;
    activeQuery.current = queryKey;
    generation.current++;
    request.current = null;
    offset.current = 0;
    initialized.current = false;
    setIds([]);
    setHasMore(!!fetchPatientsPaginated);
    setTotalCount(null);
    setPageError(false);
    setIsLoadingMore(false);
    setIsServerSearching(!!fetchPatientsPaginated);
    if (viewStateRef?.current) viewStateRef.current.virtualList = null;
    onQueryChange?.();
  }, [queryKey, fetchPatientsPaginated, onQueryChange, viewStateRef]);

  useLayoutEffect(() => {
    if (!viewStateRef) return;
    viewStateRef.current = { ...viewStateRef.current, search, sortConfig, ids, hasMore, totalCount,
      offset: offset.current, initialized: initialized.current, queryKey };
  }, [viewStateRef, search, sortConfig, ids, hasMore, totalCount, queryKey, isServerSearching, isLoadingMore]);

  const loadPage = useCallback(async ({ replace = false } = {}) => {
    if (!fetchPatientsPaginated || isGlobalLoading || request.current) return;
    const token = { generation: generation.current };
    const start = replace ? 0 : offset.current;
    request.current = token;
    setPageError(false);
    if (replace) setIsServerSearching(true);
    else setIsLoadingMore(true);
    try {
      const response = await fetchPatientsPaginated({ offset: start, limit: 35, search: search.trim(),
        sortKey: sortConfig.key, sortDir: sortConfig.direction });
      if (!mounted.current || request.current !== token || generation.current !== token.generation) return;
      if (response?.status !== 'success' || !Array.isArray(response.patients)) throw new Error('Patient page unavailable');
      const page = response.patients;
      // Shared patient records remain canonical; a query owns only its IDs and server cursor.
      const applyPage = () => {
        const incoming = new Map(page.map(patient => [patientKey(patient), patient]));
        setPatientsData(previous => {
          const updated = previous.map(patient => incoming.get(patientKey(patient)) || patient);
          const known = new Set(previous.map(patientKey));
          return [...updated, ...page.filter(patient => !known.has(patientKey(patient)))];
        });
        setIds(previous => [...new Set([...(replace ? [] : previous), ...page.map(patientKey)])]);
      };
      if (response.source === 'cache') {
        if (replace) applyPage();
        // A partial offline cache cannot establish the end of the server's list.
        throw new Error('Patient page is offline');
      }
      if (!replace && response.hasMore && page.length === 0) throw new Error('Empty patient page');
      applyPage();
      offset.current = start + page.length;
      initialized.current = true;
      setHasMore(response.hasMore ?? page.length === 35);
      if (response.totalCount !== undefined) setTotalCount(response.totalCount);
    } catch {
      if (mounted.current && request.current === token) {
        setPageError(true);
        setHasMore(true);
      }
    } finally {
      if (mounted.current && request.current === token) {
        request.current = null;
        setIsServerSearching(false);
        setIsLoadingMore(false);
      }
    }
  }, [fetchPatientsPaginated, isGlobalLoading, search, sortConfig.key, sortConfig.direction, setPatientsData]);

  useEffect(() => {
    if (isGlobalLoading || !fetchPatientsPaginated || initialized.current) return;
    const timer = setTimeout(() => loadPage({ replace: true }), firstQuery.current === queryKey ? 0 : 350);
    return () => clearTimeout(timer);
  }, [queryKey, isGlobalLoading, fetchPatientsPaginated, loadPage]);

  const loadMore = useCallback(() => {
    if (hasMore && !pageError && !isServerSearching && !isLoadingMore) loadPage({ replace: !initialized.current });
  }, [hasMore, pageError, isServerSearching, isLoadingMore, loadPage]);
  const retry = useCallback(() => loadPage({ replace: !initialized.current }), [loadPage]);
  const includePatient = useCallback(patient => setIds(previous => [...new Set([patientKey(patient), ...previous])]), []);
  const listedPatients = useMemo(() => {
    const keys = new Set(ids);
    return patientsData.filter(patient => keys.has(patientKey(patient)));
  }, [ids, patientsData]);
  return { search, setSearch, sortConfig, setSortConfig, listedPatients, hasMore, totalCount,
    isServerSearching, isLoadingMore, pageError, loadMore, retry, includePatient, queryKey };
}
