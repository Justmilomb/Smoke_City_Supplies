import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API = "/api";

export type AuthUser = { id: string; username: string } | null;

async function fetchMe(): Promise<{ user: AuthUser }> {
  const res = await fetch(`${API}/auth/me`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch auth");
  return res.json();
}

async function login(username: string, password: string): Promise<{ user: AuthUser }> {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Login failed");
  }
  return res.json();
}

async function logout(): Promise<void> {
  const res = await fetch(`${API}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Logout failed");
}

export const authKeys = { me: ["auth", "me"] as const };

export function useAuth(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: authKeys.me,
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled,
  });
  const user = data?.user ?? null;

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      login(username, password),
    onSuccess: (data) => queryClient.setQueryData(authKeys.me, { user: data.user }),
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => queryClient.setQueryData(authKeys.me, { user: null }),
  });

  return {
    user,
    isLoading,
    login: (username: string, password: string) =>
      loginMutation.mutateAsync({ username, password }),
    logout: () => logoutMutation.mutateAsync(),
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}
