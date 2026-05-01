'use client'

import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from '@react-oauth/google'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'

export default function SignInPage() {
  const router = useRouter()

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    const { credential } = credentialResponse
    if (!credential) return
    const decoded = jwtDecode(credential)
    
    try {
      // Send token to backend for verification and session creation
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credential }),
      })

      if (res.ok) {
        router.push('/dashboard')
        router.refresh()
      } else {
        console.error('Auth failed')
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleGoogleError = () => {
    console.error('Google Login Failed')
  }

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <div className="h-screen flex w-full justify-center">
        <div className="w-[600px] lg:w-full flex flex-col items-start p-6">
          <Image
            src="/images/logo.png"
            alt="LOGO"
            sizes="100vw"
            style={{ width: '20%', height: 'auto' }}
            width={0}
            height={0}
          />
          <div className="flex-1 flex flex-col justify-center items-center w-full">
            <h1 className="text-3xl font-bold mb-8">Welcome</h1>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap={false}
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
              width="300"
            />
          </div>
          <div className="hidden lg:flex flex-1 w-full max-h-full max-w-4000px overflow-hidden relative bg-cream flex-col pt-10 pl-24 gap-3">
            <h2 className="text-gravel md:text-4xl font-bold">
              Hi, I&apos;m your AI powered sales assistant, Corinna!
            </h2>
            <p className="text-iridium md:text-sm mb-10">
              Corinna is capable of capturing lead information without a form...
              <br />
              something never done before 😉
            </p>
            <Image
              src="/images/app-ui.png"
              alt="app image"
              loading="lazy"
              sizes="30"
              className="absolute shrink-0 !w-[1600px] top-48"
              width={0}
              height={0}
            />
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  )
}