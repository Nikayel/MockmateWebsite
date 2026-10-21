import type { AnchorHTMLAttributes } from "react"
export default function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props}>{props.children}</a>
}
export function useSearchParams() {
  return new URLSearchParams(window.location.search)
}
export function usePathname() {
  return window.location.pathname
}
export function useRouter() {
  return {
    push: (path: string) => {
      window.location.href = path
    },
    replace: (path: string) => {
      window.location.replace(path)
    },
  }
}
