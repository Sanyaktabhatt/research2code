"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login, signup, type LoginPayload, type SignupPayload } from "@/lib/api/endpoints/auth";
import { setTokens, clearTokens } from "@/lib/auth/tokens";
import { queryKeys } from "@/lib/query/keys";

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

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return () => {
    clearTokens();
    queryClient.clear();
    router.push("/login");
  };
}
