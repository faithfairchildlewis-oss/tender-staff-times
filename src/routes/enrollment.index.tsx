import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/enrollment/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/enrollment/"!</div>
}
