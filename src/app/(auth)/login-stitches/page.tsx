'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Card, Flex, Text, Label, Box } from '@/components/ui/stitches'
import { styled } from '@/lib/stitches.config'

// Styled components for login page
const LoginContainer = styled('div', {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$gray50',
  padding: '$4',
})

const LoginCard = styled(Card, {
  width: '100%',
  maxWidth: '28rem',
})

const Title = styled('h2', {
  fontSize: '$3xl',
  fontWeight: '$bold',
  color: '$gray900',
  textAlign: 'center',
  mb: '$8',
})

const ErrorMessage = styled('div', {
  backgroundColor: '#fee2e2',
  color: '#991b1b',
  padding: '$3',
  borderRadius: '$md',
  fontSize: '$sm',
  mb: '$4',
})

const FormGroup = styled('div', {
  mb: '$4',
})

export default function StitchesLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <LoginContainer>
      <LoginCard padding="lg">
        <Title>ログイン</Title>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <form onSubmit={handleLogin}>
          <FormGroup>
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              error={!!error}
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              error={!!error}
            />
          </FormGroup>

          <Flex direction="column" gap="3" css={{ mt: '$6' }}>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={loading}
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="md"
              fullWidth
              onClick={() => router.push('/signup')}
            >
              アカウントを作成
            </Button>
          </Flex>
        </form>

        <Box css={{ mt: '$6', textAlign: 'center' }}>
          <Text size="sm" color="secondary">
            パスワードをお忘れですか？
          </Text>
        </Box>
      </LoginCard>
    </LoginContainer>
  )
}
