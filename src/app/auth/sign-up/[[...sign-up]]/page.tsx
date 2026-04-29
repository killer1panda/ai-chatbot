import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

const SignUpPage = () => {
  redirect('/auth/sign-in')
}

export default SignUpPage
