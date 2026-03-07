'use client'

import { Button, Card, Flex, Text, Box } from '@/components/ui/stitches'
import { styled } from '@/lib/stitches.config'

// Styled components
const DashboardContainer = styled('div', {
  minHeight: '100vh',
  backgroundColor: '$gray50',
  padding: '$6',

  '@md': {
    padding: '$8',
  },
})

const Header = styled('div', {
  mb: '$8',
})

const Title = styled('h1', {
  fontSize: '$3xl',
  fontWeight: '$bold',
  color: '$gray900',
  mb: '$2',

  '@md': {
    fontSize: '$4xl',
  },
})

const Subtitle = styled('p', {
  fontSize: '$base',
  color: '$gray600',
})

const Grid = styled('div', {
  display: 'grid',
  gap: '$6',
  gridTemplateColumns: '1fr',

  '@sm': {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },

  '@lg': {
    gridTemplateColumns: 'repeat(3, 1fr)',
  },
})

const StatCard = styled(Card, {
  transition: 'all 0.2s ease',

  '&:hover': {
    boxShadow: '$md',
    transform: 'translateY(-2px)',
  },
})

const StatValue = styled('div', {
  fontSize: '$4xl',
  fontWeight: '$bold',
  color: '$gray900',
  mb: '$2',
})

const StatLabel = styled('div', {
  fontSize: '$sm',
  color: '$gray600',
  mb: '$4',
})

const StatChange = styled('div', {
  fontSize: '$sm',
  fontWeight: '$medium',

  variants: {
    trend: {
      up: {
        color: '$success',
      },
      down: {
        color: '$error',
      },
      neutral: {
        color: '$gray600',
      },
    },
  },
})

const ActionCard = styled(Card, {
  backgroundColor: '$primary50',
  border: '1px solid $primary200',
})

interface StatCardProps {
  label: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
}

function DashboardStatCard({ label, value, change, trend = 'neutral' }: StatCardProps) {
  return (
    <StatCard padding="md">
      <StatValue>{value}</StatValue>
      <StatLabel>{label}</StatLabel>
      {change && <StatChange trend={trend}>{change}</StatChange>}
    </StatCard>
  )
}

export default function StitchesDashboard() {
  return (
    <DashboardContainer>
      <Header>
        <Title>ダッシュボード</Title>
        <Subtitle>HR-DX SaaS システムの概要</Subtitle>
      </Header>

      <Grid>
        <DashboardStatCard
          label="総従業員数"
          value="1,234"
          change="↑ 12% 前月比"
          trend="up"
        />
        <DashboardStatCard
          label="アクティブユーザー"
          value="987"
          change="↑ 8% 前月比"
          trend="up"
        />
        <DashboardStatCard
          label="今月の給与支払い"
          value="¥45,678,900"
          change="→ 前月と同じ"
          trend="neutral"
        />
      </Grid>

      <Box css={{ mt: '$8' }}>
        <Grid>
          <ActionCard padding="md">
            <Flex direction="column" gap="4">
              <Box>
                <Text size="lg" weight="semibold" css={{ color: '$primary700' }}>
                  給与計算
                </Text>
                <Text size="sm" css={{ color: '$gray600', mt: '$2' }}>
                  今月の給与計算を開始します
                </Text>
              </Box>
              <Button variant="primary" size="md">
                給与計算を開始
              </Button>
            </Flex>
          </ActionCard>

          <Card padding="md">
            <Flex direction="column" gap="4">
              <Box>
                <Text size="lg" weight="semibold">
                  勤怠管理
                </Text>
                <Text size="sm" css={{ color: '$gray600', mt: '$2' }}>
                  従業員の勤怠状況を確認
                </Text>
              </Box>
              <Button variant="outline" size="md">
                勤怠を確認
              </Button>
            </Flex>
          </Card>

          <Card padding="md">
            <Flex direction="column" gap="4">
              <Box>
                <Text size="lg" weight="semibold">
                  レポート
                </Text>
                <Text size="sm" css={{ color: '$gray600', mt: '$2' }}>
                  月次レポートを生成
                </Text>
              </Box>
              <Button variant="secondary" size="md">
                レポート作成
              </Button>
            </Flex>
          </Card>
        </Grid>
      </Box>

      <Box css={{ mt: '$8' }}>
        <Card padding="lg">
          <Text size="xl" weight="semibold" css={{ mb: '$4' }}>
            最近のアクティビティ
          </Text>
          <Flex direction="column" gap="3">
            {[
              { user: '山田太郎', action: '給与明細を確認しました', time: '5分前' },
              { user: '佐藤花子', action: '勤怠を登録しました', time: '15分前' },
              { user: '鈴木一郎', action: 'プロフィールを更新しました', time: '1時間前' },
            ].map((activity, index) => (
              <Flex
                key={index}
                justify="between"
                align="center"
                css={{
                  padding: '$3',
                  borderRadius: '$md',
                  backgroundColor: '$gray50',
                }}
              >
                <Box>
                  <Text weight="medium">{activity.user}</Text>
                  <Text size="sm" css={{ color: '$gray600' }}>
                    {activity.action}
                  </Text>
                </Box>
                <Text size="sm" css={{ color: '$gray500' }}>
                  {activity.time}
                </Text>
              </Flex>
            ))}
          </Flex>
        </Card>
      </Box>
    </DashboardContainer>
  )
}
