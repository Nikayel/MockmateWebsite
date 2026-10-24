/** Test-only URL reader for the real picker, outside Next's App Router. */
export function useSearchParams() {
  return new URLSearchParams(window.location.search)
}

export function useRouter() {
  return {
    push: (url: string) => {
      window.location.href = url
    },
  }
}
