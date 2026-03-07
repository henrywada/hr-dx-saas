import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'

export default function Home() {
  redirect(APP_ROUTES.AUTH.LOGIN)
}
