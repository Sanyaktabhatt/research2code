"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getOAuthProviders,
  login,
  signup,
  updateCurrentUser,
  type LoginPayload,
  type SignupPayload,
  type UpdateProfilePayload,
} from "@/lib/api/endpoints/auth";
import { setTokens, clearTokens } from "@/lib/auth/tokens";
import { queryKeys } from "@/lib/query/keys";

export function useOAuthProviders() {
  return useQuery({
    queryKey: queryKeys.auth.oauthProviders(),
    queryFn: getOAuthProviders,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: async (tokens) => {
      setTokens({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      router.push("/dashboard");
    },
  });
}

export function useSignup() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SignupPayload) => signup(payload),
    onSuccess: async (tokens) => {
      setTokens({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      router.push("/dashboard");
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateCurrentUser(payload),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.me(), user);
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return () => {
    clearTokens();
    queryClient.clear();
    router.push("/login");
  };
}
