import assert from 'node:assert/strict'
import test from 'node:test'

import { matchesRegion, passesRuleFilter } from '@/features/grant-notifier/batch/match/rule-filter'
import type { CandidateGrant, TenantCondition } from '@/features/grant-notifier/types'

function grant(overrides: Partial<CandidateGrant> = {}): CandidateGrant {
  return {
    id: 'g-1',
    title: '助成金',
    issuer: '国',
    targetArea: '全国',
    summary: null,
    detailText: '本文',
    maxAmount: null,
    industry: null,
    targetEmployees: null,
    acceptanceEndAt: null,
    externalUrl: 'https://example.com',
    ...overrides,
  }
}

function condition(overrides: Partial<TenantCondition> = {}): TenantCondition {
  return {
    tenantId: 't-1',
    industries: [],
    employeeCount: null,
    capital: null,
    prefectures: [],
    categories: [],
    keywords: null,
    notifyEmails: [],
    deliveryFrequency: 'weekly',
    ...overrides,
  }
}

test('都道府県の指定が無ければ地域に関わらず通す', () => {
  assert.equal(matchesRegion(grant({ targetArea: '東京都' }), condition()), true)
})

test('全国対象の助成金はテナントの都道府県に関わらず通す', () => {
  assert.equal(
    matchesRegion(grant({ targetArea: '全国' }), condition({ prefectures: ['長野県'] })),
    true
  )
})

test('対象地域にテナントの都道府県名が含まれれば通す', () => {
  assert.equal(
    matchesRegion(grant({ targetArea: '長野県茅野市' }), condition({ prefectures: ['長野県'] })),
    true
  )
})

test('対象地域が別の都道府県なら除外する', () => {
  assert.equal(
    matchesRegion(grant({ targetArea: '大阪府' }), condition({ prefectures: ['長野県'] })),
    false
  )
})

test('都道府県指定があるとき対象地域が不明（null）なら除外する', () => {
  assert.equal(
    matchesRegion(grant({ targetArea: null }), condition({ prefectures: ['長野県'] })),
    false
  )
})

test('passesRuleFilter は地域ルールに委譲する', () => {
  assert.equal(
    passesRuleFilter(grant({ targetArea: '大阪府' }), condition({ prefectures: ['長野県'] })),
    false
  )
  assert.equal(
    passesRuleFilter(grant({ targetArea: '全国' }), condition({ prefectures: ['長野県'] })),
    true
  )
})
