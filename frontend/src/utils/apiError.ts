import { isAxiosError } from "axios";

// The backend always responds with a { success, data, message } envelope, so
// on an API error the message lives at error.response.data.message. Anything
// that isn't an axios error (network failure, thrown string, etc.) gets a
// generic fallback so we never surface a raw exception to the user.
export function getApiErrorMessage(err: unknown): string {
  const fallback = "Something went wrong. Please try again.";
  if (!isAxiosError(err)) {
    return fallback;
  }
  const data = err.response?.data as { message?: string } | undefined;
  return data?.message ?? fallback;
}